import { apiPost } from "../lib/api.js";

/**
 * Service to handle EIP-712 wallet interactions via MetaMask and backend APIs
 */
export const walletCredentialService = {
  /**
   * Request a challenge to link a wallet
   * @param {string} parcelId - The parcel ID to link
   * @param {string} walletAddress - The user's EVM wallet address
   * @param {string} token - Authorization token
   * @returns {Promise<Object>} The challenge object containing typed_data
   */
  requestWalletLinkChallenge: async (parcelId, walletAddress, token) => {
    return apiPost("/wallets/challenge", {
      parcel_id: parcelId,
      wallet_address: walletAddress
    }, token);
  },

  /**
   * Complete wallet linking by submitting the signature
   * @param {string} challengeId - The ID of the challenge
   * @param {string} signature - The EIP-712 signature from the wallet
   * @param {string} token - Authorization token
   * @returns {Promise<Object>} The provisioned credential details
   */
  verifyWalletLinkSignature: async (challengeId, signature, token) => {
    return apiPost("/wallets/verify", {
      challenge_id: challengeId,
      signature: signature
    }, token);
  },

  /**
   * Request an EIP-712 challenge to approve a transfer
   * @param {string} transferId - The transfer ID to approve
   * @param {string} token - Authorization token
   * @returns {Promise<Object>} The challenge object containing typed_data
   */
  requestTransferApprovalChallenge: async (transferId, token) => {
    return apiPost(`/v2/transfers/${encodeURIComponent(transferId)}/approval-challenge`, {}, token);
  },

  /**
   * Submit the EIP-712 signature to finalize transfer approval
   * @param {string} challengeId - The challenge ID
   * @param {string} signature - The EIP-712 signature from the wallet
   * @param {string} token - Authorization token
   * @returns {Promise<Object>} The updated transfer state
   */
  submitTransferApprovalSignature: async (challengeId, signature, token) => {
    return apiPost("/v2/transfers/approve-signature", {
      challenge_id: challengeId,
      signature: signature
    }, token);
  }
};
