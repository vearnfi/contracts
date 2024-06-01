import { ethers } from 'hardhat'
import { expect } from 'chai'
import { fixture } from './shared/fixture'

describe('Roles.renounceOwner', function () {
  it('should be possible for an owner to renounce', async function () {
    // Arrange
    const { roles, owner } = await fixture()

    // Act
    const tx = await roles.connect(owner).renounceOwner(owner.address)
    const receipt = await tx.wait(1)

    // Assert
    expect(await roles.isOwner(owner.address)).to.equal(false)
  })

  it('should NOT be possible for an owner to renounce another owner', async function () {
    // Arrange
    const { roles, owner, alice } = await fixture()

    // Give Alice owner role
    const tx = await roles.connect(owner).addOwner(alice.address)
    const receipt = await tx.wait(1)

    // Act + assert
    await expect(roles.connect(owner).renounceOwner(alice.address)).to.be.rejectedWith('execution reverted')
  })

  it('should NOT be possible for an owner to add another owner after renouncing', async function () {
    // Arrange
    const { roles, god, owner, keeper, alice, bob } = await fixture()

    // Act
    const tx = await roles.connect(owner).renounceOwner(owner.address)
    const receipt = await tx.wait(1)

    // Assert
    for (const signer of [god, owner, keeper, alice, bob]) {
      await expect(roles.connect(owner).addOwner(signer.address)).to.be.rejectedWith('execution reverted')
    }
  })

  it('should NOT be possible for an owner to add a keeper after renouncing', async function () {
    // Arrange
    const { roles, god, owner, keeper, alice, bob } = await fixture()

    // Act
    const tx = await roles.connect(owner).renounceOwner(owner.address)
    const receipt = await tx.wait(1)

    // Assert
    for (const signer of [god, owner, keeper, alice, bob]) {
      await expect(roles.connect(owner).addKeeper(signer.address)).to.be.rejectedWith('execution reverted')
    }
  })
})
