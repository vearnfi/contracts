import { ethers } from 'hardhat'
import { expect } from 'chai'
import { fixture } from './shared/fixture'

describe.only('Roles.addOwner', function () {
  it('should be possible for an owner to add another owner', async function () {
    // Arrange
    const { roles, owner, alice } = await fixture()

    // Act
    const tx = await roles.connect(owner).addOwner(alice.address)
    const receipt = await tx.wait(1)

    // Assert
    expect(await roles.isOwner(alice.address)).to.equal(true)
  })

  it('should NOT be possible for a non owner to add a new owner', async function () {
    // Arrange
    const { roles, god, keeper, alice, bob } = await fixture()

    // Act + assert
    for (const signer of [god, keeper, alice, bob]) {
      await expect(roles.connect(signer).addOwner(bob.address)).to.be.rejectedWith('execution reverted')
    }
  })
})
