import { ethers } from 'hardhat'
import chai, { expect } from 'chai'
import { solidity } from 'ethereum-waffle'
import * as energyArtifact from '../artifacts/contracts/vechain/Energy.sol/Energy.json'
import { ENERGY_CONTRACT_ADDRESS } from '../constants'

chai.use(solidity)

const { getSigners, getContractFactory, Contract, constants } = ethers

describe.skip('Trader.constructor', function () {
  async function fixture() {
    const [god, owner] = await getSigners()

    const energy = new Contract(ENERGY_CONTRACT_ADDRESS, energyArtifact.abi, god)

    const VVET9 = await getContractFactory('VVET9', god)
    const vvet9 = await VVET9.deploy()

    const Factory = await getContractFactory('UniswapV2Factory', god)
    const factory = await Factory.deploy(god.address, vvet9.address)

    const Router = await getContractFactory('UniswapV2Router02', god)
    const router = await Router.deploy(factory.address, vvet9.address)

    return { god, owner, energy, vvet9, factory, router }
  }

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

    await expect(Trader.deploy(constants.AddressZero)).to.be.revertedWith('Trader: router not set')
  })
})
