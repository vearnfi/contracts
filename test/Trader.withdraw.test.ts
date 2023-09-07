import { ethers } from 'hardhat'
import chai, { expect } from 'chai'
import { solidity } from 'ethereum-waffle'
import { fixture } from './shared/fixture'

chai.use(solidity)

const {
  getSigner,
  getSigners,
  getContractFactory,
  utils: { parseUnits, formatUnits, hexlify, FormatTypes },
  Contract,
  ContractFactory,
  BigNumber,
  constants,
  provider,
} = ethers

describe('Trader.withdraw', function () {
  it('should swap VTHO for VET', async function () {
    const { energy, trader, owner, admin, alice, bob, SWAP_GAS_AMOUNT } = await fixture()

    const aliceVET0 = await provider.getBalance(alice.address)
    const aliceVTHO0: typeof BigNumber = await energy.balanceOf(alice.address)
    console.log({ aliceVTHO0, format: formatUnits(aliceVTHO0.toString(), 18) })

    // Onboard user
    const tx1 = await energy.connect(alice).approve(trader.address, constants.MaxUint256)
    await tx1.wait()
    console.log('APPROVE')

    const tx2 = await trader.connect(alice).saveConfig(parseUnits('50', 18), parseUnits('5', 18))
    await tx2.wait()
    console.log('SAVE CONFIG')

    // Swap
    const tx3 = await trader.connect(admin).swap(alice.address, 100)
    const receipt = await tx3.wait()
    console.log('SWAP', JSON.stringify(receipt, null, 2))
    const swapEvent = receipt.events?.find((event) => event.event === 'Swap')

    expect(swapEvent).not.to.be.undefined
    expect(swapEvent?.args).not.to.be.undefined

    if (swapEvent == null || swapEvent.args == null) return

    const { args } = swapEvent

    const withdrawAmount = BigNumber.from(args[1])
    const gasprice = BigNumber.from(args[2])
    const protocolFee = BigNumber.from(args[3])
    const maxRate = BigNumber.from(args[4])
    const amountOutMin = BigNumber.from(args[5])
    const amountOut = BigNumber.from(args[6])

    const contractBalanceVTHO = (await energy.balanceOf(trader.address)) as typeof BigNumber
    expect(withdrawAmount).to.eq(parseUnits('45', 18))
    expect(contractBalanceVTHO).to.eq(withdrawAmount.sub(gasprice.mul(SWAP_GAS_AMOUNT)).mul(3).div(1000))
  })

  // TODO: test fees
})
