import { ethers } from 'hardhat'
import { expect } from 'chai'

const { getSigners, getContractFactory } = ethers

describe('Roles.constructor', function () {
  it('should grant the given address the owner role', async function () {
    // Arrange
    const [god, owner] = await getSigners()

    // Act
    const Roles = await getContractFactory('Roles', god)
    const roles = await Roles.deploy(owner.address)

    // Assert
    expect(await roles.isOwner(owner.address)).to.equal(true)
  })

  it('should not grant any other address the owner role', async function () {
    // Arrange
    const [god, owner, alice] = await getSigners()

    // Act
    const Roles = await getContractFactory('Roles', god)
    const roles = await Roles.deploy(owner.address)

    // Assert
    expect(await roles.isOwner(god.address)).to.equal(false)
    expect(await roles.isOwner(alice.address)).to.equal(false)
  })

  it('should not grant any address the keeper role', async function () {
    // Arrange
    const [god, owner, alice] = await getSigners()

    // Act
    const Roles = await getContractFactory('Roles', god)
    const roles = await Roles.deploy(owner.address)

    // Assert
    expect(await roles.isKeeper(god.address)).to.equal(false)
    expect(await roles.isKeeper(owner.address)).to.equal(false)
    expect(await roles.isKeeper(alice.address)).to.equal(false)
  })
})
