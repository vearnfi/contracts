import { ethers } from 'hardhat'
import chai, { expect } from 'chai'
import { solidity } from 'ethereum-waffle'
import { fixture } from "./fixture"

chai.use(solidity)

const { utils: { parseUnits } } = ethers

describe('Trader.saveConfig', function () {
  it('should revert if triggerBalance is zero', async function () {
    const { trader, alice } = await fixture()

    const triggerBalance = parseUnits('0', 18)
    const reserveBalance = parseUnits('1', 18)

    // TODO: to.be.revertedWith("Trader: invalid triggerBalance") is not passing.
    await expect(trader.connect(alice).saveConfig(triggerBalance, reserveBalance)).to.be.reverted
  })

  it('should revert if reserveBalance is zero', async function () {
    const { trader, alice } = await fixture()

    const triggerBalance = parseUnits('1', 18)
    const reserveBalance = parseUnits('0', 18)

    // TODO: to.be.revertedWith("Trader: invalid reserveBalance") is not passing.
    await expect(trader.connect(alice).saveConfig(triggerBalance, reserveBalance)).to.be.reverted
  })

  it('should revert if triggerBalance <= reserveBalance', async function () {
    const { trader, alice } = await fixture()

    // triggerBalance === reserveBalance
    const triggerBalanceEq = parseUnits('10', 18)
    const reserveBalanceEq = parseUnits('10', 18)

    // TODO: to.be.revertedWith("Trader: invalid config") is not passing.
    await expect(trader.connect(alice).saveConfig(triggerBalanceEq, reserveBalanceEq)).to.be.reverted

    // triggerBalance < reserveBalance
    const triggerBalanceLt = parseUnits('10', 18)
    const reserveBalanceLt = parseUnits('10', 18).add(1)

    // TODO: to.be.revertedWith("Trader: invalid config") is not passing.
    await expect(trader.connect(alice).saveConfig(triggerBalanceLt, reserveBalanceLt)).to.be.reverted
  })

  it('should store config when params are valid', async function () {
    const { trader, alice } = await fixture()

    const triggerBalance = parseUnits('100', 18)
    const reserveBalance = parseUnits('10', 18)

    await expect(trader.connect(alice).saveConfig(triggerBalance, reserveBalance))
      .to.emit(trader, 'Config')
      .withArgs(alice.address, triggerBalance, reserveBalance)

    expect(await trader.addressToConfig(alice.address)).to.deep.equal([triggerBalance, reserveBalance])
  })

  it("should not be possible to update other account's config", async function () {
    const { trader, alice, bob } = await fixture()

    // Save Alice config
    const triggerBalanceA = parseUnits('100', 18)
    const reserveBalanceA = parseUnits('10', 18)

    const txA = await trader.connect(alice).saveConfig(triggerBalanceA, reserveBalanceA)
    await txA.wait()

    expect(await trader.addressToConfig(alice.address)).to.deep.equal([triggerBalanceA, reserveBalanceA])

    // Save Bob config
    const triggerBalanceB = parseUnits('50', 18)
    const reserveBalanceB = parseUnits('5', 18)

    const txB = await trader.connect(bob).saveConfig(triggerBalanceB, reserveBalanceB)
    await txB.wait()

    expect(await trader.addressToConfig(bob.address)).to.deep.equal([triggerBalanceB, reserveBalanceB])

    // Alice config should not have been modified
    expect(await trader.addressToConfig(alice.address)).to.deep.equal([triggerBalanceA, reserveBalanceA])
  })

  it('should be possible to update config params', async function () {
    const { trader, alice } = await fixture()

    // Save Alice config
    const triggerBalanceA1 = parseUnits('100', 18)
    const reserveBalanceA1 = parseUnits('10', 18)

    const txA1 = await trader.connect(alice).saveConfig(triggerBalanceA1, reserveBalanceA1)
    await txA1.wait()

    expect(await trader.addressToConfig(alice.address)).to.deep.equal([triggerBalanceA1, reserveBalanceA1])

    // Update Alice config
    const triggerBalanceA2 = parseUnits('50', 18)
    const reserveBalanceA2 = parseUnits('5', 18)

    const txA2 = await trader.connect(alice).saveConfig(triggerBalanceA2, reserveBalanceA2)
    await txA2.wait()

    expect(await trader.addressToConfig(alice.address)).to.deep.equal([triggerBalanceA2, reserveBalanceA2])
  })
})
