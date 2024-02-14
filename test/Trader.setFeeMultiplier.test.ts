import { expect } from 'chai'
import { fixture } from './shared/fixture'
import { setFeeMultiplier } from './shared/set-fee-multiplier'

// TODO: research how other protocols set the fee
describe('Trader.setFeeMultiplier', function () {
  it('should set a new fee multiplier if called by the owner', async function () {
    const { trader, owner } = await fixture()

    const initialFee = await trader.feeMultiplier() // 30
    const newFee = initialFee - BigInt(5)

    await setFeeMultiplier(trader, owner, newFee)

    expect(await trader.feeMultiplier()).to.equal(newFee)
  })

  it('should revert if called by any account other than the owner', async function () {
    const { trader, admin, alice } = await fixture()

    const newFee = BigInt(25)

    for (const signer of [alice, admin]) {
      await expect(trader.connect(signer).setFeeMultiplier(newFee)).to.be.rejectedWith("execution reverted")
    }
  })

  it('should be possible to set the maximum fee multiplier', async function () {
    const { trader, owner } = await fixture()

    const maxFee = BigInt(30)

    await setFeeMultiplier(trader, owner, maxFee)

    expect(await trader.feeMultiplier()).to.equal(maxFee)
  })

  it('should revert if new value is higher than the maximum allowed', async function () {
    const { trader, owner } = await fixture()

    const newFee = BigInt(31)

    await expect(trader.connect(owner).setFeeMultiplier(newFee)).to.be.rejectedWith("execution reverted")
  })
})
