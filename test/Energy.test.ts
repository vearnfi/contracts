import { ethers } from 'hardhat'
import chai, { expect } from 'chai'
import { solidity } from 'ethereum-waffle'
import { Energy } from '../typechain-types'
import * as energyArtifact from '../artifacts/contracts/vechain/Energy.sol/Energy.json'
import { ENERGY_CONTRACT_ADDRESS } from '../constants'

chai.use(solidity)

const { getSigners, Contract } = ethers

describe('Energy', function () {
  async function fixture() {
    const [god, alice] = await getSigners()

    const energy = new Contract(ENERGY_CONTRACT_ADDRESS, energyArtifact.abi, god) as Energy

    return { energy, god, alice }
  }

  it('should set the constructor args to the supplied values', async function () {
    const { energy } = await fixture()

    expect(await energy.name()).to.equal('VeThor')
    expect(await energy.decimals()).to.equal(18)
    expect(await energy.symbol()).to.equal('VTHO')
    expect(await energy.totalSupply()).to.be.gt(0)
  })

  it('should provide a positive initial balance for all test accounts', async function () {
    const { energy, god, alice } = await fixture()

    for (const signer of [god, alice]) {
      expect(await energy.balanceOf(signer.address)).to.be.gt(0)
    }
  })
})
