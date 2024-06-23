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
  const Router = await getContractFactory('VexWrapper', deployer)
  const router = await Router.deploy(vexchange.routerAddr)
  const routerAddr = await router.getAddress()

  expect(await provider.getCode(routerAddr)).not.to.have.length(0)

  return {
    router,
    routerAddr,
  }
}
