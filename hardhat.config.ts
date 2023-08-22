//require("dotenv").config();
import * as dotenv from "dotenv";
dotenv.config();
import type { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import '@nomiclabs/hardhat-truffle5';
import '@vechain/hardhat-vechain'
import '@vechain/hardhat-ethers'

const config: HardhatUserConfig = {
    solidity: {
    compilers: [
      {
        version: "0.4.24",
      },
      {
        version: "0.8.4",
        // settings: {},
      },
    ],
  },
  paths: {
    artifacts: "./artifacts",
  },
  networks: {
    "vechain-local": {
      url: "http://127.0.0.1:8669",
      accounts: {
        mnemonic: "denial kitchen pet squirrel other broom bar gas better priority spoil cross",
        count: 10,
      },
      // restful: true,
      gas: 10000000
    },
    "vechain-testnet": {
      url: "https://testnet.veblocks.net",
      chainId: 100010,
      // @ts-ignore
      privateKey: process.env.WALLET_PRIVATE_KEY,
      // delegateUrl: "https://sponsor-testnet.vechain.energy/by/#",
      blockGasLimit: 10000000,
      // vthoAddr: "0x0000000000000000000000000000456E65726779",
      // vthoFaucetAddr: "0x4f6FC409e152D33843Cf4982d414C1Dd0879277e",
    },
  },
};

export default config;
