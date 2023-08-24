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
  utils: { parseUnits, hexlify, FormatTypes },
  Contract,
  ContractFactory,
  BigNumber: { from: bn },
  constants,
} = ethers

describe.skip('Trader.swap', function () {
  async function fixture() {
    const [god, owner, admin, alice, bob] = await getSigners()

    const energy = new Contract(ENERGY_CONTRACT_ADDRESS, energyArtifact.abi, god)

    const VVET9 = await getContractFactory('VVET9', god)
    const vvet9 = await VVET9.deploy()
    const vvet9Abi = VVET9.interface.format(FormatTypes.json) as string

    const Factory = await getContractFactory('UniswapV2Factory', god)
    const factory = await Factory.deploy(god.address, vvet9.address)

    const tx1 = await factory.createPair(energy.address, vvet9.address)
    await tx1.wait()

    const pairAddress = await factory.getPair(energy.address, vvet9.address)

    const pair = new Contract(pairAddress, pairArtifact.abi, god)

    const reserves = await pair.getReserves()
    expect(reserves[0]).to.equal(0)
    expect(reserves[1]).to.equal(0)

    const Router = await getContractFactory('UniswapV2Router02', god)
    const router = await Router.deploy(factory.address, vvet9.address)

    const approval = await energy.connect(god).approve(router.address, constants.MaxUint256)
    await approval.wait()

    // Rate 1 VVET - 20 VTHO
    const token0Amount = parseUnits('2000', 18) // energy
    const token1Amount = parseUnits('100', 18) // vvet

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

    const reserves2 = await pair.getReserves()
    expect(reserves2[0]).to.equal(token0Amount)
    expect(reserves2[1]).to.equal(token1Amount)

    const Trader = await getContractFactory('Trader', owner)
    const trader = await Trader.deploy(router.address)

    return { god, owner, admin, alice, bob, energy, vvet9, factory, router, pair, trader }
  }

  it('should set the constructor args to the supplied values', async function () {
    const { trader, energy, router, owner } = await fixture()
    expect(await trader.vtho()).to.equal(energy.address)
    expect(await trader.router()).to.equal(router.address)
    expect(await trader.owner()).to.equal(owner.address)
  })

  it('should revert is router address is not provided', async function () {
    const { trader } = await fixture()
    expect(await trader.vtho()).to.equal(energy.address)
    expect(await trader.router()).to.equal(router.address)
    expect(await trader.owner()).to.equal(owner.address)
  })
  // describe("Swap method", function () {
  //   // [bn(1), POOL_BOND].forEach(amount => {
  //   // it(`should deposit ${amount.toString()} REN into greeter`, async function () {
  //   it("should pull VTHO from the user's wallet if allowance is given", async function () {
  //     const amount = parseUnits("50.0", await vtho.decimals());
  //     console.log({ amount });
  //     const aliceBalance = await vtho.balanceOf(alice.address);
  //     const greeterBalance = await vtho.balanceOf(trader.address);
  //     expect(greeterBalance).to.equal(0);
  //     console.log({ aliceBalance, greeterBalance });

  //     await vtho.connect(alice).approve(trader.address, amount);
  //     await trader.connect(keeper).pull(alice.address, amount, 20);

  //     // Veify correct balances
  //     // expect(await vtho.balanceOf(greeter.address)).to.equal(amount);
  //     expect(await vtho.balanceOf(alice.address)).to.equal(
  //       aliceBalance.sub(amount)
  //     );
  //     // expect(await greeter.balanceOf(alice.address)).to.equal(amount);
  //     expect(await vtho.balanceOf(trader.address)).to.equal(
  //       greeterBalance.add(amount)
  //     );
  //   });
  // });
  // });
})
