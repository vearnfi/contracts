import { network, ethers } from 'hardhat'
import { getChainData } from '@vearnfi/config'
import type { ChainId } from '@vearnfi/config'

const {
  name,
  config: { chainId },
} = network

async function main() {
  console.log('Deploying contract...')
  console.log(`Using network ${name} (${chainId})`)

  if (name == null || chainId == null || ![100010, 100009].includes(chainId)) {
    console.error('Unknown network')
    return
  }

  const { dexs, vexWrapper } = getChainData(chainId as ChainId)

  const [deployer] = await ethers.getSigners()
  console.log({ deployer: await deployer.getAddress() })

  const verocket = dexs.find((dex) => dex.name === 'verocket')

  if (verocket == null) throw new Error('Verocket not found')

  const Trader = await ethers.getContractFactory('Trader')
  const trader = await Trader.connect(deployer).deploy([verocket.routerV2, vexWrapper] as [Address, Address])

  const receipt = await trader.waitForDeployment()
  console.log(JSON.stringify(receipt))

  // Notice: the deployment always returns 0x0925890E9aAbC1B410d4B3b407f875b9BFDfAfbc
  // as the trader contract address, which is wrong!

  // const tx = await trader.connect(deployer).addKeeper(deployer.address)
  // await tx.wait(1)
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
