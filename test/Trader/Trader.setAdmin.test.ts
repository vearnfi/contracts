import { expect } from 'chai'
import { fixture } from './shared/fixture'
import { addKeeper } from './shared/set-admin'

describe('Trader.setAdmin', function () {
  it('should set a new admin if called by the owner', async function () {
    // Arrange
    const { trader, owner, bob } = await fixture()

    // Act
    await addKeeper(trader, owner, bob.address)

    // Assert
    expect(await trader.admin()).to.equal(bob.address)
  })

  it('should emit an event when a new admin is set', async function () {
    // Arrange
    const { trader, owner, bob } = await fixture()

    // Act + assert
    await expect(addKeeper(trader, owner, bob.address)).to.emit(trader, 'SetAdmin').withArgs(bob.address)
  })

  it('should revert if called by any account other than the owner', async function () {
    // Arrange
    const { trader, keeper: admin, alice, bob } = await fixture()

    // Act + assert
    for (const signer of [alice, admin]) {
      await expect(trader.connect(signer).setAdmin(bob.address)).to.be.rejectedWith(
        'execution reverted: Trader: account is not owner'
      )
    }
  })
})
