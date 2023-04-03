const {
  ethers: {
    getSigner,
    getSigners,
    getContractFactory,
    utils: { parseUnits },
    Contract,
    BigNumber: { from: bn },
  },
  network: {
    // config: { vthoAddr, vthoFaucetAddr },
    provider,
  },
} = require("hardhat");
// import { ethers } from "hardhat";
const { expect } = require("chai");
const vthoAbi = require("../abis/ERC20.json");

// const vthoAddr = "0x0000000000000000000000000000456E65726779";
// const vthoFaucetAddr = "0x4f6FC409e1e2D33843Cf4982d414C1Dd0879277e";
const uniAddr = process.env.VEXCHANGE_UNI_ROUTER_ADDRESS; // This will work with a fork of testnet

describe("Greeter contract", function () {
  const VTHO_DECIMALS = 18;

  let faucet, deployer, keeper, alice, bob;
  let vtho;
  let greeter;
  let snapshotId;

  // console.log({ vthoAddr, vthoFaucetAddr });

  before(async () => {
    [faucet, deployer, keeper, alice, bob] = await getSigners();

    // vtho = new Contract(vthoAddr, vthoAbi, owner);
    // make sure to replace the "GoofyGoober" reference with your own ERC-20 name!
    const VTHO = await getContractFactory("VTHO");
    vtho = await VTHO.connect(faucet).deploy();

    console.log("Token address:", vtho.address);
    // darknodeRegistry = new Contract(darknodeRegistryAddr, DarknodeRegistryLogicV1.abi, owner);
    // darknodePayment = new Contract(darknodePaymentAddr, DarknodePayment.abi, owner);

    // console.log({ vtho });
    // expect(await vtho.balanceOf(vthoFaucetAddr)).to.be.above(0);
    // await provider.request({
    //   method: "hardhat_impersonateAccount",
    //   params: [vthoFaucetAddr],
    // });

    // const faucet = await getSigner(vthoFaucetAddr);
    for (const user of [deployer, keeper, alice, bob]) {
      expect(await vtho.balanceOf(user.address)).to.equal(0);

      const amount = parseUnits("500.0", VTHO_DECIMALS);
      await vtho.connect(faucet).transfer(user.address, amount);
      expect(await vtho.balanceOf(user.address)).to.equal(amount);
      console.log({ balanceOf: await vtho.balanceOf(user.address) });
    }

    // await provider.request({
    //   method: "hardhat_stopImpersonatingAccount",
    //   params: [vthoFaucetAddr],
    // });

    const Greeter = await getContractFactory("Greeter");
    greeter = await Greeter.connect(deployer).deploy(vtho.address, uniAddr);
    await greeter.deployed();
    expect(await vtho.balanceOf(greeter.address)).to.equal(0);

    snapshotId = await provider.request({ method: "evm_snapshot", params: [] });
  });

  afterEach(async () => {
    await provider.request({ method: "evm_revert", params: [snapshotId] });
    snapshotId = await provider.request({ method: "evm_snapshot", params: [] });
  });

  it("should set the constructor args to the supplied values", async function () {
    expect(await greeter.owner()).to.equal(deployer.address);
  });

  describe("pull method", function () {
    // [bn(1), POOL_BOND].forEach(amount => {
    // it(`should deposit ${amount.toString()} REN into greeter`, async function () {
    it("should pull VTHO from the user's wallet if allowance is given", async function () {
      const amount = parseUnits("50.0", await vtho.decimals());
      console.log({ amount });
      const aliceBalance = await vtho.balanceOf(alice.address);
      const greeterBalance = await vtho.balanceOf(greeter.address);
      expect(greeterBalance).to.equal(0);
      console.log({ aliceBalance, greeterBalance });

      await vtho.connect(alice).approve(greeter.address, amount);
      await greeter.connect(keeper).pull(alice.address, amount, 20);

      // Veify correct balances
      // expect(await vtho.balanceOf(greeter.address)).to.equal(amount);
      expect(await vtho.balanceOf(alice.address)).to.equal(
        aliceBalance.sub(amount)
      );
      // expect(await greeter.balanceOf(alice.address)).to.equal(amount);
      expect(await vtho.balanceOf(greeter.address)).to.equal(
        greeterBalance.add(amount)
      );
    });
  });
  // });
});
