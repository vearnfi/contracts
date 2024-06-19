import { ethers } from 'hardhat'
import { expect } from 'chai'
import { VexchangeV2Factory } from '../../../typechain-types/contracts/vexchange/vexchange-v2-core/contracts/VexchangeV2Factory'
import { VexchangeV2Pair } from '../../../typechain-types/contracts/vexchange/vexchange-v2-core/contracts/VexchangeV2Pair'
import { VexchangeV2Router02 } from '../../../typechain-types/contracts/vexchange/vexchange-v2-periphery/contracts/VexchangeV2Router02'
import * as pairArtifact from '../../../artifacts/contracts/vexchange/vexchange-v2-core/contracts/VexchangeV2Pair.sol/VexchangeV2Pair.json'
import { approveToken } from './approve-token'
import type { Token } from './approve-token'

const { Contract, MaxUint256 } = ethers

type Params = {
  vexchange: {
    factory: VexchangeV2Factory
    router: VexchangeV2Router02
  }
  token: Token
  vetAmount: bigint
  tokenAmount: bigint
  deployer: any // HardhatEthersSigner
}

export async function createVexchangePairTokenVET({
  vexchange,
  token,
  vetAmount,
  tokenAmount,
  deployer,
}: Params): Promise<VexchangeV2Pair> {
  const wvetAddr = await vexchange.router.VVET()
  const tokenAddr = await token.getAddress()
  const routerAddr = await vexchange.router.getAddress()

  // Create pair
  const tx1 = await vexchange.factory.createPair(wvetAddr, tokenAddr)
  await tx1.wait(1)

  const pairAddress = await vexchange.factory.getPair(wvetAddr, tokenAddr)

  const pair = new Contract(pairAddress, pairArtifact.abi, deployer) as unknown as VexchangeV2Pair

  const reserves = await pair.getReserves()
  expect(reserves[0]).to.equal(0)
  expect(reserves[1]).to.equal(0)

  // Provide liquidity
  await approveToken(token, deployer, routerAddr, MaxUint256)

  const addLiquidityTx = await vexchange.router.connect(deployer).addLiquidityVET(
    tokenAddr, // token
    tokenAmount, // amountTokenDesired
    0, // amountTokenMin
    0, // amountETHMin,
    deployer.address, // to: recipient of the liquidity tokens
    MaxUint256, // deadline
    { value: vetAmount }
  )

  await addLiquidityTx.wait()

  return pair
}
