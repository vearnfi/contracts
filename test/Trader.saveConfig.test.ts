import { expect } from 'chai'
import { fixture } from './shared/fixture'
import { expandTo18Decimals } from './shared/expand-to-18-decimals'
import { saveConfig } from './shared/save-config'

describe('Trader.saveConfig', function () {
  it('should revert if reserveBalance is zero', async function () {
    const { trader, alice } = await fixture()

    const reserveBalance = expandTo18Decimals(0)

    await expect(trader.connect(alice).saveConfig(reserveBalance)).to.be.rejectedWith("execution reverted")
  })

  it('should store the value when reserveBalance is valid', async function () {
    const { trader, alice } = await fixture()

    const reserveBalance = expandTo18Decimals(10)

    await saveConfig(trader, alice, reserveBalance)

    expect(await trader.reserves(alice.address)).to.equal(reserveBalance)
  })

  it('should emit a Config event when reserveBalance is valid', async function () {
    const { trader, alice } = await fixture()

    const reserveBalance = expandTo18Decimals(10)

    await expect(trader.connect(alice).saveConfig(reserveBalance))
      .to.emit(trader, 'Config')
      .withArgs(alice.address, reserveBalance)
  })

  it("should not be possible to update other account's config", async function () {
    const { trader, alice, bob } = await fixture()

    // Save Alice's config
    const reserveBalanceA = expandTo18Decimals(10)

    await saveConfig(trader, alice, reserveBalanceA)

    expect(await trader.reserves(alice.address)).to.equal(reserveBalanceA)

    // Save Bob's config
    const reserveBalanceB = expandTo18Decimals(5)

    await saveConfig(trader, bob, reserveBalanceB)

    // Alice config should not have been modified
    expect(await trader.reserves(alice.address)).to.equal(reserveBalanceA)
  })

  it('should be possible to update config params', async function () {
    const { trader, alice } = await fixture()

    // Save Alice config
    const reserveBalanceA1 = expandTo18Decimals(10)

    await saveConfig(trader, alice, reserveBalanceA1)

    // Update Alice config
    const reserveBalanceA2 = expandTo18Decimals(5)

    await saveConfig(trader, alice, reserveBalanceA2)

    expect(await trader.reserves(alice.address)).to.equal(reserveBalanceA2)
  })
})
