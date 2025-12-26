require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();
require("@fhevm/hardhat-plugin");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      viaIR: true,
    },
  },
  networks: {
    sepolia: {
      url: process.env.SEPOLIA_RPC_URL || "https://rpc.sepolia.org",
      accounts: [process.env.PRIVATE_KEY],
      chainId: 11155111,
    },
  },
  sourcify: {
    enabled: true
  }
};