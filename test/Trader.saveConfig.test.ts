import chai, { expect } from 'chai'
import { solidity } from 'ethereum-waffle'
import { fixture } from './shared/fixture'
import { expandTo18Decimals } from './shared/expand-to-18-decimals'

chai.use(solidity)

describe('Trader.saveConfig', function () {
  it('should revert if triggerBalance is zero', async function () {
    const { trader, alice } = await fixture()

    const triggerBalance = expandTo18Decimals(0)
    const reserveBalance = expandTo18Decimals(1)

    // TODO: to.be.revertedWith("Trader: invalid triggerBalance") is not passing.
    await expect(trader.connect(alice).saveConfig(triggerBalance, reserveBalance)).to.be.reverted
  })

  it('should revert if reserveBalance is zero', async function () {
    const { trader, alice } = await fixture()

    const triggerBalance = expandTo18Decimals(1)
    const reserveBalance = expandTo18Decimals(0)

    // TODO: to.be.revertedWith("Trader: invalid reserveBalance") is not passing.
    await expect(trader.connect(alice).saveConfig(triggerBalance, reserveBalance)).to.be.reverted
  })

  it('should revert if triggerBalance <= reserveBalance', async function () {
    const { trader, alice } = await fixture()

    // triggerBalance === reserveBalance
    const triggerBalanceEq = expandTo18Decimals(10)
    const reserveBalanceEq = expandTo18Decimals(10)

    // TODO: to.be.revertedWith("Trader: invalid config") is not passing.
    await expect(trader.connect(alice).saveConfig(triggerBalanceEq, reserveBalanceEq)).to.be.reverted

    // triggerBalance < reserveBalance
    const triggerBalanceLt = expandTo18Decimals(10)
    const reserveBalanceLt = expandTo18Decimals(10).add(1)

    // TODO: to.be.revertedWith("Trader: invalid config") is not passing.
    await expect(trader.connect(alice).saveConfig(triggerBalanceLt, reserveBalanceLt)).to.be.reverted
  })

  it('should store config when params are valid', async function () {
    const { trader, alice } = await fixture()

    const triggerBalance = expandTo18Decimals(100)
    const reserveBalance = expandTo18Decimals(10)

    await expect(trader.connect(alice).saveConfig(triggerBalance, reserveBalance))
      .to.emit(trader, 'Config')
      .withArgs(alice.address, triggerBalance, reserveBalance)

    expect(await trader.addressToConfig(alice.address)).to.deep.equal([triggerBalance, reserveBalance])
  })

  it("should not be possible to update other account's config", async function () {
    const { trader, alice, bob } = await fixture()

    // Save Alice config
    const triggerBalanceA = expandTo18Decimals(100)
    const reserveBalanceA = expandTo18Decimals(10)

    const txA = await trader.connect(alice).saveConfig(triggerBalanceA, reserveBalanceA)
    await txA.wait()

    expect(await trader.addressToConfig(alice.address)).to.deep.equal([triggerBalanceA, reserveBalanceA])

    // Save Bob config
    const triggerBalanceB = expandTo18Decimals(50)
    const reserveBalanceB = expandTo18Decimals(5)

    const txB = await trader.connect(bob).saveConfig(triggerBalanceB, reserveBalanceB)
    await txB.wait()

    expect(await trader.addressToConfig(bob.address)).to.deep.equal([triggerBalanceB, reserveBalanceB])

    // Alice config should not have been modified
    expect(await trader.addressToConfig(alice.address)).to.deep.equal([triggerBalanceA, reserveBalanceA])
  })

  it('should be possible to update config params', async function () {
    const { trader, alice } = await fixture()

    // Save Alice config
    const triggerBalanceA1 = expandTo18Decimals(100)
    const reserveBalanceA1 = expandTo18Decimals(10)

    const txA1 = await trader.connect(alice).saveConfig(triggerBalanceA1, reserveBalanceA1)
    await txA1.wait()

    expect(await trader.addressToConfig(alice.address)).to.deep.equal([triggerBalanceA1, reserveBalanceA1])

    // Update Alice config
    const triggerBalanceA2 = expandTo18Decimals(50)
    const reserveBalanceA2 = expandTo18Decimals(5)

    const txA2 = await trader.connect(alice).saveConfig(triggerBalanceA2, reserveBalanceA2)
    await txA2.wait()

    expect(await trader.addressToConfig(alice.address)).to.deep.equal([triggerBalanceA2, reserveBalanceA2])
  })
})
