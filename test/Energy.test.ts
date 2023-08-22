import { ethers } from "hardhat"
import chai, { expect } from "chai";
import { solidity } from "ethereum-waffle";
import * as energyArtifact from "../artifacts/contracts/Energy.sol/Energy.json";
import { ENERGY_CONTRACT_ADDRESS } from "../constants";

chai.use(solidity);

const { getSigners, Contract } = ethers;

describe("Energy", function () {
  async function fixture() {
    const [god, alice] = await getSigners();
    const energy = new Contract(ENERGY_CONTRACT_ADDRESS, energyArtifact.abi, god);
    return { energy, god, alice };
  }

  it("should set the constructor args to the supplied values", async function () {
    const { energy } = await fixture();
    expect(await energy.name()).to.equal("VeThor");
    expect(await energy.decimals()).to.equal(18);
    expect(await energy.symbol()).to.equal("VTHO");
    expect(await energy.totalSupply()).to.be.gt(0);
  });

  it("should have a positive initial balance for all accounts", async function () {
    const { energy, alice } = await fixture();
    expect(await energy.balanceOf(alice.address)).to.be.gt(0);
  });
});
