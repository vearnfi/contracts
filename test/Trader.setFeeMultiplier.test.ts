import chai, { expect } from 'chai'
import { solidity } from 'ethereum-waffle'
import { fixture } from './shared/fixture'

chai.use(solidity)

// TODO: research how other protocols set the fee
describe.only('Trader.setFeeMultiplier', function () {
  it('should be possible for the owner to set a new fee multiplier', async function () {
    const { trader, owner } = await fixture()

    const initialFee = 30
    const newFee = 25

    expect(await trader.feeMultiplier()).to.eq(initialFee)

    const tx = await trader.connect(owner).setFeeMultiplier(newFee)
    await tx.wait()

    expect(await trader.feeMultiplier()).to.eq(newFee)
  })

  it('should be possible for the owner to set the maximum fee multiplier', async function () {
    const { trader, owner } = await fixture()

    const maxFee = 30
    const lowerFee = 25

    expect(await trader.feeMultiplier()).to.eq(maxFee)

    const tx1 = await trader.connect(owner).setFeeMultiplier(lowerFee)
    await tx1.wait()

    expect(await trader.feeMultiplier()).to.eq(lowerFee)

    const tx2 = await trader.connect(owner).setFeeMultiplier(maxFee)
    await tx2.wait()

    expect(await trader.feeMultiplier()).to.eq(maxFee)
  })

  it('should revert if not authorized account attempts to set a new fee multiplier', async function () {
    const { trader, admin, alice } = await fixture()

    const initialFee = 30
    const newFee = 25

    expect(await trader.feeMultiplier()).to.eq(initialFee)

    for (const signer of [alice, admin]) {
      await expect(trader.connect(signer).setFeeMultiplier(newFee)).to.be.reverted
    }
  })

  it('should revert if the new fee multiplier is higher than allowed', async function () {
    const { trader, owner } = await fixture()

    const newFee = 31

    await expect(trader.connect(owner).setFeeMultiplier(newFee)).to.be.reverted
  })
})
