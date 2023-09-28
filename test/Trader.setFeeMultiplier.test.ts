import chai, { expect } from 'chai'
import { solidity } from 'ethereum-waffle'
import { fixture } from './shared/fixture'

chai.use(solidity)

// TODO: research how other protocols set the fee
describe('Trader.setFeeMultiplier', function () {
  it('should set a new fee multiplier if called by the owner', async function () {
    const { trader, owner } = await fixture()

    const initialFee = await trader.feeMultiplier() // 30
    const newFee = initialFee - 5

    const tx = await trader.connect(owner).setFeeMultiplier(newFee)
    await tx.wait()

    expect(await trader.feeMultiplier()).to.equal(newFee)
  })

  it('should revert if called by any account other than the owner', async function () {
    const { trader, admin, alice } = await fixture()

    const newFee = 25

    for (const signer of [alice, admin]) {
      await expect(trader.connect(signer).setFeeMultiplier(newFee)).to.be.reverted
    }
  })

  it('should be possible to set the maximum fee multiplier', async function () {
    const { trader, owner } = await fixture()

    const maxFee = 30

    const tx = await trader.connect(owner).setFeeMultiplier(maxFee)
    await tx.wait()

    expect(await trader.feeMultiplier()).to.equal(maxFee)
  })

  it('should revert if new value is higher than the maximum allowed', async function () {
    const { trader, owner } = await fixture()

    const newFee = 31

    await expect(trader.connect(owner).setFeeMultiplier(newFee)).to.be.reverted
  })
})
