require("@nomicfoundation/hardhat-toolbox");
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "..", ".env") });

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.20",
    settings: { optimizer: { enabled: true, runs: 200 }, viaIR: true },
  },
  paths: {
    sources: "./src",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
  networks: {
    mst: {
      url: process.env.MST_RPC_URL || "",
      chainId: Number(process.env.MST_CHAIN_ID || 91562037),
      accounts: process.env.MST_PRIVATE_KEY ? [process.env.MST_PRIVATE_KEY] : [],
    },
    amoy: {
      // Polygon Amoy testnet — get a free RPC URL from Alchemy/Infura,
      // and a small amount of test MATIC from a public Amoy faucet.
      url: process.env.AMOY_RPC_URL || "",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    },
  },
};
