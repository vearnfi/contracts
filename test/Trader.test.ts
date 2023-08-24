import { ethers } from 'hardhat'
import chai, { expect } from 'chai'
import { solidity } from 'ethereum-waffle'
// import * as factoryArtifact from "@uniswap/v2-core/build/UniswapV2Factory.json";
import * as routerArtifact from '@uniswap/v2-periphery/build/UniswapV2Router02.json'
// import * as pairArtifact from '@uniswap/v2-periphery/build/IUniswapV2Pair.json'
import * as pairArtifact from '../artifacts/contracts/uniswap/v2-core/UniswapV2Pair.sol/UniswapV2Pair.json'
import * as energyArtifact from '../artifacts/contracts/vechain/Energy.sol/Energy.json'
import * as vvet9Artifact from '../artifacts/contracts/vechain/VVET9.sol/VVET9.json'
import { ENERGY_CONTRACT_ADDRESS } from '../constants'

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

describe('Trader', function () {
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

    return { energy, god, owner, admin, alice, bob, vvet9Abi }
  }

  // const VTHO_DECIMALS = 18;

  // let faucet, deployer, keeper, alice, bob;
  // let vtho;
  // let trader;
  // let snapshotId;

  // before(async () => {
  //   [faucet, deployer, keeper, alice, bob] = await ethers.getSigners();

  //   // vtho = new Contract(vthoAddr, vthoAbi, owner);
  //   // make sure to replace the "GoofyGoober" reference with your own ERC-20 name!
  //   const VTHO = await getContractFactory("VTHO");
  //   vtho = await VTHO.connect(faucet).deploy();

  //   console.log("Token address:", vtho.address);
  //   // darknodeRegistry = new Contract(darknodeRegistryAddr, DarknodeRegistryLogicV1.abi, owner);
  //   // darknodePayment = new Contract(darknodePaymentAddr, DarknodePayment.abi, owner);

  //   // console.log({ vtho });
  //   // expect(await vtho.balanceOf(vthoFaucetAddr)).to.be.above(0);
  //   // await provider.request({
  //   //   method: "hardhat_impersonateAccount",
  //   //   params: [vthoFaucetAddr],
  //   // });

  //   // const faucet = await getSigner(vthoFaucetAddr);
  //   for (const user of [deployer, keeper, alice, bob]) {
  //     expect(await vtho.balanceOf(user.address)).to.equal(0);

  //     const amount = parseUnits("500.0", VTHO_DECIMALS);
  //     await vtho.connect(faucet).transfer(user.address, amount);
  //     expect(await vtho.balanceOf(user.address)).to.equal(amount);
  //     console.log({ balanceOf: await vtho.balanceOf(user.address) });
  //   }

  //   // await provider.request({
  //   //   method: "hardhat_stopImpersonatingAccount",
  //   //   params: [vthoFaucetAddr],
  //   // });

  //   const Trader = await getContractFactory("Trader");
  //   trader = await Trader.connect(deployer).deploy(vtho.address, uniAddr);
  //   await trader.deployed();
  //   expect(await vtho.balanceOf(trader.address)).to.equal(0);

  //   snapshotId = await provider.request({ method: "evm_snapshot", params: [] });
  // });

  // afterEach(async () => {
  //   await provider.request({ method: "evm_revert", params: [snapshotId] });
  //   snapshotId = await provider.request({ method: "evm_snapshot", params: [] });
  // });

  it('should set the constructor args to the supplied values', async function () {
    const { energy } = await fixture()
    expect(await energy.name()).to.equal('VeThor')
    expect(await energy.decimals()).to.equal(18)
    expect(await energy.symbol()).to.equal('VTHO')
  })

  // describe("pull method", function () {
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
