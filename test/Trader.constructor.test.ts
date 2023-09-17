import { ethers } from 'hardhat'
import chai, { expect } from 'chai'
import { solidity } from 'ethereum-waffle'
import { fixture } from './shared/fixture'
import { SUPPORTED_DEXS_COUNT } from '../constants'

chai.use(solidity)

const { getContractFactory, constants } = ethers

describe('Trader.constructor', function () {
  it('should set the constructor args to the supplied values', async function () {
    const { energy, routers, owner } = await fixture()

    const Trader = await getContractFactory('Trader', owner)
    const trader = await Trader.deploy(routers.map((router) => router.address))

    expect(await trader.vtho()).to.equal(energy.address)
    for (let i = 0; i < SUPPORTED_DEXS_COUNT; i++) {
      expect(await trader.routers(i)).to.equal(routers[i].address)
    }
    expect(await trader.owner()).to.equal(owner.address)
    expect(await trader.admin()).to.equal(constants.AddressZero)
    expect(await trader.feeMultiplier()).to.equal(30)
  })

  it('should revert if router address is not provided', async function () {
    const { owner } = await fixture()

    const Trader = await getContractFactory('Trader', owner)

    await expect(Trader.deploy(new Array(SUPPORTED_DEXS_COUNT).fill(constants.AddressZero))).to.be.reverted
  })
})
