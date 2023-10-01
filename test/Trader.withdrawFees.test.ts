import { ethers } from 'hardhat'
import chai, { expect } from 'chai'
import { solidity } from 'ethereum-waffle'
import { fixture } from './shared/fixture'
import { expandTo18Decimals } from './shared/expand-to-18-decimals'
import { saveConfig } from './shared/save-config'
import { approveEnergy } from './shared/approve-energy'

chai.use(solidity)

const {
  BigNumber: { from: bn },
  constants,
} = ethers

describe('Trader.withdrawFees', function () {
  it('should be possible for the owner to withdraw accrued fees', async function () {
    const { energy, trader, owner, admin, alice, SWAP_GAS } = await fixture()

    const reserveBalance = expandTo18Decimals(5)
    const withdrawAmount = expandTo18Decimals(500)
    const exchangeRate = 100

    // Get accrued fees before the swap.
    const traderBalanceVTHO_0 = await energy.balanceOf(trader.address)

    expect(traderBalanceVTHO_0).to.equal(0)

    // Approve, config and swap
    await approveEnergy(energy, alice, trader.address, constants.MaxUint256)
    await saveConfig(trader, alice, reserveBalance)
    const tx3 = await trader.connect(admin).swap(alice.address, 0, withdrawAmount, exchangeRate)
    const swapReceipt = await tx3.wait()

    // Read Swap event
    const swapEvent = swapReceipt.events?.find((event) => event.event === 'Swap')

    expect(swapEvent).not.to.be.undefined
    expect(swapEvent?.args).not.to.be.undefined
    console.log('SWAP EVENT')

    if (swapEvent == null || swapEvent.args == null) return

    const { args: swapArgs } = swapEvent

    const gasPrice = bn(swapArgs[2])
    const protocolFee = bn(swapArgs[3])

    const txFee = gasPrice.mul(SWAP_GAS)
    const accruedFees = txFee.add(protocolFee)

    // Get accrued fees after the swap.
    const traderBalanceVTHO_1 = await energy.balanceOf(trader.address)

    // Make sure both tx fees and protocol fees has been collected
    expect(traderBalanceVTHO_1).to.equal(accruedFees)

    const tx4 = await trader.connect(owner).withdrawFees()
    await tx4.wait()

    // Read `Transfer` event from energy contract.
    const filter = energy.filters.Transfer(trader.address, owner.address)
    const events = await energy.queryFilter(filter)
    const transferEvent = events.find((event) => event.event === 'Transfer')

    expect(transferEvent).not.to.be.undefined
    expect(transferEvent?.args).not.to.be.undefined
    console.log('TRANSFER EVENT')

    if (transferEvent == null || transferEvent.args == null) return

    const { args: transferArgs } = transferEvent

    const from = bn(transferArgs[0])
    const to = bn(transferArgs[1])
    const amount = bn(transferArgs[2])

    expect(from).to.equal(trader.address)
    expect(to).to.equal(owner.address)
    expect(amount).to.equal(accruedFees)
  })
  // TODO: test fees

  it('should revert if not authorized account attempts to withdraw fees', async function () {
    const { trader, admin, alice } = await fixture()

    for (const signer of [admin, alice]) {
      await expect(trader.connect(signer).withdrawFees()).to.be.reverted
    }
  })

  // TODO: test emit event
})
