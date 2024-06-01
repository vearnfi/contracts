import { ethers } from 'hardhat'
import { expect } from 'chai'

const { getSigners, getContractFactory } = ethers

export async function fixture() {
  const [god, owner, alice] = await getSigners()

  const Roles = await getContractFactory('Roles', god)
  const roles = await Roles.deploy(owner.address)
  // const roles = new Contract(ENERGY_CONTRACT_ADDRESS, energyArtifact.abi, god) // Roles
  // const energyAddr = await roles.getAddress()

  return { roles, god, owner, alice }
}
