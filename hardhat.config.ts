require("dotenv").config();
require("@vechain.energy/hardhat-thor");
import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

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
    hardhat: {
      // See: https://hardhat.org/hardhat-network/docs/metamask-issue
      chainId: 1337,
    },
    vechain: {
      url: "https://testnet.veblocks.net",
      chainId: 100010,
      // @ts-ignore
      privateKey: process.env.WALLET_PRIVATE_KEY,
      // delegateUrl: "https://sponsor-testnet.vechain.energy/by/#",
      blockGasLimit: 10000000,
      // vthoAddr: "0x0000000000000000000000000000456E65726779",
      // vthoFaucetAddr: "0x4f6FC409e152D33843Cf4982d414C1Dd0879277e",
    },
    // vechain_local: {
    //   url: "http://127.0.0.1:8545/",
    //   chainId: 1337,
    //   // @ts-ignore
    //   privateKey: process.env.WALLET_PRIVATE_KEY,
    //   // delegateUrl: "https://sponsor-testnet.vechain.energy/by/#",
    //   blockGasLimit: 10000000,
    //   // vthoAddr: "0x0000000000000000000000000000456E65726779",
    //   // vthoFaucetAddr: "0x4f6FC409e152D33843Cf4982d414C1Dd0879277e",
    // },
  },
  // etherscan: {
  //   apiKey: process.env.ETHERSCAN_API_KEY,
  // },
};

export default config;
