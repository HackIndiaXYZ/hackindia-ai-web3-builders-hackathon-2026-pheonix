import mockData from "../data/land-registry-ui-mock-data.json" with { type: "json" };
import {
  isNonceConsumed,
  consumeNonce,
  updateDemoTransfer,
  appendDemoAuditEvent,
} from "./store.js";

const TOKENS_HASH_STORE = "tl_sell_tokens_v1";
const HMAC_KEY_STORAGE = "tl_hmac_secret_v1";
const TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24 Hours

export const SELL_TOKEN_DISCLAIMER =
  "Synthetic demo credential generated client-side via Web Crypto HMAC-SHA256. Not a digital signature or legally binding document.";

// Helpers for base64url encoding / decoding
function bufferToBase64Url(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function base64UrlToBuffer(base64url) {
  let base64 = base64url.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4) {
    base64 += "=";
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

function base64UrlEncodeJson(obj) {
  const json = JSON.stringify(obj);
  const encoder = new TextEncoder();
  return bufferToBase64Url(encoder.encode(json));
}

function base64UrlDecodeJson(base64url) {
  try {
    const buffer = base64UrlToBuffer(base64url);
    const decoder = new TextDecoder();
    return JSON.parse(decoder.decode(buffer));
  } catch (e) {
    return null;
  }
}

// Persistent demo HMAC CryptoKey
let cachedCryptoKey = null;
async function getOrCreateHmacKey() {
  if (cachedCryptoKey) return cachedCryptoKey;

  let secretHex = null;
  try {
    secretHex = localStorage.getItem(HMAC_KEY_STORAGE);
  } catch (e) {}

  let rawBytes;
  if (!secretHex || secretHex.length !== 64) {
    const arr = new Uint8Array(32);
    crypto.getRandomValues(arr);
    secretHex = Array.from(arr)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    try {
      localStorage.setItem(HMAC_KEY_STORAGE, secretHex);
    } catch (e) {}
    rawBytes = arr;
  } else {
    rawBytes = new Uint8Array(
      secretHex.match(/.{1,2}/g).map((byte) => parseInt(byte, 16))
    );
  }

  cachedCryptoKey = await crypto.subtle.importKey(
    "raw",
    rawBytes,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
  return cachedCryptoKey;
}

// Hash token string with SHA-256 for local audit
export async function hashToken(tokenString) {
  const encoder = new TextEncoder();
  const data = encoder.encode(tokenString);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function getStoredSellTokens() {
  try {
    const raw = localStorage.getItem(TOKENS_HASH_STORE);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

export const getIssuedTokenHashes = getStoredSellTokens;

export function revokeStoredSellToken(keyId) {
  const tokens = getStoredSellTokens();
  const updated = tokens.map((t) =>
    t.key_id === keyId ? { ...t, revoked: true, status: "REVOKED" } : t
  );
  try {
    localStorage.setItem(TOKENS_HASH_STORE, JSON.stringify(updated));
  } catch (e) {}
  return updated;
}

export function checkTokenEligibility(parcel) {
  if (!parcel) return { eligible: false, reason: "No parcel record provided." };
  if (parcel.title_status === "FROZEN" || parcel.title_status === "DISPUTED") {
    return {
      eligible: false,
      reason: `Token generation prohibited: Parcel ${parcel.ulpin} is subject to a Judicial Court Freeze.`,
    };
  }
  if (parcel.title_status === "SUCCESSION_PENDING") {
    return {
      eligible: false,
      reason: "Token generation prohibited: Legal heir succession proceeding active.",
    };
  }
  if (parcel.title_status === "CREDENTIAL_RECOVERY") {
    return {
      eligible: false,
      reason: "Token generation prohibited: Parcel is under credential recovery cooling-off period.",
    };
  }
  return { eligible: true };
}

/**
 * Generates a standard TitleLock Sell Token:
 * TLK1.<base64url(payloadJSON)>.<base64url(HMAC-SHA256)>
 */
export async function generateStandardSellToken({
  ulpin,
  ownerUserId,
  buyerUserId,
  transferRequestId = null,
  scope = "FULL_CONVEYANCE",
  ttlHours = 24,
}) {
  const hmacKey = await getOrCreateHmacKey();
  const now = Date.now();
  const issuedAt = new Date(now).toISOString();
  const expiresAt = new Date(now + ttlHours * 3600 * 1000).toISOString();

  // Random key_id & single-use nonce
  const randomBytes = new Uint8Array(8);
  crypto.getRandomValues(randomBytes);
  const key_id = `SK-${now.toString(36).toUpperCase()}-${Array.from(randomBytes.slice(0, 3))
    .map((b) => b.toString(36).toUpperCase())
    .join("")
    .slice(0, 4)}`;

  const nonceBytes = new Uint8Array(16);
  crypto.getRandomValues(nonceBytes);
  const nonce = `NONCE-${Array.from(nonceBytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")}`;

  const claims = {
    v: 1,
    key_id,
    ulpin,
    owner_user_id: ownerUserId,
    buyer_user_id: buyerUserId,
    transfer_request_id: transferRequestId,
    issued_at: issuedAt,
    expires_at: expiresAt,
    nonce,
    scope: scope || "TITLE_TRANSFER_CONSENT",
  };

  const payloadBase64 = base64UrlEncodeJson(claims);
  const messageToSign = `TLK1.${payloadBase64}`;
  const encoder = new TextEncoder();
  const signatureBuffer = await crypto.subtle.sign(
    "HMAC",
    hmacKey,
    encoder.encode(messageToSign)
  );
  const signatureBase64 = bufferToBase64Url(signatureBuffer);

  const rawToken = `TLK1.${payloadBase64}.${signatureBase64}`;
  const tokenSha256 = await hashToken(rawToken);

  const tokenRecord = {
    key_id,
    token_string: rawToken,
    token: rawToken,
    ulpin,
    owner_user_id: ownerUserId,
    buyer_user_id: buyerUserId,
    transfer_request_id: transferRequestId,
    scope: scope || "FULL_CONVEYANCE",
    nonce,
    issued_at: issuedAt,
    expires_at: expiresAt,
    token_sha256: tokenSha256,
    revoked: false,
    status: "ACTIVE",
    claims,
  };

  const tokens = getStoredSellTokens();
  tokens.unshift(tokenRecord);
  try {
    localStorage.setItem(TOKENS_HASH_STORE, JSON.stringify(tokens));
  } catch (e) {}

  return tokenRecord;
}

export const generateSellToken = generateStandardSellToken;

/**
 * Validates a Sell Token against the 15 Section 5 criteria for a target transfer request.
 * Returns { valid: boolean, checklist: Array<{ label, status, code, details }>, claims: object|null }
 */
export async function verifyStandardSellToken(tokenString, transferRequest) {
  const checklist = [];
  let claims = null;
  let isFormatOk = false;
  let isSigOk = false;

  // 1. Format & Structure
  if (tokenString && typeof tokenString === "string") {
    const parts = tokenString.trim().split(".");
    if (parts.length === 3 && parts[0] === "TLK1") {
      claims = base64UrlDecodeJson(parts[1]);
      if (claims && typeof claims === "object") {
        isFormatOk = true;
      }
    }
  }

  checklist.push({
    label: "Token Format & Envelope",
    status: isFormatOk ? "PASS" : "FAIL",
    code: isFormatOk ? "FORMAT_VALID" : "INVALID_FORMAT",
    details: isFormatOk
      ? "TLK1 base64url envelope structure is valid"
      : "Malformed token string; expected TLK1.<payload>.<signature>",
  });

  // 2. Cryptographic HMAC Signature
  if (isFormatOk) {
    try {
      const parts = tokenString.trim().split(".");
      const hmacKey = await getOrCreateHmacKey();
      const messageToVerify = `TLK1.${parts[1]}`;
      const encoder = new TextEncoder();
      const signatureBuffer = base64UrlToBuffer(parts[2]);
      isSigOk = await crypto.subtle.verify(
        "HMAC",
        hmacKey,
        signatureBuffer,
        encoder.encode(messageToVerify)
      );
    } catch (e) {
      isSigOk = false;
    }
  }

  checklist.push({
    label: "Cryptographic HMAC-SHA256 Signature",
    status: isSigOk ? "PASS" : "FAIL",
    code: isSigOk ? "SIGNATURE_VALID" : "SIGNATURE_INVALID",
    details: isSigOk
      ? "Web Crypto HMAC-SHA256 signature verified against key"
      : "Cryptographic signature mismatch or verification failure",
  });

  // 3. Expiration Check (24-hour validity)
  const now = Date.now();
  const expiresMs = claims?.expires_at ? Date.parse(claims.expires_at) : 0;
  const notExpired = isFormatOk && expiresMs > now;
  checklist.push({
    label: "24-Hour Token Expiration Check",
    status: notExpired ? "PASS" : "FAIL",
    code: notExpired ? "NOT_EXPIRED" : "EXPIRED",
    details: notExpired
      ? `Valid until ${new Date(claims.expires_at).toLocaleString()}`
      : "Token has expired or missing expiration timestamp",
  });

  // 4. Single-Use Nonce Check
  const nonce = claims?.nonce;
  const nonceConsumed = nonce ? isNonceConsumed(nonce) : false;
  const noncePass = isFormatOk && nonce && !nonceConsumed;
  checklist.push({
    label: "Single-Use Cryptographic Nonce",
    status: noncePass ? "PASS" : "FAIL",
    code: noncePass ? "NOT_CONSUMED" : "ALREADY_CONSUMED",
    details: noncePass
      ? `Nonce (${nonce?.slice(0, 14)}...) unspent`
      : "Nonce already consumed in prior settlement or missing",
  });

  // 5. Cadastral ULPIN Match
  const ulpinMatch =
    isFormatOk &&
    (!transferRequest ||
      !claims?.ulpin ||
      claims.ulpin === transferRequest.ulpin);
  checklist.push({
    label: "Cadastral ULPIN Match",
    status: ulpinMatch ? "PASS" : "FAIL",
    code: ulpinMatch ? "ULPIN_MATCH" : "ULPIN_MISMATCH",
    details: ulpinMatch
      ? `Matches target parcel ULPIN (${claims?.ulpin || transferRequest?.ulpin})`
      : `Token ULPIN (${claims?.ulpin}) differs from petition (${transferRequest?.ulpin})`,
  });

  // 6. Owner is Registered Seller
  const ownerIsSeller =
    isFormatOk &&
    (!transferRequest ||
      (transferRequest.seller_user_ids || []).includes(claims?.owner_user_id));
  checklist.push({
    label: "Owner is Registered Seller",
    status: ownerIsSeller ? "PASS" : "FAIL",
    code: ownerIsSeller ? "OWNER_IS_SELLER" : "OWNER_NOT_SELLER",
    details: ownerIsSeller
      ? `Token issuer ${claims?.owner_user_id} is a registered seller on record`
      : `Token issuer ${claims?.owner_user_id} not listed in seller_user_ids`,
  });

  // 7. Nominated Buyer Match
  const buyerMatch =
    isFormatOk &&
    (!transferRequest ||
      !claims?.buyer_user_id ||
      claims.buyer_user_id === transferRequest.buyer_user_id);
  checklist.push({
    label: "Nominated Buyer Match",
    status: buyerMatch ? "PASS" : "FAIL",
    code: buyerMatch ? "BUYER_MATCH" : "BUYER_MISMATCH",
    details: buyerMatch
      ? `Designated buyer matches petitioner (${claims?.buyer_user_id || "Any"})`
      : `Token designated for ${claims?.buyer_user_id}, but transfer is for ${transferRequest?.buyer_user_id}`,
  });

  // 8. Transfer Request Binding
  const transferMatch =
    isFormatOk &&
    (!transferRequest ||
      !claims?.transfer_request_id ||
      claims.transfer_request_id === transferRequest.request_id);
  checklist.push({
    label: "Conveyance Petition Binding",
    status: transferMatch ? "PASS" : "FAIL",
    code: transferMatch ? "TRANSFER_MATCH" : "TRANSFER_MISMATCH",
    details: transferMatch
      ? `Bound to petition ${transferRequest?.request_id || claims?.transfer_request_id || "GENERAL"}`
      : `Token bound to ${claims?.transfer_request_id}, differing from current ${transferRequest?.request_id}`,
  });

  // 9. Multi-Owner Quorum Consensus (SCN-02: PRICE_NOT_AGREED rejection)
  const approvals = transferRequest?.authorization?.owner_approvals || [];
  const reqCount = transferRequest?.authorization?.required_owner_approvals || 1;
  const approvedCount = approvals.filter((a) => a.status === "APPROVED").length;
  const rejectionItem = approvals.find((a) => a.status === "REJECTED");
  const hasRejection = !!rejectionItem;
  const quorumPass = approvedCount >= reqCount && !hasRejection;
  checklist.push({
    label: "Multi-Owner Quorum Consensus",
    status: quorumPass ? "PASS" : "FAIL",
    code: quorumPass ? "OWNER_QUORUM_MET" : "OWNER_QUORUM_NOT_MET",
    details: hasRejection
      ? `Co-owner rejected conveyance (Reason: ${rejectionItem.rejection_reason || "PRICE_NOT_AGREED"})`
      : quorumPass
      ? `Consensus verified: ${approvedCount} of ${reqCount} owners approved`
      : `Quorum insufficient: ${approvedCount} of ${reqCount} approved`,
  });

  // 10. Buyer Conveyance Acceptance
  const buyerAccepted =
    transferRequest?.authorization?.buyer_status === "ACCEPTED" ||
    transferRequest?.status === "COMPLETED";
  checklist.push({
    label: "Buyer Conveyance Acceptance",
    status: buyerAccepted ? "PASS" : "WARN",
    code: buyerAccepted ? "BUYER_ACCEPTED" : "BUYER_NOT_ACCEPTED",
    details: buyerAccepted
      ? "Buyer formally accepted conveyancing terms and consideration"
      : "Buyer acceptance pending on portal",
  });

  // 11. Judicial / Parcel Freeze Order Check (SCN-10)
  const parcels = mockData.parcels || [];
  const parcel = parcels.find((p) => p.ulpin === transferRequest?.ulpin);
  const isFrozen =
    parcel?.title_status === "FROZEN" ||
    parcel?.title_status === "DISPUTED" ||
    transferRequest?.freeze?.reason ||
    transferRequest?.status === "FROZEN_NO_TRANSFER";
  checklist.push({
    label: "Cadastral Judicial Freeze Check",
    status: !isFrozen ? "PASS" : "FAIL",
    code: !isFrozen ? "PARCEL_NOT_FROZEN" : "PARCEL_FROZEN",
    details: !isFrozen
      ? "Parcel is free of judicial or administrative freeze orders"
      : `Parcel is frozen by court order: ${transferRequest?.freeze?.reason || parcel?.dispute?.court_order || "ACTIVE_INJUNCTION"}`,
  });

  // 12. Succession Dispute Blocker (SCN-04)
  const hasSuccessionBlock =
    parcel?.title_status === "SUCCESSION_PENDING" ||
    transferRequest?.ui_case === "SUCCESSION_PENDING";
  checklist.push({
    label: "Succession Dispute Blocker",
    status: !hasSuccessionBlock ? "PASS" : "FAIL",
    code: !hasSuccessionBlock ? "NO_SUCCESSION_BLOCK" : "SUCCESSION_BLOCKED",
    details: !hasSuccessionBlock
      ? "No unresolved succession or legal heir disputes on title"
      : "Transfer blocked: Deceased owner legal heir succession proceedings pending",
  });

  // 13. Automated Risk Gate (SCN-08)
  const isHighRisk =
    transferRequest?.risk?.status === "HIGH_RISK" ||
    transferRequest?.status === "HIGH_RISK_BLOCKED";
  const hasOverride = transferRequest?.override?.status === "OVERRIDDEN";
  const riskPass = !isHighRisk || hasOverride;
  checklist.push({
    label: "Automated Risk Gate & Override",
    status: riskPass ? "PASS" : "FAIL",
    code: riskPass
      ? hasOverride
        ? "HIGH_RISK_OVERRIDDEN"
        : "RISK_GATE_PASSED"
      : "HIGH_RISK_OVERRIDE_REQUIRED",
    details: hasOverride
      ? `High risk overridden with recorded justification: ${transferRequest?.override?.justification || "Audited"}`
      : !isHighRisk
      ? `Risk score (${transferRequest?.risk?.score || 12}/100) within tolerance`
      : "High risk detected (>75/100): Registrar administrative override required",
  });

  // 14. Sub-Registrar Adjudication Gate
  const regGateClosed =
    transferRequest?.authorization?.registrar_status === "LOCKED" ||
    transferRequest?.authorization?.registrar_status === "REJECTED";
  checklist.push({
    label: "Sub-Registrar Adjudication Gate",
    status: !regGateClosed ? "PASS" : "FAIL",
    code: !regGateClosed ? "REGISTRAR_GATE_OPEN" : "REGISTRAR_GATE_CLOSED",
    details: !regGateClosed
      ? "Adjudication desk unlocked for registrar review"
      : "Registrar gate is locked or petition was formally rejected",
  });

  // 15. Conveyance Petition Statutory Timeline (SCN-15)
  const requestExpired =
    transferRequest?.status === "EXPIRED" ||
    transferRequest?.ui_case === "EXPIRED_TRANSFER" ||
    (transferRequest?.expires_at && Date.parse(transferRequest.expires_at) < now);
  checklist.push({
    label: "Conveyance Statutory Timeline",
    status: !requestExpired ? "PASS" : "FAIL",
    code: !requestExpired ? "REQUEST_NOT_EXPIRED" : "REQUEST_EXPIRED",
    details: !requestExpired
      ? "Transfer petition is active within statutory validity window"
      : "Transfer petition has expired (90-day statutory limit exceeded)",
  });

  const valid = checklist.every((item) => item.status !== "FAIL");

  return {
    valid,
    isValid: valid,
    checklist,
    results: checklist,
    claims,
  };
}

export const verifySellToken = verifyStandardSellToken;

/**
 * Commits a verified transfer request:
 * Consumes nonce, appends audit log, updates status to COMMITTED with blockchain tx.
 */
export async function commitStandardSellToken(tokenString, transfer, officerBadge) {
  const evalResult = await verifyStandardSellToken(tokenString, transfer);
  if (!evalResult.valid) {
    return {
      ok: false,
      reason: "Token failed one or more mandatory verification criteria.",
    };
  }

  const nonce = evalResult.claims?.nonce;
  if (!nonce) {
    return {
      ok: false,
      reason: "Missing single-use nonce in token payload.",
    };
  }

  // 1. Consume nonce
  consumeNonce(nonce);

  // 2. Generate transaction hash
  const randomBytes = new Uint8Array(20);
  crypto.getRandomValues(randomBytes);
  const txHash = `0x${Array.from(randomBytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")}`;

  // 3. Append audit event
  const auditEvent = appendDemoAuditEvent({
    actor: officerBadge || "GOV-REG-0182",
    role: "REGISTRAR",
    action: "TRANSFER_COMMITTED_ON_CHAIN",
    ulpin: transfer.ulpin,
    transfer_id: transfer.request_id,
    token_key_id: evalResult.claims?.key_id,
    tx_hash: txHash,
  });

  // 4. Update transfer request in store
  const updatedTransfer = updateDemoTransfer(transfer.request_id, {
    status: "COMMITTED",
    authorization: {
      ...(transfer.authorization || {}),
      registrar_status: "COMMITTED",
      buyer_status: "ACCEPTED",
    },
    blockchain: {
      status: "CONFIRMED",
      tx_hash: txHash,
      block_number: 18942100 + Math.floor(Math.random() * 500),
      timestamp: new Date().toISOString(),
    },
    certificate: {
      status: "MINTED",
      certificate_id: `CERT-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
    },
  });

  return {
    ok: true,
    audit_event: auditEvent,
    transfer: updatedTransfer,
  };
}

export const commitVerifiedTransfer = commitStandardSellToken;
