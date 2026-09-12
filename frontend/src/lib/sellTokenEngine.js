export const SELL_TOKEN_DISCLAIMER =
  "Sell-token issuance is unavailable until a server-backed authorization endpoint is provisioned.";

export function getStoredSellTokens() {
  return [];
}

export function revokeStoredSellToken() {
  return false;
}

export function checkTokenEligibility() {
  return { eligible: false, reason: SELL_TOKEN_DISCLAIMER };
}

export async function generateStandardSellToken() {
  throw new Error(SELL_TOKEN_DISCLAIMER);
}

export async function verifyStandardSellToken() {
  return { valid: false, reason: SELL_TOKEN_DISCLAIMER };
}
