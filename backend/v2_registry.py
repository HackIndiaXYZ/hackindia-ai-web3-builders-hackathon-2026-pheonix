"""V2 operational workflow projection for the land registry demo.

This is deliberately an in-memory repository so the existing hackathon app
keeps running without infrastructure.  Its public shapes mirror the eventual
PostgreSQL entities: ownership, nominees, transfer workflow, audit events and
an outbox.  The blockchain remains responsible only for finalized events.
"""

from copy import deepcopy
from datetime import datetime, timezone, timedelta
from uuid import uuid4
from wallet_signing import wallet_link_typed_data, transfer_approval_typed_data, recover

#: Canonical forward order of the transfer workflow. This is the contract the
#: PostgreSQL `transfers.status` column and the outbox worker both follow.
#: It previously listed "MST_CONFIRMED", which no code path ever sets — the
#: state between submission and completion is MST_PENDING_CONFIRMATION.
TRANSITION_ORDER = (
    "DRAFT", "DOCUMENT_VERIFICATION", "RISK_ASSESSMENT", "OWNER_APPROVAL",
    "REGISTRAR_REVIEW", "BUYER_ACCEPTANCE", "READY_TO_COMMIT", "MST_SUBMITTED",
    "MST_PENDING_CONFIRMATION", "COMPLETED",
)
TERMINAL = {"REJECTED", "EXPIRED", "CANCELLED", "DISPUTED", "FROZEN", "MST_FAILED", "COMPLETED"}

#: Every state a transfer may legally hold, for schema and worker validation.
ALL_STATES = frozenset(TRANSITION_ORDER) | TERMINAL


class V2Registry:
    def __init__(self):
        self.transfers = {}
        self.audit_events = []
        self.outbox = []
        self.wallets = {}
        self.challenges = {}
        self.notifications = []
        self.succession_cases = {}
        self.recovery_cases = {}

    @staticmethod
    def enrich_parcel(parcel):
        """Makes legacy single-owner data readable through the V2 model."""
        parcel = deepcopy(parcel)
        parcel.setdefault("ownership_type", "SOLE" if not parcel.get("owners") else "JOINT")
        parcel.setdefault("owners", [{
            "name": parcel["current_owner"], "share_percent": 100,
            "wallet_address": None, "credential_status": "ACTIVE",
        }])
        parcel.setdefault("ownership_policy", {"required_approvals": len(parcel["owners"]), "total_owners": len(parcel["owners"])})
        parcel.setdefault("nominees", [])
        parcel.setdefault("encumbrances", [])
        parcel.setdefault("disputes", [])
        parcel.setdefault("frozen", False)
        return parcel

    def audit(self, actor, action, parcel_id=None, transfer_id=None, result="SUCCESS", detail=None):
        event = {"event_id": f"AUD-{uuid4().hex[:10].upper()}", "actor": actor,
                 "action": action, "parcel_id": parcel_id, "transfer_id": transfer_id,
                 "result": result, "detail": detail or {}, "timestamp": self._now()}
        self.audit_events.append(event)
        return event

    def create_transfer(self, parcel, buyer, document_hash, assessment_hash, actor):
        if parcel.get("frozen"):
            raise ValueError("parcel is frozen; no transfer can be created")
        transfer_id = f"TR-{datetime.now(timezone.utc).year}-{uuid4().hex[:6].upper()}"
        transfer = {
            "transfer_id": transfer_id, "parcel_id": parcel["ulpin"], "buyer": buyer,
            "sellers": [o["name"] for o in parcel["owners"]], "document_hash": document_hash,
            "assessment_hash": assessment_hash, "status": "OWNER_APPROVAL",
            "required_approvals": parcel["ownership_policy"]["required_approvals"],
            "approvals": [], "registrar_approval": None, "buyer_accepted": False,
            "created_at": self._now(), "expires_at": (datetime.now(timezone.utc) + timedelta(hours=24)).isoformat(),
        }
        self.transfers[transfer_id] = transfer
        for owner in transfer["sellers"]:
            self.notify(owner, "TRANSFER_APPROVAL_REQUIRED", parcel["ulpin"], transfer_id,
                        "A transfer requires your authorization.")
        self.audit(actor, "TRANSFER_CREATED", parcel["ulpin"], transfer_id)
        return transfer

    def approve(self, transfer_id, actor, actor_role):
        transfer = self.transfers.get(transfer_id)
        if not transfer:
            raise KeyError("transfer not found")
        if transfer["status"] in TERMINAL:
            raise ValueError(f"transfer is {transfer['status'].lower()}")
        if datetime.now(timezone.utc) > datetime.fromisoformat(transfer["expires_at"]):
            transfer["status"] = "EXPIRED"
            raise ValueError("transfer has expired")
        if actor_role == "OWNER":
            if actor not in transfer["sellers"]:
                raise PermissionError("only an active owner of this parcel can approve")
            if actor not in [a["actor"] for a in transfer["approvals"]]:
                transfer["approvals"].append({"actor": actor, "role": "OWNER", "timestamp": self._now()})
            if len(transfer["approvals"]) >= transfer["required_approvals"]:
                transfer["status"] = "REGISTRAR_REVIEW"
        elif actor_role == "REGISTRAR":
            if len(transfer["approvals"]) < transfer["required_approvals"]:
                raise ValueError("required owner approvals are incomplete")
            transfer["registrar_approval"] = {"actor": actor, "timestamp": self._now()}
            transfer["status"] = "BUYER_ACCEPTANCE"
        elif actor_role == "BUYER":
            if actor != transfer["buyer"]:
                raise PermissionError("only the named buyer can accept")
            if not transfer["registrar_approval"]:
                raise ValueError("registrar approval is required first")
            transfer["buyer_accepted"] = True
            transfer["status"] = "READY_TO_COMMIT"
            self.outbox.append({"outbox_id": f"OBX-{uuid4().hex[:10].upper()}",
                                "event_type": "TRANSFER_READY_TO_COMMIT", "transfer_id": transfer_id,
                                "status": "PENDING", "created_at": self._now()})
        else:
            raise PermissionError("this role cannot approve a transfer")
        self.audit(actor, "TRANSFER_APPROVED", transfer["parcel_id"], transfer_id, detail={"role": actor_role})
        return transfer

    def create_challenge(self, user, parcel_id, wallet_address):
        issued_at = self._now()
        challenge = {"challenge_id": f"CHL-{uuid4().hex[:12].upper()}", "user": user,
                     "parcel_id": parcel_id, "wallet_address": wallet_address,
                     "nonce": uuid4().hex, "purpose": "LAND_REGISTRY_WALLET_LINK", "used": False,
                     "issued_at": issued_at,
                     "expires_at": (datetime.now(timezone.utc) + timedelta(minutes=10)).isoformat()}
        challenge["typed_data"] = wallet_link_typed_data(challenge)
        self.challenges[challenge["challenge_id"]] = challenge
        return challenge

    def link_wallet(self, challenge_id, signature):
        challenge = self.challenges.get(challenge_id)
        if not challenge:
            raise KeyError("challenge not found")
        if challenge["used"] or datetime.now(timezone.utc) > datetime.fromisoformat(challenge["expires_at"]):
            raise ValueError("challenge is expired or already consumed")
        signer = recover(challenge["typed_data"], signature)
        if signer.lower() != challenge["wallet_address"].lower():
            raise PermissionError("wallet proof did not verify")
        challenge["used"] = True
        wallet = {"user": challenge["user"], "wallet_address": challenge["wallet_address"],
                  "credential_id": f"CRD-{uuid4().hex[:12].upper()}", "key_status": "ACTIVE",
                  "registered_at": self._now(), "activated_at": self._now(), "revoked_at": None}
        self.wallets[challenge["user"].lower()] = wallet
        self.audit(challenge["user"], "WALLET_LINKED", challenge["parcel_id"])
        return wallet

    def create_transfer_approval_challenge(self, transfer_id, user):
        transfer = self.transfers.get(transfer_id)
        wallet = self.wallets.get(user.lower())
        if not transfer:
            raise KeyError("transfer not found")
        if transfer["status"] != "OWNER_APPROVAL" or user not in transfer["sellers"]:
            raise PermissionError("this owner cannot approve the transfer at its current state")
        if not wallet or wallet["key_status"] != "ACTIVE":
            raise PermissionError("an active wallet credential is required")
        challenge = {"challenge_id": f"APR-{uuid4().hex[:12].upper()}", "transfer_id": transfer_id,
                     "parcel_id": transfer["parcel_id"], "user": user, "wallet_address": wallet["wallet_address"],
                     "buyer": transfer["buyer"], "document_hash": transfer["document_hash"],
                     "assessment_hash": transfer["assessment_hash"], "nonce": uuid4().hex,
                     "purpose": "LAND_REGISTRY_TRANSFER_APPROVAL", "used": False,
                     "expires_at": (datetime.now(timezone.utc) + timedelta(minutes=10)).isoformat()}
        challenge["typed_data"] = transfer_approval_typed_data(challenge)
        self.challenges[challenge["challenge_id"]] = challenge
        return challenge

    def approve_with_signature(self, challenge_id, signature):
        challenge = self.challenges.get(challenge_id)
        if not challenge:
            raise KeyError("challenge not found")
        if challenge["purpose"] != "LAND_REGISTRY_TRANSFER_APPROVAL" or challenge["used"]:
            raise ValueError("approval challenge has already been consumed or is invalid")
        if datetime.now(timezone.utc) > datetime.fromisoformat(challenge["expires_at"]):
            raise ValueError("approval challenge has expired")
        if recover(challenge["typed_data"], signature).lower() != challenge["wallet_address"].lower():
            raise PermissionError("transfer signature did not verify")
        challenge["used"] = True
        return self.approve(challenge["transfer_id"], challenge["user"], "OWNER")

    def notify(self, recipient, event_type, parcel_id, transfer_id=None, message=""):
        item = {"notification_id": f"NTF-{uuid4().hex[:10].upper()}", "recipient": recipient,
                "event_type": event_type, "parcel_id": parcel_id, "transfer_id": transfer_id,
                "message": message, "read": False, "created_at": self._now()}
        self.notifications.append(item)
        return item

    def request_recovery(self, user, parcel_id, actor):
        old = self.wallets.get(user.lower())
        if not old:
            raise ValueError("no wallet credential exists for this user")
        case = {"recovery_id": f"REC-{uuid4().hex[:10].upper()}", "user": user, "parcel_id": parcel_id,
                "old_credential_id": old["credential_id"], "status": "IDENTITY_VERIFICATION",
                "created_at": self._now()}
        self.recovery_cases[case["recovery_id"]] = case
        self.audit(actor, "CREDENTIAL_RECOVERY_REQUESTED", parcel_id, detail={"recovery_id": case["recovery_id"]})
        return case

    def approve_recovery(self, recovery_id, actor, new_wallet):
        case = self.recovery_cases.get(recovery_id)
        if not case:
            raise KeyError("recovery case not found")
        if case["status"] != "IDENTITY_VERIFICATION":
            raise ValueError("recovery case is not awaiting identity verification")
        old = self.wallets.get(case["user"].lower())
        old.update({"key_status": "REVOKED", "revoked_at": self._now(), "revoked_reason": "KEY_RECOVERY"})
        case.update({"status": "NEW_WALLET_LINK_REQUIRED", "new_wallet_address": new_wallet, "approved_by": actor, "approved_at": self._now()})
        self.audit(actor, "CREDENTIAL_REVOKED", case["parcel_id"], detail={"credential_id": old["credential_id"], "reason": "KEY_RECOVERY"})
        return case

    def start_succession(self, parcel, nominee, actor):
        if nominee not in [n.get("name") for n in parcel.get("nominees", [])]:
            raise ValueError("successor must be a registered nominee")
        case_id = f"SUC-{uuid4().hex[:8].upper()}"
        case = {"case_id": case_id, "parcel_id": parcel["ulpin"], "nominee": nominee,
                "status": "EVIDENCE_REQUIRED", "evidence_reference": None, "created_at": self._now()}
        self.succession_cases[case_id] = case
        self.notify(nominee, "SUCCESSION_OPENED", parcel["ulpin"], message="A succession case requires verification.")
        self.audit(actor, "SUCCESSION_OPENED", parcel["ulpin"], detail={"case_id": case_id})
        return case

    def verify_succession(self, case_id, actor, evidence_reference):
        case = self.succession_cases.get(case_id)
        if not case:
            raise KeyError("succession case not found")
        if case["status"] != "EVIDENCE_REQUIRED":
            raise ValueError("succession case is not awaiting evidence")
        case.update({"status": "VERIFIED", "evidence_reference": evidence_reference,
                     "verified_by": actor, "verified_at": self._now()})
        self.audit(actor, "SUCCESSION_VERIFIED", case["parcel_id"], detail={"case_id": case_id})
        return case

    def activate_successor(self, case_id, parcel, actor):
        case = self.succession_cases.get(case_id)
        if not case or case["status"] != "VERIFIED":
            raise ValueError("verified succession case is required")
        nominee = case["nominee"]
        nominee_wallet = self.wallets.get(nominee.lower())
        if not nominee_wallet or nominee_wallet["key_status"] != "ACTIVE":
            raise ValueError("successor needs an active credential before activation")
        for owner in parcel.get("owners", []):
            owner["credential_status"] = "DECEASED"
        parcel["owners"] = [{"name": nominee, "share_percent": 100, "wallet_address": nominee_wallet["wallet_address"], "credential_status": "ACTIVE"}]
        parcel["current_owner"] = nominee; parcel["ownership_type"] = "SOLE"; parcel["ownership_policy"] = {"required_approvals": 1, "total_owners": 1}
        case.update({"status": "SUCCESSOR_ACTIVATED", "activated_at": self._now(), "activated_by": actor})
        self.audit(actor, "SUCCESSOR_ACTIVATED", parcel["ulpin"], detail={"case_id": case_id})
        return case

    def submit_for_commit(self, transfer_id, actor):
        transfer = self.transfers.get(transfer_id)
        if not transfer:
            raise KeyError("transfer not found")
        if transfer["status"] != "READY_TO_COMMIT":
            raise ValueError("transfer is not ready to commit")
        if transfer["document_hash"] == "PENDING" or transfer["assessment_hash"] == "PENDING":
            raise ValueError("verified document and assessment hashes are required")
        transfer["status"] = "MST_SUBMITTED"
        outbox = next((item for item in self.outbox if item["transfer_id"] == transfer_id and item["status"] == "PENDING"), None)
        if outbox:
            outbox.update({"status": "SUBMITTED", "submitted_at": self._now()})
        self.audit(actor, "MST_SUBMITTED", transfer["parcel_id"], transfer_id)
        return transfer, outbox

    def confirm_commit(self, transfer_id, tx_hash, actor):
        transfer = self.transfers.get(transfer_id)
        if not transfer or transfer["status"] != "MST_SUBMITTED":
            raise ValueError("transfer has not been submitted")
        transfer.update({"status": "MST_PENDING_CONFIRMATION", "blockchain_tx": tx_hash, "submitted_at": self._now()})
        outbox = next((item for item in self.outbox if item["transfer_id"] == transfer_id), None)
        if outbox:
            outbox.update({"status": "PENDING_CONFIRMATION", "tx_hash": tx_hash, "submitted_at": self._now()})
        return transfer

    def confirm_finality(self, transfer_id, actor):
        transfer = self.transfers.get(transfer_id)
        if not transfer or transfer["status"] != "MST_PENDING_CONFIRMATION":
            raise ValueError("transfer has no submitted transaction awaiting confirmation")
        # The tx hash was recorded by confirm_commit; read it back off the
        # transfer rather than expecting it as an argument. Referring to a bare
        # `tx_hash` here raised NameError, which process_v2_outbox_once caught
        # and turned into MST_FAILED — so no transfer could ever reach
        # COMPLETED, the worker being the only route to it.
        tx_hash = transfer.get("blockchain_tx")
        transfer.update({"status": "COMPLETED", "confirmed_at": self._now()})
        outbox = next((item for item in self.outbox if item["transfer_id"] == transfer_id), None)
        if outbox:
            outbox.update({"status": "CONFIRMED", "confirmed_at": self._now()})
        self.notify(transfer["buyer"], "TRANSFER_COMPLETED", transfer["parcel_id"], transfer_id,
                    "Your transfer has been finalized.")
        self.audit(actor, "MST_CONFIRMED", transfer["parcel_id"], transfer_id, detail={"tx_hash": tx_hash})
        return deepcopy(transfer)

    def fail_transfer(self, transfer_id, error):
        """Park a transfer and its outbox row as failed.

        The worker previously mutated the transfer and outbox dicts in place.
        Routing it through the repository keeps that write available to a
        PostgreSQL implementation, where there is nothing to mutate in memory.
        """
        transfer = self.transfers.get(transfer_id)
        if not transfer:
            raise KeyError("transfer not found")
        transfer["status"] = "MST_FAILED"
        outbox = next((item for item in self.outbox if item["transfer_id"] == transfer_id), None)
        if outbox:
            outbox.update({"status": "FAILED", "error": str(error)})
        self.audit("outbox-worker", "MST_FAILED", transfer["parcel_id"], transfer_id,
                   result="FAILURE", detail={"error": str(error)})
        return deepcopy(transfer)

    # ------------------------------------------------------------- queries --
    # app.py used to read `self.transfers`, `self.audit_events`, `self.outbox`
    # and friends as raw attributes. A PostgreSQL repository has no such
    # attributes to expose, so every read goes through a method here. These
    # return deep copies for the same reason: a row fetched from a database is
    # a copy, and code that mutated a returned dict expecting it to persist
    # would break silently on the switch.

    def get_transfer(self, transfer_id):
        transfer = self.transfers.get(transfer_id)
        return deepcopy(transfer) if transfer else None

    def list_transfers(self, statuses=None):
        return [deepcopy(t) for t in self.transfers.values()
                if statuses is None or t["status"] in statuses]

    def list_audit(self, newest_first=False):
        events = list(reversed(self.audit_events)) if newest_first else list(self.audit_events)
        return [deepcopy(e) for e in events]

    def list_outbox(self, status=None):
        return [deepcopy(item) for item in self.outbox
                if status is None or item["status"] == status]

    def next_outbox_item(self, status):
        """Oldest outbox row in `status`, or None.

        The PostgreSQL implementation claims the row with FOR UPDATE SKIP
        LOCKED so concurrent workers cannot take the same one; in memory there
        is only ever one worker, so insertion order is sufficient.
        """
        item = next((e for e in self.outbox if e["status"] == status), None)
        return deepcopy(item) if item else None

    def list_notifications(self, recipient=None, newest_first=False):
        items = list(reversed(self.notifications)) if newest_first else list(self.notifications)
        return [deepcopy(n) for n in items
                if recipient is None or n["recipient"].lower() == recipient.lower()]

    def get_succession_case(self, case_id):
        case = self.succession_cases.get(case_id)
        return deepcopy(case) if case else None

    def list_succession_cases(self, nominee=None, exclude_statuses=None):
        return [deepcopy(c) for c in self.succession_cases.values()
                if (nominee is None or c["nominee"].lower() == nominee.lower())
                and (exclude_statuses is None or c["status"] not in exclude_statuses)]

    def list_recovery_cases(self):
        return [deepcopy(c) for c in self.recovery_cases.values()]

    def get_challenge(self, challenge_id):
        challenge = self.challenges.get(challenge_id)
        return deepcopy(challenge) if challenge else None

    @staticmethod
    def _now():
        return datetime.now(timezone.utc).isoformat()
