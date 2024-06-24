import { ethers } from 'hardhat'
import { expect } from 'chai'

const { getContractFactory, provider } = ethers

type Params = {
  deployer: any
  wethAddr: string
}

export async function deployVexchange({ deployer, wethAddr }: Params) {
  const Factory = await getContractFactory('VexchangeV2Factory', deployer)
  const factory = await Factory.deploy(200, 5000, deployer.address, deployer.address)
  const factoryAddr = await factory.getAddress()

  expect(await provider.getCode(factoryAddr)).not.to.have.length(0)

  const Router = await getContractFactory('VexchangeV2Router02', deployer)
  const router = await Router.deploy(factoryAddr, wethAddr)
  const routerAddr = await router.getAddress()

  expect(await provider.getCode(routerAddr)).not.to.have.length(0)

  return {
    factory,
    factoryAddr,
    router,
    routerAddr,
  }
}
