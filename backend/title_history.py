"""Title timeline and ownership graph projections.

These services intentionally consume normalized event shapes rather than
Flask handlers. The in-memory adapter is for demo data; PostgreSQL queries can
replace it without changing API or UI consumers.
"""

from datetime import datetime


class TitleTimelineService:
    def build(self, parcel, chain_events, v2_transfers, audit_events):
        items = []
        for event in parcel.get("transfer_history", []):
            items.append({"source": "ARCHIVAL", "event_type": "TITLE_RECORD", "transfer_id": None,
                          "seller": event.get("from"), "buyer": event.get("to"), "share_percent": None,
                          "timestamp": event.get("date"), "document_hash": event.get("doc_hash"), "assessment_hash": None,
                          "registrar": None, "blockchain_tx": None})
        for transfer in v2_transfers:
            if transfer["parcel_id"] == parcel["ulpin"]:
                items.append({"source": "DIGITIZED", "event_type": transfer["status"], "transfer_id": transfer["transfer_id"],
                              "seller": ", ".join(transfer["sellers"]), "buyer": transfer["buyer"], "share_percent": 100,
                              "timestamp": transfer.get("confirmed_at") or transfer["created_at"], "document_hash": transfer["document_hash"],
                              "assessment_hash": transfer["assessment_hash"], "registrar": (transfer.get("registrar_approval") or {}).get("actor"),
                              "blockchain_tx": transfer.get("blockchain_tx")})
        for event in chain_events:
            items.append({"source": "BLOCKCHAIN_NATIVE", "event_type": event["event_type"], "transfer_id": None,
                          "seller": event.get("from"), "buyer": event.get("to"), "share_percent": None,
                          "timestamp": event.get("timestamp"), "document_hash": event.get("doc_hash"), "assessment_hash": None,
                          "registrar": None, "blockchain_tx": event.get("tx_hash")})
        # ISO dates and YYYY-MM-DD both sort chronologically as strings.
        return sorted(items, key=lambda item: item.get("timestamp") or "", reverse=True)


class OwnershipGraphService:
    def build(self, parcel, timeline):
        nodes, edges = {}, []
        for event in reversed(timeline):
            seller, buyer = event.get("seller"), event.get("buyer")
            if seller:
                nodes.setdefault(seller, {"id": seller, "label": seller, "kind": "HISTORICAL_OWNER"})
            if buyer:
                nodes.setdefault(buyer, {"id": buyer, "label": buyer, "kind": "OWNER"})
            if seller and buyer:
                edges.append({"from": seller, "to": buyer, "event_type": event["event_type"], "timestamp": event["timestamp"], "share_percent": event.get("share_percent")})
        for owner in parcel.get("owners", []):
            nodes[owner["name"]] = {"id": owner["name"], "label": owner["name"], "kind": "CURRENT_OWNER", "share_percent": owner["share_percent"], "credential_status": owner.get("credential_status")}
        return {"parcel_id": parcel["ulpin"], "nodes": list(nodes.values()), "edges": edges}
