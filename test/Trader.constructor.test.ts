import { ethers } from 'hardhat'
import { expect } from 'chai'
import { fixture } from './shared/fixture'
import { SUPPORTED_DEXS_COUNT } from '../constants'

const { getContractFactory, ZeroAddress } = ethers

describe('Trader.constructor', function () {
  it('should set the constructor args to the supplied values', async function () {
    // Arrange
    const { energyAddr, vvet9Addr, routersAddr, owner } = await fixture()

    // Act
    const Trader = await getContractFactory('Trader', owner)
    const trader = await Trader.deploy(vvet9Addr, routersAddr as [Address, Address])

    // Assert
    expect(await trader.vtho()).to.equal(energyAddr)
    for (let i = 0; i < SUPPORTED_DEXS_COUNT; i++) {
      expect(await trader.routers(i)).to.equal(routersAddr[i])
    }
    expect(await trader.owner()).to.equal(owner.address)
    expect(await trader.admin()).to.equal(ZeroAddress)
    expect(await trader.feeMultiplier()).to.equal(30)
    expect(await trader.baseGasPrice()).to.equal(BigInt(1e15))
    expect(await trader.vvet()).to.equal(vvet9Addr)
  })

  it('should revert if routers address is not provided', async function () {
    // Arrange
    const { vvet9Addr, owner } = await fixture()

    // Act
    const Trader = await getContractFactory('Trader', owner)

    // Assert
    await expect(Trader.deploy(vvet9Addr)).to.be.rejectedWith('incorrect number of arguments to constructor')
  })
})
