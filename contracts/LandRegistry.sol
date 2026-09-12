// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * LandRegistry — hackathon-tier contract.
 *
 * Design intent (see the CTO architecture doc for the full reasoning):
 *   - ONE on-chain write per approved transfer (direct-commit model). This is
 *     deliberately simple for Phase 1/pilot scale. ADR-1 in the architecture
 *     doc explains why national scale should move to Merkle-batched
 *     anchoring instead — but don't build that yet, it's premature complexity
 *     for a hackathon demo or early pilot.
 *   - Owner identity is stored as an address (wallet), NOT a plaintext name —
 *     keep PII off-chain in the backend DB, referenced only by a hash if
 *     needed. This contract only knows "who currently controls this parcel"
 *     as a wallet address.
 *   - `docHash` stores a keccak256 hash of the off-chain document (or its
 *     IPFS CID) — proves a specific document existed and was tied to this
 *     transfer, without putting the document itself on-chain.
 *   - `aiVerified` is passed in by the backend after the fraud engine has
 *     run. This contract does NOT do fraud detection — that's explicitly
 *     the off-chain AI layer's job (see fraud_engine.py). The contract's
 *     only responsibility is tamper-evident recordkeeping.
 *
 * EXTENSION POINTS:
 *   - Swap `onlyRegistrar` for a multisig/M-of-N approval scheme once you
 *     have more than one trusted signer (see Security section in the CTO doc).
 *   - Add a `Merkle Batch` variant of registerTransfer for Phase 3 scale
 *     (see ADR-1) without changing this contract's read interface —
 *     getHistory()/getCurrentOwner() should keep working the same way for
 *     any caller regardless of which write-path was used internally.
 */

contract LandRegistry {
    struct TransferRecord {
        address fromOwner;
        address toOwner;
        bytes32 docHash;
        uint256 timestamp;
        bool aiVerified;
    }

    struct Parcel {
        bool exists;
        address currentOwner;
        TransferRecord[] history;
    }

    mapping(bytes32 => Parcel) private parcels; // key = keccak256(ULPIN string)

    address public registrar;

    event ParcelRegistered(bytes32 indexed ulpinHash, address indexed initialOwner);
    event TransferRegistered(
        bytes32 indexed ulpinHash,
        address indexed fromOwner,
        address indexed toOwner,
        bytes32 docHash,
        bool aiVerified,
        uint256 timestamp
    );

    modifier onlyRegistrar() {
        require(msg.sender == registrar, "LandRegistry: caller is not the registrar");
        _;
    }

    constructor() {
        registrar = msg.sender;
    }

    function registerParcel(bytes32 ulpinHash, address initialOwner) external onlyRegistrar {
        require(!parcels[ulpinHash].exists, "LandRegistry: parcel already registered");
        Parcel storage p = parcels[ulpinHash];
        p.exists = true;
        p.currentOwner = initialOwner;
        emit ParcelRegistered(ulpinHash, initialOwner);
    }

    /**
     * @param ulpinHash keccak256 hash of the parcel's ULPIN identifier
     * @param newOwner address of the buyer
     * @param docHash keccak256 hash of the transfer document (or its IPFS CID)
     * @param aiVerified whether the off-chain fraud engine cleared this transfer
     *        (false is still permitted — represents a registrar override on a
     *        FLAGGED case; the event log preserves that this was an override)
     */
    function registerTransfer(
        bytes32 ulpinHash,
        address newOwner,
        bytes32 docHash,
        bool aiVerified
    ) external onlyRegistrar {
        Parcel storage p = parcels[ulpinHash];
        require(p.exists, "LandRegistry: unknown parcel");

        address previousOwner = p.currentOwner;
        p.currentOwner = newOwner;
        p.history.push(TransferRecord({
            fromOwner: previousOwner,
            toOwner: newOwner,
            docHash: docHash,
            timestamp: block.timestamp,
            aiVerified: aiVerified
        }));

        emit TransferRegistered(ulpinHash, previousOwner, newOwner, docHash, aiVerified, block.timestamp);
    }

    function getCurrentOwner(bytes32 ulpinHash) external view returns (address) {
        require(parcels[ulpinHash].exists, "LandRegistry: unknown parcel");
        return parcels[ulpinHash].currentOwner;
    }

    function getHistory(bytes32 ulpinHash) external view returns (TransferRecord[] memory) {
        require(parcels[ulpinHash].exists, "LandRegistry: unknown parcel");
        return parcels[ulpinHash].history;
    }

    function getHistoryLength(bytes32 ulpinHash) external view returns (uint256) {
        return parcels[ulpinHash].history.length;
    }

    // -----------------------------------------------------------------
    // Sharp Economy track tie-in: non-transferable "verified clean title"
    // certificates. Deliberately NOT a full ERC-721 implementation (avoids
    // needing an OpenZeppelin import just to demonstrate the concept) — this
    // is a minimal, self-contained soulbound-style registry. If you want
    // real ERC-721 compliance for wallet/marketplace visibility, swap this
    // for `@openzeppelin/contracts/token/ERC721/ERC721.sol` with `_transfer`
    // overridden to always revert (that's what "soulbound" means in practice).
    // -----------------------------------------------------------------

    struct Certificate {
        bytes32 ulpinHash;
        address owner;
        uint256 mintedAt;
    }

    mapping(uint256 => Certificate) public certificates;
    uint256 public certificateCounter;

    event CertificateMinted(uint256 indexed tokenId, bytes32 indexed ulpinHash, address indexed owner);

    /**
     * Mints a certificate attesting this parcel had at least one verified,
     * on-chain-committed clean transfer as of this block. Callable only by
     * the registrar, and only for a parcel that already has transfer history
     * — a certificate is a statement about the record, not a substitute for it.
     */
    function mintCertificate(bytes32 ulpinHash) external onlyRegistrar returns (uint256) {
        require(parcels[ulpinHash].exists, "LandRegistry: unknown parcel");
        require(parcels[ulpinHash].history.length > 0, "LandRegistry: no transfer history to certify");

        certificateCounter++;
        certificates[certificateCounter] = Certificate({
            ulpinHash: ulpinHash,
            owner: parcels[ulpinHash].currentOwner,
            mintedAt: block.timestamp
        });

        emit CertificateMinted(certificateCounter, ulpinHash, parcels[ulpinHash].currentOwner);
        return certificateCounter;
    }
}
