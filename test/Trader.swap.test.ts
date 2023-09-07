import { ethers } from 'hardhat'
import chai, { expect } from 'chai'
import { solidity } from 'ethereum-waffle'
import { fixture } from './shared/fixture'

chai.use(solidity)

const {
  utils: { parseUnits, formatUnits },
  BigNumber: { from: bn },
  constants,
  provider,
} = ethers

describe('Trader.swap', function () {
  it('should swap VTHO for VET when balance is above triggerBalance', async function () {
    const { alice, SWAP_GAS_AMOUNT, approve, saveConfig, swap } = await fixture()

    const reserveBalance = parseUnits('5', 18)
    const triggerBalance = parseUnits('50', 18)
    const exchangeRate = 100

    // Get VET balance before swap
    const aliceBalanceVET_0 = await provider.getBalance(alice.address)
    // Approve, config and swap
    await approve(alice)
    await saveConfig(alice, reserveBalance, triggerBalance)
    const swapReceipt = await swap(alice.address, exchangeRate)
    // Get VET balance after swap
    const aliceBalanceVET_1 = await provider.getBalance(alice.address)

    // Make sure gas spent is as expected
    expect(swapReceipt.gasUsed).to.eq(SWAP_GAS_AMOUNT)
    // Make sure VET balance has increased
    expect(aliceBalanceVET_1).to.be.gt(aliceBalanceVET_0)
    // TODO: Calculate exact VET output
  })

  // TODO: create several test cases:
  // 1. balance >= MAX_VTHO_WITHDRAWAL_AMOUNT + reserveBalance
  // 2. balance = MAX_VTHO_WITHDRAWAL_AMOUNT + reserveBalance - 1
  // 3. balance = MAX_VTHO_WITHDRAWAL_AMOUNT + 1
  // 4. balance = MAX_VTHO_WITHDRAWAL_AMOUNT - 1
  // 5. balance = triggerBalance
  it.only('should store protocol and transaction fees into the contract after the swap', async function () {
    const { energy, trader, owner, admin, alice, bob, SWAP_GAS_AMOUNT, MAX_VTH0_WITHDRAW_AMOUNT, } = await fixture()

    const aliceBalanceVET = await provider.getBalance(alice.address)
    const aliceBalanceVTHO = await energy.balanceOf(alice.address)

    const reserveBalance = parseUnits('5', 18)
    const triggerBalance = parseUnits('50', 18)

    const traderBalanceVTHO_0 = await energy.balanceOf(trader.address)
    expect(traderBalanceVTHO_0).to.eq(0)
    console.log('EMPTY CONTRACT BALANCE')

    // Onboard user
    const tx1 = await energy.connect(alice).approve(trader.address, constants.MaxUint256)
    await tx1.wait()
    console.log('APPROVE')

    const tx2 = await trader.connect(alice).saveConfig(triggerBalance, reserveBalance)
    await tx2.wait()
    console.log('SAVE CONFIG')

    // Swap
    const tx3 = await trader.connect(admin).swap(alice.address, 100)
    const receipt = await tx3.wait()
    const swapEvent = receipt.events?.find((event) => event.event === 'Swap')

    expect(swapEvent).not.to.be.undefined
    expect(swapEvent?.args).not.to.be.undefined

    if (swapEvent == null || swapEvent.args == null) return

    const { args } = swapEvent

    const withdrawAmount = bn(args[1])
    const gasprice = bn(args[2])
    const protocolFee = bn(args[3])

    const txFee = gasprice.mul(SWAP_GAS_AMOUNT)

    console.log({protocolFee: protocolFee.toString()})
    console.log({withdrawAmount: withdrawAmount.toString()})
    console.log({MAX_VTH0_WITHDRAW_AMOUNT: MAX_VTH0_WITHDRAW_AMOUNT.toString()})
    console.log({aliceBalanceVTHO: aliceBalanceVTHO.toString()});


    // if aliceBalanceVTHO >= MAX_VTHO_WITHDRAWAL_AMOUNT => withdrawAmount === MAX_VTHO_WITHDRAWAL_AMOUNT - reserveBalance
    // if aliceBalanceVTHO < MAX_VTHO_WITHDRAWAL_AMOUNT && aliceBalanceVTHO >= triggerBalance => withdrawAmount === aliceBalance - reserveBalance

    const traderBalanceVTHO_1 = await energy.balanceOf(trader.address)
    console.log({contractBalanceVTHO: traderBalanceVTHO_1.toString()})
    expect(aliceBalanceVTHO).to.be.gte(triggerBalance)
    console.log('TRIGGER')
    // TODO: create 2 different test cases
    expect(withdrawAmount).to.eq(
      aliceBalanceVTHO.gte(MAX_VTH0_WITHDRAW_AMOUNT.add(reserveBalance))
        ? MAX_VTH0_WITHDRAW_AMOUNT
        : aliceBalanceVTHO.sub(reserveBalance),
    )
    console.log('WITHDRAW')
    expect(protocolFee).to.eq(withdrawAmount.sub(gasprice.mul(SWAP_GAS_AMOUNT)).mul(3).div(1000))
    console.log('PROTO FEE')
    expect(traderBalanceVTHO_1).to.eq(protocolFee.add(txFee))
    console.log('CONTRACT BALANCE')
  })

  // TODO: try to estimate the exact swap output (VET amount) based on
  // pool size and fees

  // TODO: test fees

  // TODO: swap should fail if attempting a swap with balance < triggerBalance
})
