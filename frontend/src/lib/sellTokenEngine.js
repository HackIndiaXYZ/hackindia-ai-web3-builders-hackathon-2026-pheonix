import { apiPost } from "./api.js";

const STORAGE_KEY = "land_registry_sell_tokens";

export function getStoredSellTokens() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function saveToken(token) {
  const tokens = getStoredSellTokens();
  tokens.unshift(token);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tokens));
}

export function revokeStoredSellToken(keyId) {
  const tokens = getStoredSellTokens();
  const updated = tokens.map(t => t.key_id === keyId ? { ...t, revoked: true } : t);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  return true;
}

export function checkTokenEligibility() {
  return { eligible: true, reason: "" };
}

export async function generateStandardSellToken(params, authToken) {
  // params: ulpin, buyerUserId, ownerUserId, scope, ttlHours, transferRequestId
  const payload = {
    ulpin: params.ulpin,
    buyer_user_id: params.buyerUserId,
    scope: params.scope || "FULL_CONVEYANCE",
    transfer_request_id: params.transferRequestId
  };
  
  const tokenData = await apiPost("/v2/tokens/sell/generate", payload, authToken);
  saveToken(tokenData);
  return tokenData;
}

export async function verifyStandardSellToken(tokenString, authToken) {
  // Can be implemented if needed by the backend
  return { valid: true };
}
