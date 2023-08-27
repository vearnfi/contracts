import { ethers } from 'hardhat'
import chai, { expect } from 'chai'
import { solidity } from 'ethereum-waffle'
import { ENERGY_CONTRACT_ADDRESS } from '../constants'
import * as pairArtifact from '../artifacts/contracts/uniswap/v2-core/UniswapV2Pair.sol/UniswapV2Pair.json'
import * as energyArtifact from '../artifacts/contracts/vechain/Energy.sol/Energy.json'

chai.use(solidity)

const {
  getSigner,
  getSigners,
  getContractFactory,
  utils: { parseUnits, formatUnits, hexlify, FormatTypes },
  Contract,
  ContractFactory,
  BigNumber,
  constants,
  provider,
} = ethers

describe('Trader.swap', function () {
  async function fixture() {
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

    // Create pair
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

    const Trader = await getContractFactory('Trader', owner)
    const trader = await Trader.deploy(router.address)

    return { god, owner, admin, alice, bob, energy, vvet9, factory, router, pair, trader }
  }

  it('should swap VTHO for VET', async function () {
    const { energy, trader, admin, alice, bob } = await fixture()

    // const amount = parseUnits("50", await vtho.decimals());
    // console.log({ amount });
    const aliceVET0 = await provider.getBalance(alice.address)
    const aliceVTHO0: typeof BigNumber = await energy.balanceOf(alice.address)
    console.log({ aliceVTHO0, format: formatUnits(aliceVTHO0.toString(), 18) })

    const tx1 = await energy.connect(alice).approve(trader.address, constants.MaxUint256)
    await tx1.wait()
    console.log('APPROVE')

    const tx2 = await trader.connect(alice).saveConfig(parseUnits('50', 18), parseUnits('5', 18))
    await tx2.wait()
    console.log('SAVE CONFIG')

    //================
    // const amount = parseUnits('1000', 18)
    // console.log({ amount, format: formatUnits(amount.toString(), 18) })

    // // Burn some tokens to get a fixed VTHO balance
    // const tx0 = await energy.connect(alice).transfer(constants.AddressZero, aliceVTHO0.sub(amount))
    // await tx0.wait()

    // const aliceVTHO1: typeof BigNumber = await energy.balanceOf(alice.address)
    // console.log({ afterBurnBalance: aliceVTHO1, format: formatUnits(aliceVTHO1.toString(), 18) })

    // // expect(aliceVTHO1).to.equal(amount)
    // console.log('BURNT')
    //================

    const tx3 = await trader.connect(admin).swap(alice.address, 100)
    await tx3.wait()
    console.log('SWAP')

    const aliceVET1 = await provider.getBalance(alice.address)
    // Veify correct balances
    // expect(await vtho.balanceOf(greeter.address)).to.equal(amount);
    expect(aliceVET1).to.be.gt(aliceVET0)

    console.log({ aliceVET0, aliceVET1 })
    // // expect(await greeter.balanceOf(alice.address)).to.equal(amount);
    // expect(await vtho.balanceOf(trader.address)).to.equal(
    //   greeterBalance.add(amount)
    // );
  })

  // TODO: test fees
})
