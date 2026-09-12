// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @notice V2 reference contract. It keeps PII and documents off-chain while
/// enforcing the ownership, freeze and multi-party authorization invariants.
contract LandRegistryV2 {
    enum CredentialStatus { NONE, ACTIVE, SUSPENDED, REVOKED, DECEASED }
    struct Owner { uint16 shareBps; CredentialStatus credential; }
    struct Parcel {
        bool exists;
        bool frozen;
        uint8 requiredApprovals;
        address[] owners;
        mapping(address => Owner) ownerData;
    }
    struct Transfer {
        bytes32 parcelId;
        address buyer;
        bytes32 documentHash;
        bytes32 assessmentHash;
        uint64 expiry;
        uint8 approvals;
        bool registrarApproved;
        bool buyerAccepted;
        bool executed;
        mapping(address => bool) approvedBy;
    }

    address public immutable registrar;
    mapping(bytes32 => Parcel) private parcels;
    mapping(bytes32 => Transfer) private transfers;

    event ParcelRegistered(bytes32 indexed parcelId, uint8 requiredApprovals);
    event OwnerApproved(bytes32 indexed transferId, address indexed owner);
    event RegistrarApproved(bytes32 indexed transferId);
    event BuyerAccepted(bytes32 indexed transferId, address indexed buyer);
    event TransferExecuted(bytes32 indexed transferId, bytes32 indexed parcelId, address indexed buyer, bytes32 documentHash, bytes32 assessmentHash);
    event ParcelFrozen(bytes32 indexed parcelId, bool frozen);
    event CredentialUpdated(bytes32 indexed parcelId, address indexed owner, CredentialStatus status);

    modifier onlyRegistrar() { require(msg.sender == registrar, "registrar only"); _; }

    constructor() { registrar = msg.sender; }

    function registerParcel(bytes32 parcelId, address[] calldata owners, uint16[] calldata shares, uint8 requiredApprovals) external onlyRegistrar {
        require(!parcels[parcelId].exists, "parcel exists");
        require(owners.length > 0 && owners.length == shares.length, "invalid owners");
        require(requiredApprovals > 0 && requiredApprovals <= owners.length, "invalid threshold");
        uint256 total;
        Parcel storage p = parcels[parcelId]; p.exists = true; p.requiredApprovals = requiredApprovals;
        for (uint256 i; i < owners.length; i++) {
            require(owners[i] != address(0) && p.ownerData[owners[i]].credential == CredentialStatus.NONE, "invalid owner");
            total += shares[i]; p.owners.push(owners[i]);
            p.ownerData[owners[i]] = Owner(shares[i], CredentialStatus.ACTIVE);
        }
        require(total == 10_000, "shares must equal 10000 bps");
        emit ParcelRegistered(parcelId, requiredApprovals);
    }

    function initiateTransfer(bytes32 transferId, bytes32 parcelId, address buyer, bytes32 documentHash, bytes32 assessmentHash, uint64 expiry) external onlyRegistrar {
        Parcel storage p = parcels[parcelId];
        require(p.exists && !p.frozen && buyer != address(0), "parcel unavailable");
        require(transfers[transferId].expiry == 0 && expiry > block.timestamp, "invalid transfer");
        Transfer storage t = transfers[transferId];
        t.parcelId = parcelId; t.buyer = buyer; t.documentHash = documentHash;
        t.assessmentHash = assessmentHash; t.expiry = expiry;
    }

    function approveTransfer(bytes32 transferId) external {
        Transfer storage t = transfers[transferId]; Parcel storage p = parcels[t.parcelId];
        require(t.expiry >= block.timestamp && !t.executed && !p.frozen, "transfer unavailable");
        require(p.ownerData[msg.sender].credential == CredentialStatus.ACTIVE && !t.approvedBy[msg.sender], "not eligible owner");
        t.approvedBy[msg.sender] = true; t.approvals++; emit OwnerApproved(transferId, msg.sender);
    }

    function approveAsRegistrar(bytes32 transferId) external onlyRegistrar {
        Transfer storage t = transfers[transferId]; Parcel storage p = parcels[t.parcelId];
        require(t.approvals >= p.requiredApprovals && !p.frozen, "owner threshold unmet");
        t.registrarApproved = true; emit RegistrarApproved(transferId);
    }

    function acceptAsBuyer(bytes32 transferId) external {
        Transfer storage t = transfers[transferId]; require(msg.sender == t.buyer && t.registrarApproved, "buyer acceptance unavailable");
        t.buyerAccepted = true; emit BuyerAccepted(transferId, msg.sender);
    }

    function executeTransfer(bytes32 transferId) external onlyRegistrar {
        Transfer storage t = transfers[transferId]; Parcel storage p = parcels[t.parcelId];
        require(!p.frozen && !t.executed && t.buyerAccepted && t.expiry >= block.timestamp, "not ready");
        for (uint256 i; i < p.owners.length; i++) delete p.ownerData[p.owners[i]];
        delete p.owners; p.owners.push(t.buyer); p.ownerData[t.buyer] = Owner(10_000, CredentialStatus.ACTIVE); p.requiredApprovals = 1;
        t.executed = true; emit TransferExecuted(transferId, t.parcelId, t.buyer, t.documentHash, t.assessmentHash);
    }

    function setFrozen(bytes32 parcelId, bool frozen) external onlyRegistrar { require(parcels[parcelId].exists, "unknown parcel"); parcels[parcelId].frozen = frozen; emit ParcelFrozen(parcelId, frozen); }
    function setCredential(bytes32 parcelId, address owner, CredentialStatus status) external onlyRegistrar { require(parcels[parcelId].ownerData[owner].credential != CredentialStatus.NONE, "unknown owner"); parcels[parcelId].ownerData[owner].credential = status; emit CredentialUpdated(parcelId, owner, status); }
}
