import chai, { expect } from 'chai'
import { solidity } from 'ethereum-waffle'
import { fixture } from './shared/fixture'

chai.use(solidity)

describe('Trader.setAdmin', function () {
  it('should set a new admin if called by the owner', async function () {
    const { trader, owner, admin, bob } = await fixture()

    expect(await trader.admin()).to.equal(admin.address)

    const tx = await trader.connect(owner).setAdmin(bob.address)
    await tx.wait()

    expect(await trader.admin()).to.equal(bob.address)
  })

  it('should revert if called by any account other than the owner', async function () {
    const { trader, admin, alice, bob } = await fixture()

    expect(await trader.admin()).to.equal(admin.address)

    for (const signer of [alice, admin]) {
      await expect(trader.connect(signer).setAdmin(bob.address)).to.be.reverted
    }
  })
})
