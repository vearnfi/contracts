import * as dotenv from 'dotenv'
dotenv.config()
import type { HardhatUserConfig } from 'hardhat/config'
import '@nomicfoundation/hardhat-toolbox'
import '@nomiclabs/hardhat-truffle5'
import '@vechain/hardhat-vechain'
import '@vechain/hardhat-ethers'
import 'solidity-coverage'
import '@typechain/hardhat'

const config: HardhatUserConfig = {
  solidity: {
    compilers: [
      {
        version: '0.8.4',
      },
      {
        version: '0.8.0',
      },
      {
        version: '0.6.6',
        settings: {
          optimizer: {
            enabled: true,
            runs: 2,
          },
        },
      },
      {
        version: '0.5.16',
      },
      {
        version: '0.5.0',
      },
      {
        version: '0.4.24',
      },
    ],
  },
  mocha: {
    timeout: 100000000,
  },
  paths: {
    artifacts: './artifacts',
  },
  networks: {
    'vechain-local': {
      url: 'http://127.0.0.1:8669',
      accounts: {
        mnemonic: 'denial kitchen pet squirrel other broom bar gas better priority spoil cross',
        count: 10,
      },
      // restful: true,
      gas: 10000000,
    },
    'vechain-testnet': {
      url: 'https://testnet.veblocks.net',
      chainId: 100010,
      // @ts-ignore
      privateKey: process.env.WALLET_PRIVATE_KEY,
      // delegateUrl: "https://sponsor-testnet.vechain.energy/by/#",
      blockGasLimit: 10000000,
    },
  },
}

export default config
