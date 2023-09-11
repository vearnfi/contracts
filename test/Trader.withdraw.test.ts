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
  BigNumber: { from: bn },
  constants,
  provider,
} = ethers

describe('Trader.withdraw', function () {
  it('should be possible for the owner to withdraw accrued fees', async function () {
    const { energy, trader, owner, alice, SWAP_GAS } = await fixture()

    const reserveBalance = parseUnits('5', 18)
    const triggerBalance = parseUnits('50', 18)
    const exchangeRate = 100

    // Get accrued fees before the swap.
    const traderBalanceVTHO_0 = await energy.balanceOf(trader.address)

    expect(traderBalanceVTHO_0).to.eq(0)

    // Approve, config and swap
    const tx1 = await energy.connect(alice).approve(trader.address, constants.MaxUint256)
    await tx1.wait()
    const tx2 = await trader.connect(alice).saveConfig(triggerBalance, reserveBalance)
    await tx2.wait()
    const tx3 = await trader.connect(owner).swap(alice.address, exchangeRate)
    const swapReceipt = await tx3.wait()

    // Read Swap event
    const swapEvent = swapReceipt.events?.find((event) => event.event === 'Swap')

    expect(swapEvent).not.to.be.undefined
    expect(swapEvent?.args).not.to.be.undefined
    console.log('SWAP EVENT')

    if (swapEvent == null || swapEvent.args == null) return

    const { args: swapArgs } = swapEvent

    const gasprice = bn(swapArgs[2])
    const protocolFee = bn(swapArgs[3])

    const txFee = gasprice.mul(SWAP_GAS)
    const accruedFees = txFee.add(protocolFee)

    // Get accrued fees after the swap.
    const traderBalanceVTHO_1 = await energy.balanceOf(trader.address)

    // Make sure both tx fees and protocol fees has been collected
    expect(traderBalanceVTHO_1).to.eq(accruedFees)

    const tx4 = await trader.connect(owner).withdraw()
    const withdrawReceipt = await tx4.wait()

    // Read Withdraw event
    const withdrawEvent = withdrawReceipt.events?.find((event) => event.event === 'Withdraw')

    expect(withdrawEvent).not.to.be.undefined
    expect(withdrawEvent?.args).not.to.be.undefined
    console.log('WITHDRAW EVENT')

    if (withdrawEvent == null || withdrawEvent.args == null) return

    const { args: withdrawArgs } = withdrawEvent

    const to = bn(withdrawArgs[0])
    const amount = bn(withdrawArgs[1])

    expect(to).to.eq(owner.address)
    expect(amount).to.eq(accruedFees)
  })
  // TODO: test fees

  it.only('should revert if not authorized account attempts to withdraw fees', async function () {
    const { energy, trader, owner, admin, alice, SWAP_GAS } = await fixture()

    const reserveBalance = parseUnits('5', 18)
    const triggerBalance = parseUnits('50', 18)
    const exchangeRate = 100

    // Get accrued fees before the swap.
    const traderBalanceVTHO_0 = await energy.balanceOf(trader.address)

    expect(traderBalanceVTHO_0).to.eq(0)

    // Approve, config and swap
    const tx1 = await energy.connect(alice).approve(trader.address, constants.MaxUint256)
    await tx1.wait()
    const tx2 = await trader.connect(alice).saveConfig(triggerBalance, reserveBalance)
    await tx2.wait()
    const tx3 = await trader.connect(owner).swap(alice.address, exchangeRate)
    const swapReceipt = await tx3.wait()

    // Read Swap event
    const swapEvent = swapReceipt.events?.find((event) => event.event === 'Swap')

    expect(swapEvent).not.to.be.undefined
    expect(swapEvent?.args).not.to.be.undefined
    console.log('SWAP EVENT')

    if (swapEvent == null || swapEvent.args == null) return

    const { args: swapArgs } = swapEvent

    const gasprice = bn(swapArgs[2])
    const protocolFee = bn(swapArgs[3])

    const txFee = gasprice.mul(SWAP_GAS)
    const accruedFees = txFee.add(protocolFee)

    // Get accrued fees after the swap.
    const traderBalanceVTHO_1 = await energy.balanceOf(trader.address)

    // Make sure both tx fees and protocol fees has been collected
    expect(traderBalanceVTHO_1).to.eq(accruedFees)

    await expect(trader.connect(alice).withdraw()).to.be.reverted
    await expect(trader.connect(admin).withdraw()).to.be.reverted
  })

  // TODO: test emit event
})
