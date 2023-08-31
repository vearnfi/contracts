import hre from 'hardhat'

const VEROCKET_UNI_ROUTER_ADDRESS = process.env.VEROCKET_UNI_ROUTER_ADDRESS

async function main() {
  console.log('Deploying contract...')
  console.log(`Using network ${hre.network.name} (${hre.network.config.chainId})`)

  const signers = await hre.ethers.getSigners()
  const deployer = signers[0]

  const Trader = await hre.ethers.getContractFactory('Trader')
  const trader = await Trader.connect(deployer).deploy(VEROCKET_UNI_ROUTER_ADDRESS)

  await trader.deployed()
  console.log(`Trader contract deployed to ${JSON.stringify(trader.deployTransaction, null, 2)}`)
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
