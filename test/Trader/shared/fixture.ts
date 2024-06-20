import { ethers } from 'hardhat'
import { expect } from 'chai'
import { ENERGY_CONTRACT_ADDRESS, PARAMS_CONTRACT_ADDRESS } from '../../../constants'
import { Energy, Params } from '../../../typechain-types'
import * as energyArtifact from '../../../artifacts/contracts/vechain/Energy.sol/Energy.json'
import * as paramsArtifact from '../../../artifacts/contracts/vechain/Params.sol/Params.json'
import { deployVVET } from './deploy-vvet'
import { deployWVET } from './deploy-wvet'
import { deployVerocket } from './deploy-verocket'
import { deployVexchange } from './deploy-vexchange'
import { deployVexWrapper } from './deploy-vex-wrapper'
import { deployTrader } from './deploy-trader'
import { createVerocketPairTokenVET } from './create-verocket-pair-token-vet'
import { createVexchangePairTokenVET } from './create-vexchange-pair-token-vet'

const { getSigners, Contract, ZeroAddress, provider } = ethers

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

  const { vvet9, vvet9Addr } = await deployVVET({ deployer: god })
  const { wvet, wvetAddr } = await deployWVET({ deployer: god })

  const verocket = await deployVerocket({ deployer: god, wethAddr: vvet9Addr })
  const vexchange = await deployVexchange({ deployer: god, wethAddr: wvetAddr })
  const vexWrapper = await deployVexWrapper({ deployer: god, vexchange })

  const { trader, traderAddr, SWAP_GAS } = await deployTrader({
    owner,
    keeper,
    routersAddr: [verocket.routerAddr, vexWrapper.routerAddr],
  })

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
    wvet,
    wvetAddr,
    baseGasPrice,
    verocket,
    vexchange,
    vexWrapper,
    trader,
    traderAddr,
    SWAP_GAS,
    createVerocketPairVTHO_VET: async ({ vthoAmount, vetAmount }: { vthoAmount: bigint; vetAmount: bigint }) =>
      createVerocketPairTokenVET({
        verocket,
        token: energy,
        vetAmount,
        tokenAmount: vthoAmount,
        deployer: god,
      }),
    createVexchangePairVTHO_VET: async ({ vthoAmount, vetAmount }: { vthoAmount: bigint; vetAmount: bigint }) =>
      createVexchangePairTokenVET({
        vexchange,
        token: energy,
        vetAmount,
        tokenAmount: vthoAmount,
        deployer: god,
      }),
  }
}
