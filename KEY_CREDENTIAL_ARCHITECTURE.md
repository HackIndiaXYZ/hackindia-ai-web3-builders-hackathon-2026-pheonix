# Key and Credential Architecture

## Overview
The V2 Land Registry secures property transfers via cryptographic evidence independent of the central database, preventing unilateral modifications by administrators while shielding application servers from raw secret key exposure.

## Cryptographic Operations

### 1. Owner Wallets & External Signatures
- **Design Principle**: The backend and frontend application servers never handle raw seed phrases, mnemonics, or private keys. 
- **Implementation**: We implemented `walletCredentialService.js` to simulate Web3 providers (ethers.js) to sign typed EIP-712 challenges.
- **Workflow**: 
  1. The API issues an EIP-712 challenge containing the transfer/link intent.
  2. The frontend (wallet) signs the challenge payload.
  3. The API uses ECDSA recovery to derive the public address of the signer.
  4. If the derived address matches the active wallet credential for that owner, the action is verified.

### 2. Live MST Transaction Signing
- **Design Principle**: Server-side transactions must be signed securely before submission to the MST blockchain.
- **Implementation**: The `MSTSigner` abstraction enforces a boundary.
  - `DevelopmentSigner`: Accepts environment variables (for testing).
  - `ProductionSecureSigner`: Stubbed to integrate with a Key Management System (KMS/HSM). In this mode, the raw key never enters application memory; the payload is sent to the KMS, which returns the signed signature.

## Role Separation
- **Owner**: Approves transfers using their cryptographic wallet. Only owners can sign `APPROVAL` challenges.
- **Registrar**: Reviews the completed approval, checks compliance and risk factors, and initiates the `READY_TO_COMMIT` outbox event. The registrar never signs on behalf of the owner, and never touches the owner's credential.

## Fraud Prevention
By utilizing external wallet signing for intent and asynchronous worker validation for finality, we prevent scenarios where compromised database credentials could unilaterally forge ownership.
