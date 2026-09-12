/**
 * Sell Key Cryptographic Management (Client-Side Only)
 *
 * Scoped, single-use, 24-hour expiring transfer authorization token.
 * Generated in browser via Web Crypto API.
 * Plaintext keys are NEVER stored in localStorage; only SHA-256 digests with local salt.
 */

const STORAGE_KEY = "titlelock.sellKeys";
const SALT_STORAGE_KEY = "titlelock.salt";
const KEY_TTL_MS = 24 * 60 * 60 * 1000; // 24 Hours

export const SELL_KEY_CAVEAT =
  "Demo credential, generated in your browser. Not a digital signature and not legally valid.";

/**
 * Retrieves or initializes the persistent device salt.
 */
function getOrCreateSalt() {
  try {
    let salt = localStorage.getItem(SALT_STORAGE_KEY);
    if (!salt) {
      const bytes = crypto.getRandomValues(new Uint8Array(16));
      salt = Array.from(bytes)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
      localStorage.setItem(SALT_STORAGE_KEY, salt);
    }
    return salt;
  } catch {
    return "titlelock_default_salt_2026";
  }
}

/**
 * Computes SHA-256 digest of keyText + local salt.
 */
export async function computeDigest(keyText) {
  const salt = getOrCreateSalt();
  const encoder = new TextEncoder();
  const data = encoder.encode(keyText + ":" + salt);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Encode Uint8Array to base64url string.
 */
function toBase64Url(bytes) {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/**
 * Retrieves all stored key records from localStorage.
 */
export function getStoredSellKeys() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Saves keys array to localStorage.
 */
function saveStoredSellKeys(keys) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(keys));
  } catch (err) {
    console.error("Failed to save sell keys:", err);
  }
}

/**
 * Generates a new Sell Key for an owner on a specific parcel.
 * Returns the plaintext key once (to display in reveal modal), and saves the record with digest.
 * Automatically revokes any previously active key for this parcel.
 */
export async function generateSellKey({
  ulpin,
  ownerUserId,
  recipientUserId,
  requestId = null,
}) {
  if (!ulpin || !ownerUserId || !recipientUserId) {
    throw new Error("Missing required parameters for sell key generation.");
  }

  // 1. Generate random bytes & identifier
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  const timestampBase36 = Date.now().toString(36);
  const shortRandom = Array.from(crypto.getRandomValues(new Uint8Array(3)))
    .map((b) => b.toString(36))
    .join("")
    .slice(0, 4);

  const keyId = `SK-${timestampBase36}-${shortRandom}`;
  const keyText = `TLK1.${keyId}.${toBase64Url(bytes)}`;

  // 2. Compute digest
  const digest = await computeDigest(keyText);

  const now = Date.now();
  const createdAt = new Date(now).toISOString();
  const expiresAt = new Date(now + KEY_TTL_MS).toISOString();

  // 3. Revoke existing active keys for this parcel
  const existingKeys = getStoredSellKeys();
  const updatedKeys = existingKeys.map((k) => {
    if (k.ulpin === ulpin && k.status === "ACTIVE") {
      return { ...k, status: "REVOKED", revokedAt: createdAt };
    }
    return k;
  });

  // 4. Append new key record (digest only, NEVER plaintext)
  const newRecord = {
    keyId,
    ulpin,
    ownerUserId,
    recipientUserId,
    requestId,
    createdAt,
    expiresAt,
    status: "ACTIVE", // ACTIVE | USED | REVOKED | EXPIRED
    digest,
  };

  updatedKeys.push(newRecord);
  saveStoredSellKeys(updatedKeys);

  // Return plaintext keyText once to caller
  return {
    keyId,
    keyText,
    record: newRecord,
  };
}

/**
 * Revokes a key by its keyId.
 */
export function revokeSellKey(keyId) {
  const existingKeys = getStoredSellKeys();
  const updated = existingKeys.map((k) => {
    if (k.keyId === keyId) {
      return { ...k, status: "REVOKED", revokedAt: new Date().toISOString() };
    }
    return k;
  });
  saveStoredSellKeys(updated);
}

/**
 * Marks a key as USED upon transfer settlement.
 */
export function markKeyUsed(keyId) {
  const existingKeys = getStoredSellKeys();
  const updated = existingKeys.map((k) => {
    if (k.keyId === keyId) {
      return { ...k, status: "USED", usedAt: new Date().toISOString() };
    }
    return k;
  });
  saveStoredSellKeys(updated);
}

/**
 * Verifies a pasted plaintext Sell Key against stored records.
 * Reports: VALID, EXPIRED, REVOKED, WRONG_PARCEL, ALREADY_USED, NOT_FOUND.
 */
export async function verifySellKey(inputKeyText, expectedUlpin = null) {
  const trimmed = (inputKeyText || "").trim();
  if (!trimmed || !trimmed.startsWith("TLK1.")) {
    return {
      isValid: false,
      code: "INVALID_FORMAT",
      message: "Key must start with prefix TLK1.SK-...",
    };
  }

  // Hash input
  const testDigest = await computeDigest(trimmed);
  const keys = getStoredSellKeys();
  const record = keys.find((k) => k.digest === testDigest);

  if (!record) {
    return {
      isValid: false,
      code: "NOT_FOUND",
      message: "No matching authorization key found in local registry ledger.",
    };
  }

  const now = Date.now();
  const isPastExpiry = new Date(record.expiresAt).getTime() < now;

  if (record.status === "REVOKED") {
    return {
      isValid: false,
      code: "REVOKED",
      record,
      message: "This key was explicitly revoked by the property owner.",
    };
  }

  if (record.status === "USED") {
    return {
      isValid: false,
      code: "ALREADY_USED",
      record,
      message: "This key was already consumed for a completed transfer.",
    };
  }

  if (isPastExpiry || record.status === "EXPIRED") {
    return {
      isValid: false,
      code: "EXPIRED",
      record,
      message: "This 24-hour authorization key has expired.",
    };
  }

  if (expectedUlpin && record.ulpin !== expectedUlpin) {
    return {
      isValid: false,
      code: "WRONG_PARCEL",
      record,
      message: `Key is authorized for parcel ${record.ulpin}, not ${expectedUlpin}.`,
    };
  }

  return {
    isValid: true,
    code: "VALID",
    record,
    message: `Valid authorization key for ${record.ulpin} issued to ${record.recipientUserId}.`,
  };
}

/**
 * Checks guardrails for whether a parcel is eligible for Sell Key issuance.
 */
export function checkSellKeyEligibility(parcel) {
  if (!parcel) return { eligible: false, reason: "Parcel not found" };

  const titleStatus = (parcel.title_status || "").toUpperCase();
  const riskStatus = (parcel.risk_status || "").toUpperCase();

  if (titleStatus === "FROZEN") {
    return {
      eligible: false,
      reason: "Parcel is legally FROZEN under civil injunction. Transfer key generation is prohibited.",
    };
  }

  if (titleStatus === "DISPUTED" || riskStatus === "DISPUTED") {
    return {
      eligible: false,
      reason: "Parcel has an active title dispute. Resolution required prior to transfer key issuance.",
    };
  }

  const activeEncumbrances = (parcel.encumbrances || []).filter(
    (e) => (e.status || "").toUpperCase() === "ACTIVE"
  );
  if (activeEncumbrances.length > 0) {
    return {
      eligible: false,
      reason: `Active encumbrance detected (${activeEncumbrances[0].holder} — ${activeEncumbrances[0].type}). Requires No-Objection Certificate before sale.`,
    };
  }

  const approvalsRequired = parcel.ownership_policy?.owner_approvals_required || 1;
  const totalOwners = (parcel.owners || []).length;

  return {
    eligible: true,
    approvalsRequired,
    totalOwners,
    multiOwner: approvalsRequired > 1,
  };
}
