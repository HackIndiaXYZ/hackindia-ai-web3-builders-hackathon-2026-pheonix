const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("LandRegistryV2 invariants", function () {
  let registry, registrar, owner1, owner2, buyer, outsider;
  const parcel = ethers.keccak256(ethers.toUtf8Bytes("parcel:UP-0001"));
  const hash = (text) => ethers.keccak256(ethers.toUtf8Bytes(text));
  const owners = () => [owner1.address, owner2.address];
  const shares = () => [6000, 4000];
  const creds = () => [hash("cred-1"), hash("cred-2")];
  const versions = () => [1, 1];
  const proposed = () => [{ account: buyer.address, shareBps: 10000, credentialId: hash("cred-buyer"), credentialVersion: 1 }];

  beforeEach(async () => {
    [registrar, owner1, owner2, buyer, outsider] = await ethers.getSigners();
    registry = await (await ethers.getContractFactory("LandRegistryV2")).deploy();
    await registry.registerParcel(parcel, owners(), shares(), creds(), versions(), 2);
  });

  async function initiate(expiryOffset = 3600) {
    const expiry = (await ethers.provider.getBlock("latest")).timestamp + expiryOffset;
    const tx = await registry.initiateTransfer(parcel, buyer.address, proposed(), 1, hash("document"), hash("assessment"), expiry);
    const receipt = await tx.wait();
    return receipt.logs.find((l) => l.fragment && l.fragment.name === "TransferInitiated").args.transferId;
  }
  async function ready(id) {
    await registry.connect(owner1).approveTransfer(id);
    await registry.connect(owner2).approveTransfer(id);
    await registry.approveAsRegistrar(id);
    await registry.connect(buyer).acceptAsBuyer(id);
  }

  it("creates nonce-derived transfer IDs and emits indexer-complete initiation evidence", async () => {
    const id1 = await initiate(); const id2 = await initiate();
    expect(id1).to.not.equal(id2);
    const t = await registry.getTransfer(id1);
    expect(t[6]).to.equal(0n); expect(t[10]).to.equal(1n); // nonce, INITIATED
  });
  it("rejects duplicate owner approval and prevents registrar approval below threshold", async () => {
    const id = await initiate(); await registry.connect(owner1).approveTransfer(id);
    await expect(registry.connect(owner1).approveTransfer(id)).to.be.revertedWith("owner unavailable");
    await expect(registry.approveAsRegistrar(id)).to.be.revertedWith("owner threshold unmet");
  });
  it("requires owner threshold, registrar approval and buyer acceptance before one execution", async () => {
    const id = await initiate();
    await expect(registry.executeTransfer(id)).to.be.revertedWith("transfer not executable");
    await registry.connect(owner1).approveTransfer(id); await registry.connect(owner2).approveTransfer(id);
    await registry.approveAsRegistrar(id);
    await expect(registry.executeTransfer(id)).to.be.revertedWith("transfer not executable");
    await registry.connect(buyer).acceptAsBuyer(id);
    await expect(registry.executeTransfer(id)).to.emit(registry, "TransferExecuted");
    await expect(registry.executeTransfer(id)).to.be.revertedWith("transfer unavailable");
    const current = await registry.getParcelOwners(parcel); expect(current[0]).to.deep.equal([buyer.address]); expect(current[1]).to.deep.equal([10000n]);
  });
  it("enforces expiry, cancellation and freeze", async () => {
    const expired = await initiate(3600);
    await ethers.provider.send("evm_increaseTime", [3601]);
    await ethers.provider.send("evm_mine");
    await expect(registry.connect(owner1).approveTransfer(expired)).to.be.revertedWith("transfer expired");
    const id = await initiate(); await registry.setFrozen(parcel, true);
    await expect(registry.connect(owner1).approveTransfer(id)).to.be.revertedWith("parcel frozen");
    await registry.setFrozen(parcel, false); await registry.cancelTransfer(id, hash("withdrawn"));
    await expect(registry.connect(owner1).approveTransfer(id)).to.be.revertedWith("transfer unavailable");
  });
  it("binds active credential versions to owner approvals and rejects stale updates", async () => {
    const id = await initiate();
    await registry.setCredential(parcel, owner1.address, hash("cred-1-v2"), 2, 2); // SUSPENDED
    await expect(registry.connect(owner1).approveTransfer(id)).to.be.revertedWith("owner unavailable");
    await expect(registry.setCredential(parcel, owner2.address, hash("bad"), 1, 1)).to.be.revertedWith("credential invalid");
  });
  it("validates deterministic ownership transitions and registrar-only actions", async () => {
    await expect(registry.connect(outsider).initiateTransfer(parcel, buyer.address, proposed(), 1, hash("d"), hash("a"), 9999999999)).to.be.revertedWith("registrar only");
    await expect(registry.initiateTransfer(parcel, buyer.address, [{ account: buyer.address, shareBps: 9000, credentialId: hash("x"), credentialVersion: 1 }], 1, hash("d"), hash("a"), 9999999999)).to.be.revertedWith("shares must equal 10000 bps");
  });
});


