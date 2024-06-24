import { ethers } from 'hardhat'
import { expect } from 'chai'

const { getContractFactory, provider } = ethers

type Params = {
  deployer: any
  vexchange: {
    routerAddr: string
  }
}

export async function deployVexWrapper({ deployer, vexchange }: Params) {
  const VexWrapper = await getContractFactory('VexWrapper', deployer)
  const vexWrapper = await VexWrapper.deploy(vexchange.routerAddr)
  const vexWrapperAddr = await vexWrapper.getAddress()

  expect(await provider.getCode(vexWrapperAddr)).not.to.have.length(0)

  return { vexWrapper, vexWrapperAddr }
}
