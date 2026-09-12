const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("LandRegistry", function () {
  let registry, registrar, buyer1, buyer2;

  const ulpinHash = ethers.keccak256(ethers.toUtf8Bytes("UP-0001-CLEAN"));
  const docHash = ethers.keccak256(ethers.toUtf8Bytes("sample-deed-doc"));

  beforeEach(async () => {
    [registrar, buyer1, buyer2] = await ethers.getSigners();
    const LandRegistry = await ethers.getContractFactory("LandRegistry");
    registry = await LandRegistry.deploy();
  });

  it("registers a new parcel with an initial owner", async () => {
    await registry.registerParcel(ulpinHash, buyer1.address);
    expect(await registry.getCurrentOwner(ulpinHash)).to.equal(buyer1.address);
  });

  it("records a clean transfer and updates current owner", async () => {
    await registry.registerParcel(ulpinHash, buyer1.address);
    await registry.registerTransfer(ulpinHash, buyer2.address, docHash, true);

    expect(await registry.getCurrentOwner(ulpinHash)).to.equal(buyer2.address);
    const history = await registry.getHistory(ulpinHash);
    expect(history.length).to.equal(1);
    expect(history[0].aiVerified).to.equal(true);
  });

  it("preserves full chain-of-custody across multiple transfers", async () => {
    await registry.registerParcel(ulpinHash, buyer1.address);
    await registry.registerTransfer(ulpinHash, buyer2.address, docHash, true);
    await registry.registerTransfer(ulpinHash, registrar.address, docHash, false); // e.g. registrar override

    const history = await registry.getHistory(ulpinHash);
    expect(history.length).to.equal(2);
    expect(history[1].aiVerified).to.equal(false); // override case preserved in the log
  });

  it("rejects transfer registration from a non-registrar account", async () => {
    await registry.registerParcel(ulpinHash, buyer1.address);
    await expect(
      registry.connect(buyer1).registerTransfer(ulpinHash, buyer2.address, docHash, true)
    ).to.be.revertedWith("LandRegistry: caller is not the registrar");
  });

  it("rejects operations on an unknown parcel", async () => {
    await expect(registry.getCurrentOwner(ulpinHash)).to.be.revertedWith(
      "LandRegistry: unknown parcel"
    );
  });

  it("mints a certificate only after a parcel has transfer history", async () => {
    await registry.registerParcel(ulpinHash, buyer1.address);
    await expect(registry.mintCertificate(ulpinHash)).to.be.revertedWith(
      "LandRegistry: no transfer history to certify"
    );

    await registry.registerTransfer(ulpinHash, buyer2.address, docHash, true);
    await expect(registry.mintCertificate(ulpinHash))
      .to.emit(registry, "CertificateMinted")
      .withArgs(1, ulpinHash, buyer2.address);

    const cert = await registry.certificates(1);
    expect(cert.owner).to.equal(buyer2.address);
  });
});
