import { network, ethers } from 'hardhat'
import { getChainData } from '@vearnfi/config'
import type { ChainId } from '@vearnfi/config'

const { name, config: { chainId } } = network

async function main() {
  console.log('Deploying contract...')
  console.log(`Using network ${name} (${chainId})`)

  if (name == null || chainId == null || ![100010, 100009].includes(chainId)) {
    console.error('Unknown network')
    return
  }

  const { dexs } = getChainData(chainId as ChainId)

  const [deployer] = await ethers.getSigners()
  console.log({ deployer: await deployer.getAddress() })

  const Trader = await ethers.getContractFactory('Trader')
  const trader = await Trader.connect(deployer).deploy(dexs.map((dex) => dex.routerV2) as [Address, Address])

  await trader.waitForDeployment()
  console.log(`Trader contract deployed to ...`)
  console.log(JSON.stringify(trader.deploymentTransaction(), null, 2))

  // TODO: set admin
  // const tx = await trader.setAdmin(deployer.address);
  // tx.wait();
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})

// import { ethers } from "hardhat";

// async function main() {
//   const currentTimestampInSeconds = Math.round(Date.now() / 1000);
//   const unlockTime = currentTimestampInSeconds + 60;

//   const lockedAmount = ethers.parseEther("0.001");

//   const lock = await ethers.deployContract("Lock", [unlockTime], {
//     value: lockedAmount,
//   });

//   await lock.waitForDeployment();

//   console.log(
//     `Lock with ${ethers.formatEther(
//       lockedAmount
//     )}ETH and unlock timestamp ${unlockTime} deployed to ${lock.target}`
//   );
// }

// // We recommend this pattern to be able to use async/await everywhere
// // and properly handle errors.
// main().catch((error) => {
//   console.error(error);
//   process.exitCode = 1;
// });
