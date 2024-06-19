import { ethers } from 'hardhat'
import { expect } from 'chai'

const { getContractFactory, provider } = ethers

type Params = {
  deployer: any
}

export async function deployVVET({ deployer }: Params) {
  const VVET9 = await getContractFactory('VVET', deployer)
  const vvet9 = await VVET9.deploy()
  const vvet9Addr = await vvet9.getAddress()

  expect(await provider.getCode(vvet9Addr)).not.to.have.length(0)

  return {
    vvet9,
    vvet9Addr,
  }
}
