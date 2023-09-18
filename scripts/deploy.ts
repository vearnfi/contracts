import hre from 'hardhat'
import { networkConfig } from "../helper-hardhat-config"

const {
  network: {
    name,
    config: {
      chainId,
    }
  }
} = hre

async function main() {
  console.log('Deploying contract...')
  console.log(`Using network ${name} (${chainId})`)

  if (name == null || chainId == null || ![100009, 100010].includes(chainId)) {
    console.error('Unknown network')
    return
  }

  const { verocket, vexchange } = networkConfig[chainId as 100009, 100010]

  const [deployer] = await hre.ethers.getSigners()

  const Trader = await hre.ethers.getContractFactory('Trader')
  const trader = await Trader.connect(deployer).deploy([verocket.routerV2, vexchange.routerV2])

  await trader.deployed()
  console.log(`Trader contract deployed to ${trader.address}`)
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
