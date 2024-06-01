import { ethers } from 'hardhat'
import { expect } from 'chai'
import { fixture } from './shared/fixture'

describe.only('Roles.removeKeeper', function () {
  it('should be possible for an owner to remove a keeper', async function () {
    // Arrange
    const { roles, owner, keeper } = await fixture()

    // Act
    const tx = await roles.connect(owner).removeKeeper(keeper.address)
    const receipt = await tx.wait(1)

    // Assert
    expect(await roles.isKeeper(keeper.address)).to.equal(false)
  })

  it('should NOT be possible for a non owner to remove a keeper', async function () {
    // Arrange
    const { roles, god, keeper, alice, bob } = await fixture()

    // Act + assert
    for (const signer of [god, keeper, alice, bob]) {
      await expect(roles.connect(signer).removeKeeper(keeper.address)).to.be.rejectedWith('execution reverted')
    }
  })
})
