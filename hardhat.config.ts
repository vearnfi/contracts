require("dotenv").config();
require("@vechain.energy/hardhat-thor");
import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

const config: HardhatUserConfig = {
  solidity: "0.8.4",
  paths: {
    artifacts: "./client/src/artifacts",
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
  },
  // etherscan: {
  //   apiKey: process.env.ETHERSCAN_API_KEY,
  // },
};

export default config;
