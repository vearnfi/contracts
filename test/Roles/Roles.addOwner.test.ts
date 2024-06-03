import { expect } from 'chai'
import { fixture } from './shared/fixture'

describe('Roles.addOwner', function () {
  it('should add an owner if called by an owner', async function () {
    // Arrange
    const { roles, owner, alice } = await fixture()

    // Act
    const tx = await roles.connect(owner).addOwner(alice.address)
    const receipt = await tx.wait(1)

    // Assert
    expect(await roles.isOwner(alice.address)).to.equal(true)
  })

  it('should revert if called by any account other than an owner', async function () {
    // Arrange
    const { roles, god, keeper, alice, bob } = await fixture()

    // Act + assert
    for (const signer of [god, keeper, alice, bob]) {
      await expect(roles.connect(signer).addOwner(bob.address)).to.be.rejectedWith('execution reverted')
    }
  })

  it('should emit a RoleGranted event', async function () {
    // Arrange
    const { DEFAULT_ADMIN_ROLE, roles, owner, bob } = await fixture()

    // Act + assert
    await expect(roles.connect(owner).addOwner(bob.address))
      .to.emit(roles, 'RoleGranted')
      .withArgs(DEFAULT_ADMIN_ROLE, bob.address, owner.address)
  })
})
