import { ethers } from 'hardhat'
import { expect } from 'chai'
import { UniswapV2Factory } from '../../../typechain-types/contracts/verocket/v2-core/UniswapV2Factory'
import { UniswapV2Pair } from '../../../typechain-types/contracts/verocket/v2-core/UniswapV2Pair'
import { UniswapV2Router02 } from '../../../typechain-types/contracts/verocket/v2-periphery/UniswapV2Router02'
import * as pairArtifact from '../../../artifacts/contracts/vexchange/vexchange-v2-core/contracts/VexchangeV2Pair.sol/VexchangeV2Pair.json'
import { approveToken } from './approve-token'
import type { Token } from './approve-token'

const { Contract, MaxUint256 } = ethers

type Params = {
  verocket: {
    factory: UniswapV2Factory
    router: UniswapV2Router02
  }
  token: Token
  vetAmount: bigint
  tokenAmount: bigint
  deployer: any // HardhatEthersSigner
}

export async function createVerocketPairTokenVET({
  verocket,
  token,
  vetAmount,
  tokenAmount,
  deployer,
}: Params): Promise<UniswapV2Pair> {
  const wvetAddr = await verocket.router.WETH()
  const tokenAddr = await token.getAddress()
  const routerAddr = await verocket.router.getAddress()

  // Create pair
  const tx1 = await verocket.factory.createPair(wvetAddr, tokenAddr)
  await tx1.wait(1)

  const pairAddress = await verocket.factory.getPair(wvetAddr, tokenAddr)

  const pair = new Contract(pairAddress, pairArtifact.abi, deployer) as unknown as UniswapV2Pair

  const reserves = await pair.getReserves()
  expect(reserves[0]).to.equal(0)
  expect(reserves[1]).to.equal(0)

  // Provide liquidity
  await approveToken(token, deployer, routerAddr, MaxUint256)

  const addLiquidityTx = await verocket.router.connect(deployer).addLiquidityETH(
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
