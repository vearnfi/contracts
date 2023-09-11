import { ethers } from 'hardhat'
import type { BigNumber, ContractReceipt } from 'ethers'
import type { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import chai, { expect } from 'chai'
import { solidity } from 'ethereum-waffle'
import { ENERGY_CONTRACT_ADDRESS } from '../../constants'
import * as pairArtifact from '../../artifacts/contracts/uniswap/v2-core/UniswapV2Pair.sol/UniswapV2Pair.json'
import * as energyArtifact from '../../artifacts/contracts/vechain/Energy.sol/Energy.json'

chai.use(solidity)

const {
  getSigners,
  getContractFactory,
  utils: { parseUnits, hexlify },
  BigNumber: { from: bn },
  Contract,
  constants,
  provider,
} = ethers

export async function fixture() {
  const [god, owner, admin, alice, bob] = await getSigners()

  const energy = new Contract(ENERGY_CONTRACT_ADDRESS, energyArtifact.abi, god)

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

  // Provide liquidity for the VVET-VTHO pool
  const tx1 = await factory.createPair(energy.address, vvet9.address)
  await tx1.wait()

  const pairAddress = await factory.getPair(energy.address, vvet9.address)

  const pair = new Contract(pairAddress, pairArtifact.abi, god)

  expect(await provider.getCode(pair.address)).not.to.have.length(0)

  const reserves = await pair.getReserves()
  expect(reserves[0]).to.equal(0)
  expect(reserves[1]).to.equal(0)

  // Add liquidity
  const approval = await energy.connect(god).approve(router.address, constants.MaxUint256)
  await approval.wait()

  // Rate 1 VVET - 20 VTHO
  const token0Amount = parseUnits('20000', 18) // energy
  const token1Amount = parseUnits('1000', 18) // vvet

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

  // Validate updated reserves
  const reserves2 = await pair.getReserves()
  expect(reserves2[0]).to.equal(token0Amount)
  expect(reserves2[1]).to.equal(token1Amount)

  const SWAP_GAS = (await trader.SWAP_GAS()) as BigNumber
  const MAX_VTH0_WITHDRAW_AMOUNT = (await trader.MAX_VTHO_WITHDRAWAL_AMOUNT()) as BigNumber
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
  //   expect(signerBalanceVET_1).to.eq(0)
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
    MAX_VTH0_WITHDRAW_AMOUNT,
  }
}
