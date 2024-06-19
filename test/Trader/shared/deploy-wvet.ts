import { ethers } from 'hardhat'
import { expect } from 'chai'

const { getContractFactory, provider } = ethers

type Params = {
  deployer: any
}

export async function deployWVET({ deployer }: Params) {
  const WVET = await getContractFactory('WVET', deployer)
  const wvet = await WVET.deploy()
  const wvetAddr = await wvet.getAddress()

  expect(await provider.getCode(wvetAddr)).not.to.have.length(0)

  return {
    wvet,
    wvetAddr,
  }
}
