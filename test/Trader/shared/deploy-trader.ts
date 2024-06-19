import { ethers } from 'hardhat'
import type { AddressLike } from 'ethers'
import { expect } from 'chai'

const { getContractFactory, provider } = ethers

type Params = {
  owner: any
  keeper: any
  routersAddr: string[]
}

export async function deployTrader({ owner, keeper, routersAddr }: Params) {
  const Trader = await getContractFactory('Trader', owner)
  const trader = await Trader.deploy(routersAddr as [AddressLike, AddressLike])
  const traderAddr = await trader.getAddress()

  expect(await provider.getCode(traderAddr)).not.to.have.length(0)

  // Set Trader contract's keeper
  const tx0 = await trader.connect(owner).addKeeper(keeper.address)
  await tx0.wait(1)

  expect(await trader.isKeeper(keeper.address)).to.equal(true)

  const SWAP_GAS = await trader.SWAP_GAS()

  return {
    trader,
    traderAddr,
    SWAP_GAS,
  }
}
