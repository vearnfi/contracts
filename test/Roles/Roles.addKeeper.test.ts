import { ethers } from 'hardhat'
import { expect } from 'chai'
import { fixture } from './shared/fixture'

describe('Roles.addKeeper', function () {
  it('should add a keeper if called by an owner', async function () {
    // Arrange
    const { roles, owner, alice } = await fixture()

    // Act
    const tx = await roles.connect(owner).addKeeper(alice.address)
    const receipt = await tx.wait(1)

    // Assert
    expect(await roles.isKeeper(alice.address)).to.equal(true)
  })

  it('should revert if called by any account other than an owner', async function () {
    // Arrange
    const { roles, god, keeper, alice, bob } = await fixture()

    // Act + assert
    for (const signer of [god, keeper, alice, bob]) {
      await expect(roles.connect(signer).addKeeper(bob.address)).to.be.rejectedWith('execution reverted')
    }
  })
})

// TODO: emit event
