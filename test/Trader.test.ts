import { ethers, network } from "hardhat"
import chai, { expect } from "chai";
import { solidity } from "ethereum-waffle";
import * as factoryArtifact from "@uniswap/v2-core/build/UniswapV2Factory.json";
import * as routerArtifact from "@uniswap/v2-periphery/build/UniswapV2Router02.json";
import * as pairArtifact from "@uniswap/v2-periphery/build/IUniswapV2Pair.json";
import * as energyArtifact from "../artifacts/contracts/Energy.sol/Energy.json";
import * as vvet9Artifact from "../artifacts/contracts/VVET9.sol/VVET9.json";
import { ENERGY_CONTRACT_ADDRESS } from "../constants";

chai.use(solidity);

const {
    getSigner,
    getSigners,
    getContractFactory,
    utils: { parseUnits, FormatTypes },
    Contract,
    ContractFactory,
    BigNumber: { from: bn },
} = ethers;


describe("Trader", function () {
  async function fixture() {
    const [god, owner, admin, alice, bob] = await getSigners();

    const energy = new Contract(ENERGY_CONTRACT_ADDRESS, energyArtifact.abi, god);
console.log({energy: energy.address});

    const Factory = new ContractFactory(factoryArtifact.abi, factoryArtifact.bytecode, god);
    const factory = await Factory.deploy(god.address);
    await factory.deployed();
console.log({factory: factory.address});

    const VVET9 = await getContractFactory("VVET9");
    const vvet9 = await VVET9.deploy();
    const vvet9Abi = VVET9.interface.format(FormatTypes.json) as string;
    await vvet9.deployed();
console.log({vvet9: vvet9.address});

    for (const user of [owner, admin, alice, bob]) {
      const amount = parseUnits("50", 18);
      await vvet9.connect(user).deposit({ value: amount });
    }
    console.log('VVET done')

    console.log(energy.address, vvet9.address)
    const tx1 = await factory.createPair(energy.address, vvet9.address);
    const receipt = await tx1.wait();
    console.log("TX1 DONE", receipt);


    // const pairAddress = await factory.getPair(energy.address, vvet9.address);
    const pairAddress = await factory.allPairs(0);
    console.log({pairAddress})

    const pair = new Contract(pairAddress, pairArtifact.abi, god);

    const reserves = await pair.getReserves();
    console.log({reserves})
    expect(reserves[0].toNumber()).to.equal(0);
    expect(reserves[1].toNumber()).to.equal(0);


    return { energy, god, owner, admin, alice, bob, vvet9Abi };
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

  it("should set the constructor args to the supplied values", async function () {
    const { energy } = await fixture();
    expect(await energy.name()).to.equal("VeThor");
    expect(await energy.decimals()).to.equal(18);
    expect(await energy.symbol()).to.equal("VTHO");
  });

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
});
