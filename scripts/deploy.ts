import hre from 'hardhat'
import { networkConfig } from '../helper-hardhat-config'
import type { ChainId } from '../helper-hardhat-config'

const {
  network: {
    name,
    config: { chainId },
  },
} = hre

async function main() {
  console.log('Deploying contract...')
  console.log(`Using network ${name} (${chainId})`)

  if (name == null || chainId == null || ![100010, 100009].includes(chainId)) {
    console.error('Unknown network')
    return
  }

  const { dexs } = networkConfig[chainId as ChainId]

  const [deployer] = await hre.ethers.getSigners()
  console.log({ deployer: await deployer.getAddress() })

  const Trader = await hre.ethers.getContractFactory('Trader')
  const trader = await Trader.connect(deployer).deploy(dexs.map((dex) => dex.routerV2))

  await trader.deployed()
  console.log(`Trader contract deployed to ${trader.address}`)
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
