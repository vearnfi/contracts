import { expect } from 'chai'
import { fixture } from './shared/fixture'
import { expandTo18Decimals } from './shared/expand-to-18-decimals'
import { saveConfig } from './shared/save-config'

describe('Trader.saveConfig', function () {
  it('should revert if reserveBalance is zero', async function () {
    // Arrange
    const { trader, alice } = await fixture()

    // Act + assert
    const reserveBalance = expandTo18Decimals(0)
    await expect(trader.connect(alice).saveConfig(reserveBalance)).to.be.rejectedWith('execution reverted')
  })

  it('should store the value when reserveBalance is valid', async function () {
    // Arrange
    const { trader, alice } = await fixture()

    // Act
    const reserveBalance = expandTo18Decimals(10)
    await saveConfig(trader, alice, reserveBalance)

    // Assert
    expect(await trader.reserves(alice.address)).to.equal(reserveBalance)
  })

  it('should emit a Config event when reserveBalance is valid', async function () {
    // Arrange
    const { trader, alice } = await fixture()

    // Act + assert
    const reserveBalance = expandTo18Decimals(10)
    await expect(trader.connect(alice).saveConfig(reserveBalance))
      .to.emit(trader, 'Config')
      .withArgs(alice.address, reserveBalance)
  })

  it('it supports config of multiple accounts', async function () {
    // Arrange
    const { trader, alice, bob } = await fixture()

    // Act
    const reserveBalanceA = expandTo18Decimals(10)
    await saveConfig(trader, alice, reserveBalanceA)

    const reserveBalanceB = expandTo18Decimals(5)
    await saveConfig(trader, bob, reserveBalanceB)

    // Assert
    expect(await trader.reserves(alice.address)).to.equal(reserveBalanceA)
    expect(await trader.reserves(bob.address)).to.equal(reserveBalanceB)
  })

  it('should be possible to update the config params', async function () {
    // Arrange
    const { trader, alice } = await fixture()
    const reserveBalanceA1 = expandTo18Decimals(10)
    await saveConfig(trader, alice, reserveBalanceA1)

    // Act
    const reserveBalanceA2 = expandTo18Decimals(5)
    await saveConfig(trader, alice, reserveBalanceA2)

    // Assert
    expect(await trader.reserves(alice.address)).to.equal(reserveBalanceA2)
  })

  it('should NOT be possible to update the config params to zero', async function () {
    // Arrange
    const { trader, alice } = await fixture()
    const reserveBalanceA1 = expandTo18Decimals(10)
    await saveConfig(trader, alice, reserveBalanceA1)

    // Act + assert
    const reserveBalanceA2 = expandTo18Decimals(0)
    await expect(saveConfig(trader, alice, reserveBalanceA2)).to.be.rejectedWith('execution reverted')
  })
})
