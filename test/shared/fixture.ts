import { ethers } from 'hardhat'
import chai, { expect } from 'chai'
import { solidity } from 'ethereum-waffle'
import { ENERGY_CONTRACT_ADDRESS } from '../../constants'
import { Energy, UniswapV2Pair } from '../../typechain-types'
import * as pairArtifact from '../../artifacts/contracts/uniswap/v2-core/UniswapV2Pair.sol/UniswapV2Pair.json'
import * as energyArtifact from '../../artifacts/contracts/vechain/Energy.sol/Energy.json'
import { eth } from './eth'

chai.use(solidity)

const {
  getSigners,
  getContractFactory,
  utils: { hexlify },
  Contract,
  constants,
  provider,
} = ethers

export async function fixture() {
  const [god, owner, admin, alice, bob] = await getSigners()

  const energy = new Contract(ENERGY_CONTRACT_ADDRESS, energyArtifact.abi, god) as Energy

  expect(await provider.getCode(energy.address)).not.to.have.length(0)

  const VVET9 = await getContractFactory('VVET9', god)
  const vvet9 = await VVET9.deploy()

  expect(await provider.getCode(vvet9.address)).not.to.have.length(0)

  const Factory = await getContractFactory('UniswapV2Factory', god)
  const factory = await Factory.deploy(god.address, vvet9.address)

  expect(await provider.getCode(factory.address)).not.to.have.length(0)

  const Router = await getContractFactory('UniswapV2Router02', god)
  const router = await Router.deploy(factory.address, vvet9.address)

  expect(await provider.getCode(router.address)).not.to.have.length(0)

  const Trader = await getContractFactory('Trader', owner)
  const trader = await Trader.deploy(router.address)

  expect(await provider.getCode(trader.address)).not.to.have.length(0)

  // Set Trader contract admin
  expect(await trader.admin()).to.equal(constants.AddressZero)

  const tx0 = await trader.connect(owner).setAdmin(admin.address)
  await tx0.wait()

  expect(await trader.admin()).to.equal(admin.address)

  // Create VVET9-VTHO pair
  const tx1 = await factory.createPair(energy.address, vvet9.address)
  await tx1.wait()

  const pairAddress = await factory.getPair(energy.address, vvet9.address)

  const pair = new Contract(pairAddress, pairArtifact.abi, god) as UniswapV2Pair

  expect(await provider.getCode(pair.address)).not.to.have.length(0)

  const reserves = await pair.getReserves()
  expect(reserves[0]).to.equal(0)
  expect(reserves[1]).to.equal(0)

  // Provide liquidity with a 1 VVET9 - 20 VTHO exchange rate
  const approval = await energy.connect(god).approve(router.address, constants.MaxUint256)
  await approval.wait()

  const token0Amount = eth(20000) // energy/vtho
  const token1Amount = eth(1000) // vvet9

  const addLiquidityTx = await router.connect(god).addLiquidityETH(
    energy.address, // token
    token0Amount, // amountTokenDesired
    0, // amountTokenMin
    0, // amountETHMin,
    god.address, // to
    constants.MaxUint256, // deadline
    { value: token1Amount, gasLimit: hexlify(9999999) },
  )

  await addLiquidityTx.wait()

  // Validate reserves
  const reserves2 = await pair.getReserves()
  expect(reserves2[0]).to.equal(token0Amount)
  expect(reserves2[1]).to.equal(token1Amount)

  const SWAP_GAS = await trader.SWAP_GAS()
  const MAX_WITHDRAW_AMOUNT = await trader.MAX_WITHDRAW_AMOUNT()
  console.log({ SWAP_GAS })

  // Burn all VET from all test accounts in order to avoid changes
  // in VTHO account balance
  // for (const signer of [god, owner, admin, alice, bob]) {
  //   const signerBalanceVET_0 = await provider.getBalance(signer.address)
  //   const tx = await signer.sendTransaction({
  //     to: constants.AddressZero,
  //     value: signerBalanceVET_0,
  //   })
  //   await tx.wait()
  //   const signerBalanceVET_1 = await provider.getBalance(signer.address)
  //   expect(signerBalanceVET_1).to.equal(0)
  // }

  return {
    god,
    owner,
    admin,
    alice,
    bob,
    energy,
    vvet9,
    factory,
    router,
    pair,
    trader,
    SWAP_GAS,
    MAX_WITHDRAW_AMOUNT,
  }
}
