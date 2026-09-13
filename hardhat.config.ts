import { defineConfig } from "hardhat/config";
import hardhatToolboxMochaEthers from "@nomicfoundation/hardhat-toolbox-mocha-ethers";

const config = defineConfig({
  plugins: [hardhatToolboxMochaEthers],
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  paths: {
    sources: "./contracts",
    tests: "./contracts/test",
    cache: "./cache-hardhat",
    artifacts: "./artifacts",
  },
  networks: {
    hardhat: {
      type: "edr-simulated",
      chainId: 31337,
    },
    amoy: {
      type: "http",
      url: process.env.POLYGON_AMOY_RPC ?? "https://rpc-amoy.polygon.technology",
      accounts: process.env.EVALUATOR_PRIVATE_KEY ? [process.env.EVALUATOR_PRIVATE_KEY] : [],
    },
  },
});

export default config;
