import { expect } from 'chai'
import { fixture } from './shared/fixture'
import { expandTo18Decimals } from './shared/expand-to-18-decimals'

describe('Trader.withdrawFees', function () {
  it('should be possible for the owner to withdraw accrued fees', async function () {
    // Arrange
    const { baseGasPrice, energy, trader, traderAddr, owner, alice } = await fixture()

    const ownerBalanceVTHO_0 = await energy.balanceOf(owner.address)

    // Transfer some VTHO to the Trader contract
    const deposit = expandTo18Decimals(5)
    const tx1 = await energy.connect(alice).transfer(traderAddr, deposit)
    await tx1.wait(1)

    // Act
    const tx2 = await trader.connect(owner).withdrawFees()
    const receipt2 = await tx2.wait(1)

    // Assert
    expect(await energy.balanceOf(traderAddr)).to.equal(0)
    expect(await energy.balanceOf(owner.address)).to.equal(
      ownerBalanceVTHO_0 + deposit - (receipt2?.gasUsed || 0n) * baseGasPrice
    )
  })

  it('should be possible for anybody to call withdrawFees to transfer the fees to the owner', async function () {
    // Arrange
    const { energy, trader, traderAddr, owner, alice } = await fixture()

    const ownerBalanceVTHO_0 = await energy.balanceOf(owner.address)

    // Transfer some VTHO to the Trader contract
    const deposit = expandTo18Decimals(5)
    const tx1 = await energy.connect(alice).transfer(traderAddr, deposit)
    await tx1.wait(1)

    // Act
    const tx2 = await trader.connect(alice).withdrawFees()
    await tx2.wait(1)

    // Assert
    expect(await energy.balanceOf(traderAddr)).to.equal(0)
    expect(await energy.balanceOf(owner.address)).to.equal(ownerBalanceVTHO_0 + deposit)
  })

  it('should emit an event on withdrawal', async function () {
    // Arrange
    const { energy, trader, traderAddr, owner, alice } = await fixture()

    // Transfer some VTHO to the Trader contract
    const deposit = expandTo18Decimals(5)
    const tx1 = await energy.connect(alice).transfer(traderAddr, deposit)
    await tx1.wait(1)

    // Act + assert
    await expect(trader.connect(alice).withdrawFees()).to.emit(trader, 'WithdrawFees').withArgs(alice.address, deposit)
  })
})
