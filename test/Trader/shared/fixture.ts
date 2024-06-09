import { ethers } from 'hardhat'
import type { AddressLike } from 'ethers'
import { expect } from 'chai'
import { ENERGY_CONTRACT_ADDRESS, PARAMS_CONTRACT_ADDRESS, SUPPORTED_DEXS_COUNT } from '../../../constants'
import { Energy, Params, UniswapV2Factory, UniswapV2Pair, UniswapV2Router02 } from '../../../typechain-types'
import * as energyArtifact from '../../../artifacts/contracts/vechain/Energy.sol/Energy.json'
import * as paramsArtifact from '../../../artifacts/contracts/vechain/Params.sol/Params.json'
import * as pairArtifact from '../../../artifacts/contracts/verocket/v2-core/UniswapV2Pair.sol/UniswapV2Pair.json'
import { expandTo18Decimals } from './expand-to-18-decimals'
import { approveEnergy } from './approve-energy'

const { getSigners, getContractFactory, Contract, ZeroAddress, MaxUint256, provider } = ethers

export async function fixture() {
  // NOTE: these account run out of gas the more we run tests! Fix!
  const [god, owner, keeper, alice, bob] = await getSigners()

  const energy = new Contract(ENERGY_CONTRACT_ADDRESS, energyArtifact.abi, god) as unknown as Energy
  const energyAddr = await energy.getAddress()

  expect(await provider.getCode(energyAddr)).not.to.have.length(0)

  const params = new Contract(PARAMS_CONTRACT_ADDRESS, paramsArtifact.abi, god) as unknown as Params
  const paramsAddr = await params.getAddress()

  expect(await provider.getCode(paramsAddr)).not.to.have.length(0)

  // await provider.getFeeData()).gasPrice -> 0n

  const baseGasPriceKey = '0x000000000000000000000000000000000000626173652d6761732d7072696365'
  // ^ https://github.com/vechain/thor/blob/f77ab7f286d3b53da1b48c025afc633a7bd03561/thor/params.go#L44
  const baseGasPrice = (await params.get(baseGasPriceKey)) as bigint
  // ^ baseGasPrice is 1e^15, 2 orders of magnitude higher than on live networks

  const VVET9 = await getContractFactory('VVET9', god)
  const vvet9 = await VVET9.deploy()
  const vvet9Addr = await vvet9.getAddress()

  expect(await provider.getCode(vvet9Addr)).not.to.have.length(0)

  const factories: UniswapV2Factory[] = []
  const routers: UniswapV2Router02[] = [] // TODO: typescript enforce length = 2
  const routersAddr: AddressLike[] = []

  for (let i = 0; i < SUPPORTED_DEXS_COUNT; i++) {
    const Factory = await getContractFactory('UniswapV2Factory', god)
    const factory = await Factory.deploy(god.address, vvet9Addr)
    const factoryAddr = await factory.getAddress()

    expect(await provider.getCode(factoryAddr)).not.to.have.length(0)

    const Router = await getContractFactory('UniswapV2Router02', god)
    const router = await Router.deploy(factoryAddr, vvet9Addr)
    const routerAddr = await router.getAddress()
    routersAddr.push(routerAddr)

    expect(await provider.getCode(routerAddr)).not.to.have.length(0)

    factories.push(factory)
    routers.push(router)
  }

  const Trader = await getContractFactory('Trader', owner)
  const trader = await Trader.deploy(vvet9Addr, routersAddr as [AddressLike, AddressLike])
  const traderAddr = await trader.getAddress()

  expect(await provider.getCode(traderAddr)).not.to.have.length(0)

  // Set Trader contract keeper
  const tx0 = await trader.connect(owner).addKeeper(keeper.address)
  await tx0.wait(1)

  expect(await trader.isKeeper(keeper.address)).to.equal(true)

  for (let i = 0; i < SUPPORTED_DEXS_COUNT; i++) {
    const factory = factories[i]
    const router = routers[i]
    const routerAddr = routersAddr[i]

    // Create VVET9-VTHO pair
    const tx1 = await factory.createPair(energyAddr, vvet9Addr)
    await tx1.wait(1)

    const pairAddress = await factory.getPair(energyAddr, vvet9Addr)

    const pair = new Contract(pairAddress, pairArtifact.abi, god) as unknown as UniswapV2Pair

    expect(await provider.getCode(pair.getAddress())).not.to.have.length(0)

    const reserves = await pair.getReserves()
    expect(reserves[0]).to.equal(0)
    expect(reserves[1]).to.equal(0)

    // Provide liquidity with a 1 VVET9 - 20 VTHO exchange rate
    await approveEnergy(energy, god, routerAddr, MaxUint256)

    const token0Amount = expandTo18Decimals(20000) // energy/vtho
    const token1Amount = expandTo18Decimals(1000) // vvet9

    const addLiquidityTx = await router.connect(god).addLiquidityETH(
      energyAddr, // token
      token0Amount, // amountTokenDesired
      0, // amountTokenMin
      0, // amountETHMin,
      god.address, // to: recipient of the liquidity tokens
      MaxUint256, // deadline
      { value: token1Amount /*gasLimit: 30000000,*/ /*hexlify(9999999) */ }
    )

    await addLiquidityTx.wait()

    // Validate reserves
    const reserves2 = await pair.getReserves()
    expect(reserves2[0]).to.equal(token0Amount)
    expect(reserves2[1]).to.equal(token1Amount)
  }

  const SWAP_GAS = await trader.SWAP_GAS()

  // Burn all VET from all test accounts in order to avoid changes in VTHO balance
  for (const signer of [owner, keeper, alice, bob]) {
    const signerBalanceVET_0 = await provider.getBalance(signer.getAddress())
    const tx = await signer.sendTransaction({
      to: ZeroAddress,
      value: signerBalanceVET_0,
    })
    await tx.wait()
    const signerBalanceVET_1 = await provider.getBalance(signer.getAddress())
    expect(signerBalanceVET_1).to.equal(0)
  }

  return {
    god,
    owner,
    keeper,
    alice,
    bob,
    energy,
    energyAddr,
    vvet9,
    vvet9Addr,
    baseGasPrice,
    factories,
    routers,
    routersAddr,
    // pair,
    trader,
    traderAddr,
    SWAP_GAS,
  }
}
