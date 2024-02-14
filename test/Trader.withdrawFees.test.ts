import { ethers } from 'hardhat'
import type { Signer } from 'ethers'
import { expect } from 'chai'
import type { Energy, Trader } from '../typechain-types'
import { fixture } from './shared/fixture'
import { expandTo18Decimals } from './shared/expand-to-18-decimals'
import { saveConfig } from './shared/save-config'
import { approveEnergy } from './shared/approve-energy'
import { swap } from './shared/swap'

const { MaxUint256 } = ethers

describe.only('Trader.withdrawFees', function () {
  it('should be possible for the owner to withdraw accrued fees', async function () {
    // Arrange
    const { energy, trader, traderAddr, owner, alice } = await fixture()

    // Transfer some VTHO to the Trader contract
    const deposit = expandTo18Decimals(5)
    const tx1 = await energy.connect(alice).transfer(traderAddr, deposit)
    await tx1.wait()

    // Act
    const tx2 = await trader.connect(owner).withdrawFees()
    await tx2.wait()

    // Assert
    expect(await energy.balanceOf(traderAddr)).to.equal(0)

    const filter = energy.filters.Transfer(traderAddr, owner.address)
    const events = await energy.queryFilter(filter)

    expect(events.length).to.equal(1)

    const { args } = events[0]

    const from = BigInt(args[0])
    const to = BigInt(args[1])
    const amount = BigInt(args[2])

    expect(from).to.equal(traderAddr)
    expect(to).to.equal(owner.address)
    expect(amount).to.equal(deposit)
  })

  it('should revert if not authorized account attempts to withdraw fees', async function () {
    // Arrange
    const { trader, admin, alice } = await fixture()

    // Act + assert
    for (const signer of [admin, alice]) {
      await expect(trader.connect(signer).withdrawFees()).to.be.rejectedWith('execution reverted')
    }
  })
})
