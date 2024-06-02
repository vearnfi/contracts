import { ethers } from 'hardhat'
import { expect } from 'chai'

const { getSigners, getContractFactory } = ethers

const DEFAULT_ADMIN_ROLE = '0x0000000000000000000000000000000000000000000000000000000000000000'
const KEEPER_ROLE = '0xfc8737ab85eb45125971625a9ebdb75cc78e01d5c1fa80c4c6e5203f47bc4fab'

export async function fixture() {
  const [god, owner, keeper, alice, bob] = await getSigners()

  const Roles = await getContractFactory('Roles', god)
  const roles = await Roles.deploy(owner.address)

  const tx = await roles.connect(owner).addKeeper(keeper.address)
  const receipt = await tx.wait(1)

  expect(await roles.isOwner(owner.address)).to.equal(true)
  expect(await roles.isKeeper(keeper.address)).to.equal(true)

  for (const signer of [god, keeper, alice, bob]) {
    expect(await roles.isOwner(signer.address)).to.equal(false)
  }

  for (const signer of [god, owner, alice, bob]) {
    expect(await roles.isKeeper(signer.address)).to.equal(false)
  }

  return { DEFAULT_ADMIN_ROLE, KEEPER_ROLE, roles, god, owner, keeper, alice, bob }
}
