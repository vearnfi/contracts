import { expect } from 'chai'
import { fixture } from './shared/fixture'

describe('Trader.fetchBaseGasPrice', function () {
  it('should be possible for anyone to call fetchBaseGasPrice', async function () {
    // Arrange
    const { baseGasPrice, trader, alice } = await fixture()

    // Act
    const tx = await trader.connect(alice).fetchBaseGasPrice()
    await tx.wait(1)
    const gasPrice = await trader.baseGasPrice()

    // Assert
    expect(gasPrice).to.equal(baseGasPrice)
  })

  it('should emit an event on fetch', async function () {
    // Arrange
    const { baseGasPrice, trader, alice } = await fixture()

    // Act + assert
    await expect(trader.connect(alice).fetchBaseGasPrice()).to.emit(trader, 'FetchGas').withArgs(baseGasPrice)
  })
})
