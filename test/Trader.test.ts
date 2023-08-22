import { ethers } from "hardhat"
// const {
//   ethers: {
//     getSigner,
//     getSigners,
//     getContractFactory,
//     utils: { parseUnits },
//     Contract,
//     BigNumber: { from: bn },
//   },
//   network: {
//     // config: { vthoAddr, vthoFaucetAddr },
//     provider,
//   },
// } = require("hardhat");
// import { ethers } from "hardhat";
const { expect } = require("chai");
// const vthoAbi = require("../abis/ERC20.json");

// const vthoAddr = "0x0000000000000000000000000000456E65726779";
// const vthoFaucetAddr = "0x4f6FC409e1e2D33843Cf4982d414C1Dd0879277e";
// const uniAddr = process.env.VEROCKET_UNI_ROUTER_ADDRESS; // This will work with a fork of testnet

import * as VVET9Artifact from "../artifacts/contracts/VVET9.sol/VVET9.json";
import * as factoryArtifact from "@uniswap/v2-core/build/UniswapV2Factory.json";
import * as routerArtifact from "@uniswap/v2-periphery/build/UniswapV2Router02.json";
import * as pairArtifact from "@uniswap/v2-periphery/build/IUniswapV2Pair.json";

describe("Trader", function () {
  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshot in every test.
  async function deploy() {
    // Contracts are deployed using the first signer/account by default
    const [faucet, uniOwner, traderOwner, admin, alice, bob] = await ethers.getSigners();

    const balance = await ethers.provider.getBalance(uniOwner.address);
console.log({ balance });


    const Factory = new ethers.ContractFactory(factoryArtifact.abi, factoryArtifact.bytecode, uniOwner);
    const factory = await Factory.deploy(uniOwner.address);
    await factory.deployed();
    console.log({factory: factory.address})

    const Energy = await ethers.getContractFactory("Energy");
    const energy = await Energy.deploy();
    const energyAbi = Energy.interface.format(ethers.utils.FormatTypes.json) as string;
    await energy.deployed();
    console.log({energy: energy.address});

    const VVET9 = await ethers.getContractFactory("VVET9");
    const vvet9 = await VVET9.deploy();
    const vvet9Abi = VVET9.interface.format(ethers.utils.FormatTypes.json) as string;
    await vvet9.deployed();
    console.log({vvet9: vvet9.address});

    // TODO: mock VVET9 in order to be able to get some funds? Or try finding the VVET9 address
    // on devnet

    const tx1 = await factory.createPair(energy.address, vvet9.address);
    await tx1.wait();

    const pairAddress = await factory.getPair(energy.address, vvet9.address);
    console.log({pairAddress})

    const pair = new ethers.Contract(pairAddress, pairArtifact.abi, uniOwner);

    return { energy, faucet, uniOwner, traderOwner, admin, alice, bob, energyAbi, vvet9Abi };
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
    const { energy } = await deploy();
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
