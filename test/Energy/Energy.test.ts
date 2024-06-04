import { ethers } from 'hardhat'
import { expect } from 'chai'
import { Energy } from '../../typechain-types'
import * as energyArtifact from '../../artifacts/contracts/vechain/Energy.sol/Energy.json'
import { ENERGY_CONTRACT_ADDRESS } from '../../constants'

const { getSigners, Contract } = ethers

describe('Energy', function () {
  async function fixture() {
    const [god, alice] = await getSigners()

    const energy = new Contract(ENERGY_CONTRACT_ADDRESS, energyArtifact.abi, god) // Energy
    const energyAddr = await energy.getAddress()

    return { energy, energyAddr, god, alice }
  }

  it('should set the constructor args to the supplied values', async function () {
    // Arrange
    const { energy, energyAddr } = await fixture()

    // Act + assert
    expect(await energy.name()).to.equal('VeThor')
    expect(await energy.decimals()).to.equal(18)
    expect(await energy.symbol()).to.equal('VTHO')
    expect(await energy.totalSupply()).to.be.gt(0)
    expect(energyAddr).to.equal(ENERGY_CONTRACT_ADDRESS)
  })

  it('should provide a positive initial balance for all test accounts', async function () {
    // Arrange
    const { energy, god, alice } = await fixture()

    // Act + assert
    for (const signer of [god, alice]) {
      expect(await energy.balanceOf(signer.address)).to.be.gt(0)
    }
  })
})
