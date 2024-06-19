import { expect } from 'chai'
import { fixture } from './shared/fixture'
import { expandTo18Decimals } from './shared/expand-to-18-decimals'

describe('Trader.withdrawFees', function () {
  it('should be possible for the owner to withdraw accrued fees', async function () {
    // Arrange
    const { baseGasPrice, energy, trader, traderAddr, owner, alice } = await fixture()

    const ownerBalanceVTHO_0 = await energy.balanceOf(owner.address)

    // Transfer some VTHO to the Trader contract
    const amount = expandTo18Decimals(5)
    const tx1 = await energy.connect(alice).transfer(traderAddr, amount)
    await tx1.wait(1)

    // Act
    const tx2 = await trader.connect(owner).withdrawFees()
    const receipt2 = await tx2.wait(1)

    // Assert
    expect(await energy.balanceOf(traderAddr)).to.equal(0)
    expect(await energy.balanceOf(owner.address)).to.equal(
      ownerBalanceVTHO_0 + amount - (receipt2?.gasUsed || 0n) * baseGasPrice
    )
  })

  it('should revert if called by an account other than the owner', async function () {
    // Arrange
    const { trader, alice, keeper } = await fixture()

    // Act + assert
    for (const signer of [alice, keeper]) {
      await expect(trader.connect(signer).withdrawFees()).to.be.rejectedWith(
        'execution reverted: Roles: account is not owner'
      )
    }
  })

  it('should emit an event on withdrawal', async function () {
    // Arrange
    const { energy, trader, traderAddr, owner, alice } = await fixture()

    // Transfer some VTHO to the Trader contract
    const amount = expandTo18Decimals(5)
    const tx1 = await energy.connect(alice).transfer(traderAddr, amount)
    await tx1.wait(1)

    // Act + assert
    await expect(trader.connect(owner).withdrawFees()).to.emit(trader, 'WithdrawFees').withArgs(owner.address, amount)
  })
})
