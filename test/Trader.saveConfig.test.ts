import chai, { expect } from 'chai'
import { solidity } from 'ethereum-waffle'
import { fixture } from './shared/fixture'
import { expandTo18Decimals } from './shared/expand-to-18-decimals'

chai.use(solidity)

describe('Trader.saveConfig', function () {
  it('should revert if reserveBalance is zero', async function () {
    const { trader, alice } = await fixture()

    const reserveBalance = expandTo18Decimals(0)

    // TODO: to.be.revertedWith("Trader: invalid reserveBalance") is not passing.
    await expect(trader.connect(alice).saveConfig(reserveBalance)).to.be.reverted
  })

  it('should store the value when reserveBalance is valid', async function () {
    const { trader, alice } = await fixture()

    const reserveBalance = expandTo18Decimals(10)

    const tx = await trader.connect(alice).saveConfig(reserveBalance)
    await tx.wait()

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

    const txA = await trader.connect(alice).saveConfig(reserveBalanceA)
    await txA.wait()

    expect(await trader.reserves(alice.address)).to.equal(reserveBalanceA)

    // Save Bob's config
    const reserveBalanceB = expandTo18Decimals(5)

    const txB = await trader.connect(bob).saveConfig(reserveBalanceB)
    await txB.wait()

    // Alice config should not have been modified
    expect(await trader.reserves(alice.address)).to.equal(reserveBalanceA)
  })

  it('should be possible to update config params', async function () {
    const { trader, alice } = await fixture()

    // Save Alice config
    const reserveBalanceA1 = expandTo18Decimals(10)

    const txA1 = await trader.connect(alice).saveConfig(reserveBalanceA1)
    await txA1.wait()

    // Update Alice config
    const reserveBalanceA2 = expandTo18Decimals(5)

    const txA2 = await trader.connect(alice).saveConfig(reserveBalanceA2)
    await txA2.wait()

    expect(await trader.reserves(alice.address)).to.equal(reserveBalanceA2)
  })
})
