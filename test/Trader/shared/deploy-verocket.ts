import { ethers } from 'hardhat'
import { expect } from 'chai'

const { getContractFactory, provider } = ethers

type Params = {
  deployer: any
  wethAddr: string
}

export async function deployVerocket({ deployer, wethAddr }: Params) {
  const Factory = await getContractFactory('UniswapV2Factory', deployer)
  const factory = await Factory.deploy(deployer.address, wethAddr)
  const factoryAddr = await factory.getAddress()

  expect(await provider.getCode(factoryAddr)).not.to.have.length(0)

  const Router = await getContractFactory('UniswapV2Router02', deployer)
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
