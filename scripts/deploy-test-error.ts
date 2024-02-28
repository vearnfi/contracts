import { network, ethers } from 'hardhat'

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

  const [deployer] = await ethers.getSigners()
  console.log({ deployer: await deployer.getAddress() })

  const TestError = await ethers.getContractFactory('TestError')
  const testError = await TestError.connect(deployer).deploy()

  await testError.waitForDeployment()
  console.log(`TestError contract deployed to ...`)
  console.log(JSON.stringify(testError.deploymentTransaction(), null, 2))
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
