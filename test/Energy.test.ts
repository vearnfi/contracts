import { ethers } from "hardhat"
const { expect } = require("chai");

describe("Energy", function () {
  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshot in every test.
  async function deploy() {
    // Contracts are deployed using the first signer/account by default
    const [faucet, owner, admin, alice, bob] = await ethers.getSigners();

    const Energy = await ethers.getContractFactory("Energy");
    const energy = await Energy.deploy();
    const abi = Energy.interface.format(ethers.utils.FormatTypes.json) as string;
    await energy.deployed();

    return { energy, faucet, owner, admin, alice, bob, abi };
  }

  it("should set the constructor args to the supplied values", async function () {
    const { energy } = await deploy();
    expect(await energy.name()).to.equal("VeThor");
    expect(await energy.decimals()).to.equal(18);
    expect(await energy.symbol()).to.equal("VTHO");
  });
});
