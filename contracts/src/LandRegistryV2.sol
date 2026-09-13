// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// Hash-only, EVM-compatible title workflow. No names, documents or keys are stored.
contract LandRegistryV2 {
    uint16 public constant TOTAL_BPS = 10_000;
    uint256 public constant MAX_OWNERS = 32;
    enum CredentialStatus { NONE, ACTIVE, SUSPENDED, REVOKED, DECEASED }
    enum TransferState { NONE, INITIATED, OWNER_APPROVAL, REGISTRAR_APPROVED, BUYER_ACCEPTED, EXECUTED, CANCELLED, EXPIRED }
    struct Owner { uint16 shareBps; CredentialStatus status; bytes32 credentialId; uint64 credentialVersion; }
    struct Parcel { bool exists; bool frozen; uint8 threshold; uint64 nonce; address[] owners; mapping(address => Owner) owner; }
    struct ProposedOwner { address account; uint16 shareBps; bytes32 credentialId; uint64 credentialVersion; }
    struct Transfer {
        bytes32 parcelId; address buyer; bytes32 documentHash; bytes32 assessmentHash; bytes32 previousOwnershipHash; bytes32 newOwnershipHash;
        uint64 nonce; uint64 expiry; uint8 threshold; uint8 approvals; TransferState state;
        address[] newOwners; uint16[] newShares; bytes32[] newCredentialIds; uint64[] newCredentialVersions;
        mapping(address => bool) approvedBy;
    }
    address public immutable registrar;
    mapping(bytes32 => Parcel) private parcels;
    mapping(bytes32 => Transfer) private transfers;

    event ParcelRegistered(bytes32 indexed parcelId, bytes32 indexed ownershipHash, uint8 threshold, address[] owners, uint16[] shares, bytes32[] credentialIds, uint64[] credentialVersions, uint64 timestamp);
    event TransferInitiated(bytes32 indexed transferId, bytes32 indexed parcelId, uint64 nonce, address buyer, bytes32 previousOwnershipHash, bytes32 newOwnershipHash, bytes32 documentHash, bytes32 assessmentHash, uint64 expiry, uint8 threshold, address[] newOwners, uint16[] newShares, bytes32[] newCredentialIds, uint64[] newCredentialVersions, uint64 timestamp);
    event OwnerApproved(bytes32 indexed transferId, bytes32 indexed parcelId, address indexed owner, bytes32 credentialId, uint64 credentialVersion, uint8 approvals, uint64 timestamp);
    event RegistrarApproved(bytes32 indexed transferId, bytes32 indexed parcelId, address indexed registrar, uint64 timestamp);
    event BuyerAccepted(bytes32 indexed transferId, bytes32 indexed parcelId, address indexed buyer, uint64 timestamp);
    event TransferExecuted(bytes32 indexed transferId, bytes32 indexed parcelId, bytes32 indexed previousOwnershipHash, bytes32 newOwnershipHash, bytes32 documentHash, bytes32 assessmentHash, address buyer, uint64 nonce, uint8 threshold, address[] previousOwners, uint16[] previousShares, address[] newOwners, uint16[] newShares, uint64 timestamp);
    event TransferCancelled(bytes32 indexed transferId, bytes32 indexed parcelId, address indexed cancelledBy, TransferState priorState, bytes32 reasonHash, uint64 timestamp);
    event CredentialUpdated(bytes32 indexed parcelId, address indexed owner, bytes32 credentialId, uint64 credentialVersion, CredentialStatus status, uint64 timestamp);
    event ParcelFrozen(bytes32 indexed parcelId, bool frozen, address indexed registrar, uint64 timestamp);
    modifier onlyRegistrar() { require(msg.sender == registrar, "registrar only"); _; }
    constructor() { registrar = msg.sender; }

    function registerParcel(bytes32 id, address[] calldata owners, uint16[] calldata shares, bytes32[] calldata cids, uint64[] calldata vers, uint8 threshold) external onlyRegistrar {
        require(id != bytes32(0) && !parcels[id].exists, "parcel exists"); _validate(owners, shares, cids, vers, threshold);
        Parcel storage p = parcels[id]; p.exists = true; p.threshold = threshold; _setOwners(p, owners, shares, cids, vers);
        emit ParcelRegistered(id, _hash(owners,shares,cids,vers), threshold, owners,shares,cids,vers,uint64(block.timestamp));
    }

    /// The contract creates the ID from an increasing parcel nonce, preventing caller-selected replay IDs.
    function initiateTransfer(bytes32 id, address buyer, ProposedOwner[] calldata proposed, uint8 nextThreshold, bytes32 documentHash, bytes32 assessmentHash, uint64 expiry) external onlyRegistrar returns (bytes32 transferId) {
        Parcel storage p = parcels[id]; require(p.exists && !p.frozen && buyer != address(0), "parcel unavailable"); require(documentHash != bytes32(0) && assessmentHash != bytes32(0) && expiry > block.timestamp, "invalid evidence");
        (address[] memory owners,uint16[] memory shares,bytes32[] memory cids,uint64[] memory vers) = _unpack(proposed); _validate(owners,shares,cids,vers,nextThreshold); require(_contains(owners,buyer),"buyer must be new owner");
        uint64 nonce = p.nonce++; transferId = keccak256(abi.encode(address(this),block.chainid,id,nonce,buyer,documentHash,assessmentHash)); require(transfers[transferId].state == TransferState.NONE,"transfer exists");
        Transfer storage t=transfers[transferId]; t.parcelId=id; t.buyer=buyer; t.documentHash=documentHash; t.assessmentHash=assessmentHash; t.previousOwnershipHash=_parcelHash(p); t.newOwnershipHash=_hash(owners,shares,cids,vers); t.nonce=nonce; t.expiry=expiry; t.threshold=p.threshold; t.state=TransferState.INITIATED;
        for(uint i;i<owners.length;++i){ t.newOwners.push(owners[i]); t.newShares.push(shares[i]); t.newCredentialIds.push(cids[i]); t.newCredentialVersions.push(vers[i]); }
        emit TransferInitiated(transferId,id,nonce,buyer,t.previousOwnershipHash,t.newOwnershipHash,documentHash,assessmentHash,expiry,p.threshold,owners,shares,cids,vers,uint64(block.timestamp));
    }
    function approveTransfer(bytes32 tid) external {
        Transfer storage t=_active(tid); Parcel storage p=parcels[t.parcelId]; require(!p.frozen,"parcel frozen"); Owner storage o=p.owner[msg.sender]; require(o.status==CredentialStatus.ACTIVE && !t.approvedBy[msg.sender],"owner unavailable");
        t.approvedBy[msg.sender]=true; ++t.approvals; t.state=TransferState.OWNER_APPROVAL; emit OwnerApproved(tid,t.parcelId,msg.sender,o.credentialId,o.credentialVersion,t.approvals,uint64(block.timestamp));
    }
    function approveAsRegistrar(bytes32 tid) external onlyRegistrar { Transfer storage t=_active(tid); require(!parcels[t.parcelId].frozen && t.approvals>=t.threshold,"owner threshold unmet"); t.state=TransferState.REGISTRAR_APPROVED; emit RegistrarApproved(tid,t.parcelId,msg.sender,uint64(block.timestamp)); }
    function acceptAsBuyer(bytes32 tid) external { Transfer storage t=_active(tid); require(msg.sender==t.buyer && t.state==TransferState.REGISTRAR_APPROVED,"buyer acceptance unavailable"); t.state=TransferState.BUYER_ACCEPTED; emit BuyerAccepted(tid,t.parcelId,msg.sender,uint64(block.timestamp)); }
    function executeTransfer(bytes32 tid) external onlyRegistrar {
        Transfer storage t=_active(tid); Parcel storage p=parcels[t.parcelId]; require(!p.frozen && t.state==TransferState.BUYER_ACCEPTED && t.approvals>=t.threshold,"transfer not executable"); (address[] memory oldOwners,uint16[] memory oldShares)=_current(p); _replace(p,t); t.state=TransferState.EXECUTED;
        emit TransferExecuted(tid,t.parcelId,t.previousOwnershipHash,t.newOwnershipHash,t.documentHash,t.assessmentHash,t.buyer,t.nonce,p.threshold,oldOwners,oldShares,t.newOwners,t.newShares,uint64(block.timestamp));
    }
    function cancelTransfer(bytes32 tid, bytes32 reason) external onlyRegistrar { Transfer storage t=transfers[tid]; require(t.state>TransferState.NONE && t.state<TransferState.EXECUTED,"not cancellable"); TransferState prior=t.state; t.state=TransferState.CANCELLED; emit TransferCancelled(tid,t.parcelId,msg.sender,prior,reason,uint64(block.timestamp)); }
    function expireTransfer(bytes32 tid) external { Transfer storage t=transfers[tid]; require(t.state>TransferState.NONE && t.state<TransferState.EXECUTED && block.timestamp>t.expiry,"not expired"); TransferState prior=t.state; t.state=TransferState.EXPIRED; emit TransferCancelled(tid,t.parcelId,msg.sender,prior,keccak256("EXPIRED"),uint64(block.timestamp)); }
    function setFrozen(bytes32 id,bool frozen) external onlyRegistrar { require(parcels[id].exists,"unknown parcel"); parcels[id].frozen=frozen; emit ParcelFrozen(id,frozen,msg.sender,uint64(block.timestamp)); }
    function setCredential(bytes32 id,address account,bytes32 cid,uint64 version,CredentialStatus status) external onlyRegistrar { Owner storage o=parcels[id].owner[account]; require(parcels[id].exists && o.status!=CredentialStatus.NONE && cid!=bytes32(0) && version>o.credentialVersion,"credential invalid"); o.credentialId=cid;o.credentialVersion=version;o.status=status; emit CredentialUpdated(id,account,cid,version,status,uint64(block.timestamp)); }
    function getTransfer(bytes32 tid) external view returns(bytes32,address,bytes32,bytes32,bytes32,bytes32,uint64,uint64,uint8,uint8,TransferState){ Transfer storage t=transfers[tid]; return(t.parcelId,t.buyer,t.documentHash,t.assessmentHash,t.previousOwnershipHash,t.newOwnershipHash,t.nonce,t.expiry,t.threshold,t.approvals,t.state); }
    function getParcelOwners(bytes32 id) external view returns(address[] memory owners,uint16[] memory shares,bytes32[] memory cids,uint64[] memory vers,CredentialStatus[] memory statuses){ Parcel storage p=parcels[id]; owners=p.owners; shares=new uint16[](owners.length);cids=new bytes32[](owners.length);vers=new uint64[](owners.length);statuses=new CredentialStatus[](owners.length); for(uint i;i<owners.length;++i){Owner storage o=p.owner[owners[i]];shares[i]=o.shareBps;cids[i]=o.credentialId;vers[i]=o.credentialVersion;statuses[i]=o.status;} }
    function getTransferProposedOwners(bytes32 tid) external view returns(address[] memory,uint16[] memory,bytes32[] memory,uint64[] memory){Transfer storage t=transfers[tid];return(t.newOwners,t.newShares,t.newCredentialIds,t.newCredentialVersions);}
    function _active(bytes32 tid) private returns(Transfer storage t){t=transfers[tid];require(t.state>TransferState.NONE && t.state<TransferState.EXECUTED,"transfer unavailable");if(block.timestamp>t.expiry){TransferState prior=t.state;t.state=TransferState.EXPIRED;emit TransferCancelled(tid,t.parcelId,msg.sender,prior,keccak256("EXPIRED"),uint64(block.timestamp));revert("transfer expired");}}
    function _validate(address[] memory a,uint16[] memory s,bytes32[] memory c,uint64[] memory v,uint8 threshold) private pure {require(a.length>0 && a.length<=MAX_OWNERS && a.length==s.length && a.length==c.length && a.length==v.length && threshold>0 && threshold<=a.length,"invalid owners");uint total;for(uint i;i<a.length;++i){require(a[i]!=address(0)&&s[i]>0&&c[i]!=bytes32(0)&&v[i]>0,"invalid owner");for(uint j;j<i;++j)require(a[i]!=a[j],"duplicate owner");total+=s[i];}require(total==TOTAL_BPS,"shares must equal 10000 bps");}
    function _setOwners(Parcel storage p,address[] memory a,uint16[] memory s,bytes32[] memory c,uint64[] memory v) private {for(uint i;i<a.length;++i){p.owners.push(a[i]);p.owner[a[i]]=Owner(s[i],CredentialStatus.ACTIVE,c[i],v[i]);}}
    function _replace(Parcel storage p,Transfer storage t) private {for(uint i;i<p.owners.length;++i)delete p.owner[p.owners[i]];delete p.owners;p.threshold=t.threshold;for(uint i;i<t.newOwners.length;++i){p.owners.push(t.newOwners[i]);p.owner[t.newOwners[i]]=Owner(t.newShares[i],CredentialStatus.ACTIVE,t.newCredentialIds[i],t.newCredentialVersions[i]);}}
    function _unpack(ProposedOwner[] calldata x) private pure returns(address[] memory a,uint16[] memory s,bytes32[] memory c,uint64[] memory v){a=new address[](x.length);s=new uint16[](x.length);c=new bytes32[](x.length);v=new uint64[](x.length);for(uint i;i<x.length;++i){a[i]=x[i].account;s[i]=x[i].shareBps;c[i]=x[i].credentialId;v[i]=x[i].credentialVersion;}}
    function _current(Parcel storage p) private view returns(address[] memory a,uint16[] memory s){a=p.owners;s=new uint16[](a.length);for(uint i;i<a.length;++i)s[i]=p.owner[a[i]].shareBps;}
    function _parcelHash(Parcel storage p) private view returns(bytes32){(address[] memory a,uint16[] memory s)=_current(p);bytes32[] memory c=new bytes32[](a.length);uint64[] memory v=new uint64[](a.length);for(uint i;i<a.length;++i){Owner storage o=p.owner[a[i]];c[i]=o.credentialId;v[i]=o.credentialVersion;}return _hash(a,s,c,v);}
    function _hash(address[] memory a,uint16[] memory s,bytes32[] memory c,uint64[] memory v) private pure returns(bytes32){return keccak256(abi.encode(a,s,c,v));}
    function _contains(address[] memory a,address x) private pure returns(bool){for(uint i;i<a.length;++i)if(a[i]==x)return true;return false;}
}
