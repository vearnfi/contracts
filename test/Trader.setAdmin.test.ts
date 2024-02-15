import { expect } from 'chai'
import { fixture } from './shared/fixture'
import { setAdmin } from './shared/set-admin'

describe('Trader.setAdmin', function () {
  it('should set a new admin if called by the owner', async function () {
    // Arrange
    const { trader, owner, bob } = await fixture()

    // Act
    await setAdmin(trader, owner, bob.address)

    // Assert
    expect(await trader.admin()).to.equal(bob.address)
  })

  it('should revert if called by any account other than the owner', async function () {
    // Arrange
    const { trader, admin, alice, bob } = await fixture()

    // Act + assert
    for (const signer of [alice, admin]) {
      await expect(trader.connect(signer).setAdmin(bob.address)).to.be.rejectedWith('execution reverted')
    }
  })
})
