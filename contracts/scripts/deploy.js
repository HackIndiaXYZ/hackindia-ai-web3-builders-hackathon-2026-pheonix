const hre = require("hardhat");

async function main() {
  const LandRegistryV2 = await hre.ethers.getContractFactory("LandRegistryV2");
  const registry = await LandRegistryV2.deploy();
  await registry.waitForDeployment();

  const deployTx = registry.deploymentTransaction();
  const receipt = await deployTx.wait();

  console.log("LandRegistryV2 deployed to:", await registry.getAddress());
  console.log("Registrar (deployer) address:", (await hre.ethers.getSigners())[0].address);
  console.log("Deployed at block:", receipt.blockNumber);
  console.log("");
  console.log("Set these in your backend environment before running with CHAIN_MODE=live:");
  console.log(`  MST_CONTRACT_ADDRESS=${await registry.getAddress()}`);
  console.log(`  DEPLOY_BLOCK=${receipt.blockNumber}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
