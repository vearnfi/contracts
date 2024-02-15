import { expect } from 'chai'
import { fixture } from './shared/fixture'
import { setFeeMultiplier } from './shared/set-fee-multiplier'

// TODO: research how other protocols set the fee
describe('Trader.setFeeMultiplier', function () {
  it('should have a max fee multiplier when contract is deployed', async function () {
    // Arrange
    const { trader } = await fixture()

    // Act

    // Assert
    expect(await trader.feeMultiplier()).to.equal(30)
  })

  it('should set a new fee multiplier if called by the owner', async function () {
    // Arrange
    const { trader, owner } = await fixture()
    const initialFee = await trader.feeMultiplier() // 30
    const newFee = initialFee - BigInt(5)

    // Act
    await setFeeMultiplier(trader, owner, newFee)

    // Assert
    expect(await trader.feeMultiplier()).to.equal(newFee)
  })

  it('should revert if called by any account other than the owner', async function () {
    // Arrange
    const { trader, admin, alice } = await fixture()

    // Act + assert
    const newFee = BigInt(25)
    for (const signer of [alice, admin]) {
      await expect(trader.connect(signer).setFeeMultiplier(newFee)).to.be.rejectedWith('execution reverted')
    }
  })

  it('should be possible to set the maximum fee multiplier', async function () {
    // Arrange
    const { trader, owner } = await fixture()

    // Act
    const maxFee = BigInt(30)
    await setFeeMultiplier(trader, owner, maxFee)

    // Assert
    expect(await trader.feeMultiplier()).to.equal(maxFee)
  })

  it('should be possible to set the minimum fee multiplier', async function () {
    // Arrange
    const { trader, owner } = await fixture()

    // Act
    const minFee = BigInt(0)
    await setFeeMultiplier(trader, owner, minFee)

    // Assert
    expect(await trader.feeMultiplier()).to.equal(minFee)
  })

  it('should revert if new value is higher than the maximum allowed', async function () {
    // Arrange
    const { trader, owner } = await fixture()

    // Act + assert
    const newFee = BigInt(31)
    await expect(trader.connect(owner).setFeeMultiplier(newFee)).to.be.rejectedWith('execution reverted')
  })
})
