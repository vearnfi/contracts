import { ethers } from 'hardhat'
import { expect } from 'chai'
import { fixture } from './shared/fixture'
import { SUPPORTED_DEXS_COUNT } from '../constants'

const { getContractFactory, ZeroAddress } = ethers

describe('Trader.constructor', function () {
  it('should set the constructor args to the supplied values', async function () {
    // Arrange
    const { energyAddr, routersAddr, owner } = await fixture()

    // Act
    const Trader = await getContractFactory('Trader', owner)
    const trader = await Trader.deploy(routersAddr as [Address, Address])

    // Assert
    expect(await trader.vtho()).to.equal(energyAddr)
    for (let i = 0; i < SUPPORTED_DEXS_COUNT; i++) {
      expect(await trader.routers(i)).to.equal(routersAddr[i])
    }
    expect(await trader.owner()).to.equal(owner.address)
    expect(await trader.admin()).to.equal(ZeroAddress)
    expect(await trader.feeMultiplier()).to.equal(30)
    expect(await trader.baseGasPrice()).to.equal(BigInt(1e15))
  })

  it('should revert if routers address is not provided', async function () {
    // Arrange
    const { owner } = await fixture()

    // Act
    const Trader = await getContractFactory('Trader', owner)

    // Assert
    await expect(Trader.deploy()).to.be.rejectedWith('incorrect number of arguments to constructor')
  })
})
