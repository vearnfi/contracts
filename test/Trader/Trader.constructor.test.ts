import { ethers } from 'hardhat'
import { expect } from 'chai'
import { fixture } from './shared/fixture'

const { getContractFactory } = ethers

describe('Trader.constructor', function () {
  it('should set the constructor args to the supplied values', async function () {
    // Arrange
    const { energyAddr, verocket, vexWrapperAddr, owner } = await fixture()

    // Act
    const Trader = await getContractFactory('Trader', owner)
    const trader = await Trader.deploy([verocket.routerAddr, vexWrapperAddr] as [Address, Address])

    // Assert
    expect(await trader.FEE_PRECISION()).to.equal(10_000)
    expect(await trader.MAX_FEE_MULTIPLIER()).to.equal(30)
    expect(await trader.vtho()).to.equal(energyAddr)
    expect(await trader.routers(0)).to.equal(verocket.routerAddr)
    expect(await trader.routers(1)).to.equal(vexWrapperAddr)
    expect(await trader.isOwner(owner.address)).to.equal(true)
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
