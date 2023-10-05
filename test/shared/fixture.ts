import { ethers } from 'hardhat'
import chai, { expect } from 'chai'
import { solidity } from 'ethereum-waffle'
import { ENERGY_CONTRACT_ADDRESS, SUPPORTED_DEXS_COUNT } from '../../constants'
import { Energy, UniswapV2Factory, UniswapV2Pair, UniswapV2Router02 } from '../../typechain-types'
import * as pairArtifact from '../../artifacts/contracts/uniswap/v2-core/UniswapV2Pair.sol/UniswapV2Pair.json'
import * as energyArtifact from '../../artifacts/contracts/vechain/Energy.sol/Energy.json'
import { expandTo18Decimals } from './expand-to-18-decimals'
import { approveEnergy } from './approve-energy'

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

  const factories: UniswapV2Factory[] = []
  const routers: UniswapV2Router02[] = [] // TODO: typescript enforce length = 2

  for (let i = 0; i < SUPPORTED_DEXS_COUNT; i++) {
    const Factory = await getContractFactory('UniswapV2Factory', god)
    const factory = await Factory.deploy(god.address, vvet9.address)

    expect(await provider.getCode(factory.address)).not.to.have.length(0)

    const Router = await getContractFactory('UniswapV2Router02', god)
    const router = await Router.deploy(factory.address, vvet9.address)

    expect(await provider.getCode(router.address)).not.to.have.length(0)

    factories.push(factory)
    routers.push(router)
  }

  const Trader = await getContractFactory('Trader', owner)
  const trader = await Trader.deploy(routers.map((router) => router.address) as [Address, Address])

  expect(await provider.getCode(trader.address)).not.to.have.length(0)

  // Set Trader contract admin
  expect(await trader.admin()).to.equal(constants.AddressZero)

  const tx0 = await trader.connect(owner).setAdmin(admin.address)
  await tx0.wait()

  expect(await trader.admin()).to.equal(admin.address)

  for (let i = 0; i < SUPPORTED_DEXS_COUNT; i++) {
    const factory = factories[i]
    const router = routers[i]

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
    await approveEnergy(energy, god, router.address, constants.MaxUint256)

    const token0Amount = expandTo18Decimals(20000) // energy/vtho
    const token1Amount = expandTo18Decimals(1000) // vvet9

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
  }

  const SWAP_GAS = await trader.SWAP_GAS()
  const MAX_WITHDRAW_AMOUNT = await trader.MAX_WITHDRAW_AMOUNT()

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
    factories,
    routers,
    // pair,
    trader,
    SWAP_GAS,
    MAX_WITHDRAW_AMOUNT,
  }
}
