import { ethers } from 'hardhat'
import chai, { expect } from 'chai'
import { solidity } from 'ethereum-waffle'
import { fixture } from './shared/fixture'

chai.use(solidity)

const { getContractFactory, constants } = ethers

describe('Trader.constructor', function () {
  it('should set the constructor args to the supplied values', async function () {
    const { energy, router, owner } = await fixture()

    const Trader = await getContractFactory('Trader', owner)
    const trader = await Trader.deploy(router.address)

    expect(await trader.vtho()).to.equal(energy.address)
    expect(await trader.router()).to.equal(router.address)
    expect(await trader.owner()).to.equal(owner.address)
  })

  it('should revert if router address is not provided', async function () {
    const { owner } = await fixture()

    const Trader = await getContractFactory('Trader', owner)

    await expect(Trader.deploy(constants.AddressZero)).to.be.reverted
  })
})
