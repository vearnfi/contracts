import { ethers } from 'hardhat'
import { expect } from 'chai'
import { fixture } from './shared/fixture'
import { expandTo18Decimals } from './shared/expand-to-18-decimals'
import { saveConfig } from './shared/save-config'
import { approveToken } from './shared/approve-token'
import { swap } from './shared/swap'
import { setFeeMultiplier } from './shared/set-fee-multiplier'
import { calcSwapFees } from './shared/calc-swap-fees'
import { calcDexAmountOut } from './shared/calc-dex-amount-out'

const { provider, MaxUint256, getContractFactory } = ethers

type SwapTestCase = {
  reserveBalance: bigint
  withdrawAmount: bigint
}

const testCases: SwapTestCase[] = [
  { reserveBalance: expandTo18Decimals(5), withdrawAmount: expandTo18Decimals(500) },
  { reserveBalance: expandTo18Decimals(5), withdrawAmount: expandTo18Decimals(1_000) },
  { reserveBalance: expandTo18Decimals(5), withdrawAmount: expandTo18Decimals(5_000) },
  { reserveBalance: expandTo18Decimals(5), withdrawAmount: expandTo18Decimals(10_000) }, // 0x21E19E0C9BAB2400000
  { reserveBalance: expandTo18Decimals(5), withdrawAmount: BigInt('5037190915060954894609') }, // 0x1111111111111111111
  { reserveBalance: expandTo18Decimals(5), withdrawAmount: BigInt('75557863725914323419135') }, // 0xfffffffffffffffffff
]

const dexs = ['verocket', 'vexchange'] as const

const fees = [0n, 10n, 30n] as const

// TODO: test small withdrawAmount
describe('Trader.swap', function () {
  dexs.forEach((dex) => {
    fees.forEach((fee) => {
      it(`should exchange VTHO for VET with a fee of ${fee} using ${dex} when the method is called by the keeper`, async () => {
        // Arrange
        const {
          energy,
          energyAddr,
          baseGasPrice,
          trader,
          traderAddr,
          SWAP_GAS,
          verocket,
          vexWrapper,
          owner,
          keeper,
          alice,
          createVerocketPairVTHO_VET,
          createVexchangePairVTHO_VET,
        } = await fixture()

        const vthoAmount = expandTo18Decimals(20000) // energy/vtho
        const vetAmount = expandTo18Decimals(1000) // vvet9/wvet
        const delta = expandTo18Decimals(100)

        const verocketPair = await createVerocketPairVTHO_VET({
          vthoAmount,
          vetAmount: dex === 'verocket' ? vetAmount + delta : vetAmount,
        })
        const vexchangePair = await createVexchangePairVTHO_VET({
          vthoAmount,
          vetAmount: dex === 'vexchange' ? vetAmount + delta : vetAmount,
        })

        await setFeeMultiplier(trader, owner, fee)

        const reserveBalance = expandTo18Decimals(5)
        const withdrawAmount = expandTo18Decimals(500)
        const amountOutMin = BigInt(100) // 100 wei VET

        await approveToken(energy, alice, traderAddr, MaxUint256)
        await saveConfig(trader, alice, reserveBalance)

        const { amountIn } = await calcSwapFees(trader, SWAP_GAS, baseGasPrice, withdrawAmount)
        const amountOut = await calcDexAmountOut([verocket.router, vexWrapper], energyAddr, amountIn)

        const aliceBalanceVET_0 = await provider.getBalance(alice.address)
        const aliceBalanceVTHO_0 = await energy.balanceOf(alice.address)

        // Act
        await swap(trader, keeper, alice.address, withdrawAmount, amountOutMin)

        // Assert
        const aliceBalanceVTHO_1 = await energy.balanceOf(alice.address)
        expect(aliceBalanceVTHO_1).to.be.gte(aliceBalanceVTHO_0 - withdrawAmount)

        const aliceBalanceVET_1 = await provider.getBalance(alice.address)
        expect(aliceBalanceVET_1).to.equal(aliceBalanceVET_0 + amountOut)

        let reserves: { _reserve0: bigint; _reserve1: bigint } = { _reserve0: 0n, _reserve1: 0n }

        if (dex === 'verocket') {
          reserves = await verocketPair.getReserves()
        } else if (dex === 'vexchange') {
          reserves = await vexchangePair.getReserves()
        }

        expect(reserves._reserve0).to.equal(vthoAmount + amountIn)
        expect(reserves._reserve1).to.equal(vetAmount + delta - amountOut)
      })
    })
  })

  it('should swap if the target account is a contract WITH a payable fallback function', async () => {
    // Arrange
    const { energy, trader, traderAddr, keeper, alice, createVerocketPairVTHO_VET, createVexchangePairVTHO_VET } =
      await fixture()

    const WithFallback = await getContractFactory('WithFallback', alice)
    const withFallback = await WithFallback.deploy(traderAddr)
    const withFallbackAddr = await withFallback.getAddress()

    const vthoAmount = expandTo18Decimals(20000) // energy/vtho
    const vetAmount = expandTo18Decimals(1000) // vvet9/wvet

    await createVerocketPairVTHO_VET({ vthoAmount, vetAmount })
    await createVexchangePairVTHO_VET({ vthoAmount, vetAmount })

    const reserveBalance = expandTo18Decimals(5)
    const withdrawAmount = expandTo18Decimals(500)
    const amountOutMin = BigInt(100)

    // Transfer some VTHO to the target contract
    const tx1 = await energy.connect(alice).transfer(withFallbackAddr, BigInt(2) * withdrawAmount)
    await tx1.wait(1)

    const tx2 = await withFallback.connect(alice).approveEnergyAllowance()
    await tx2.wait(1)

    const tx3 = await withFallback.connect(alice).saveConfig(reserveBalance)
    await tx3.wait(1)

    // Act
    await swap(trader, keeper, withFallbackAddr, withdrawAmount, amountOutMin)

    // Assert
    expect(await provider.getBalance(withFallbackAddr)).to.be.gt(0)
  })

  it('should revert if the target account is a contract WITHOUT a payable fallback function', async () => {
    // Arrange
    const { energy, trader, traderAddr, keeper, alice, createVerocketPairVTHO_VET, createVexchangePairVTHO_VET } =
      await fixture()

    const NoFallback = await getContractFactory('NoFallback', alice)
    const noFallback = await NoFallback.deploy(traderAddr)
    const noFallbackAddr = await noFallback.getAddress()

    const vthoAmount = expandTo18Decimals(20000) // energy/vtho
    const vetAmount = expandTo18Decimals(1000) // vvet9/wvet

    await createVerocketPairVTHO_VET({ vthoAmount, vetAmount })
    await createVexchangePairVTHO_VET({ vthoAmount, vetAmount })

    const reserveBalance = expandTo18Decimals(5)
    const withdrawAmount = expandTo18Decimals(500)
    const amountOutMin = BigInt(100)

    // Transfer some VTHO to the target contract
    const tx1 = await energy.connect(alice).transfer(noFallbackAddr, BigInt(2) * withdrawAmount)
    await tx1.wait(1)

    const tx2 = await noFallback.connect(alice).approveEnergyAllowance()
    await tx2.wait(1)

    const tx3 = await noFallback.connect(alice).saveConfig(reserveBalance)
    await tx3.wait(1)

    // Act + assert
    await expect(trader.connect(keeper).swap(noFallbackAddr, withdrawAmount, amountOutMin)).to.be.rejectedWith(
      'execution reverted: TransferHelper::safeTransferETH: ETH transfer failed'
    )
  })

  // For some reason we cannot match the error message on the expect statement
  it('should revert if amountOutMin is larger than the amountOut yielded by the DEX', async () => {
    // Arrange
    const {
      energy,
      energyAddr,
      baseGasPrice,
      trader,
      traderAddr,
      SWAP_GAS,
      verocket,
      vexWrapper,
      keeper,
      alice,
      createVerocketPairVTHO_VET,
      createVexchangePairVTHO_VET,
    } = await fixture()

    const vthoAmount = expandTo18Decimals(20000) // energy/vtho
    const vetAmount = expandTo18Decimals(1000) // vvet9/wvet

    await createVerocketPairVTHO_VET({ vthoAmount, vetAmount })
    await createVexchangePairVTHO_VET({ vthoAmount, vetAmount })

    const reserveBalance = expandTo18Decimals(5)
    const withdrawAmount = expandTo18Decimals(500)
    // ^ baseGasPrice is 1e^15 2 orders of magnitude higher than on live networks
    // therefore we need to increase the min withdrawAmount for the txFee to be
    // less or equal the withdrawAmount

    await saveConfig(trader, alice, reserveBalance)
    await approveToken(energy, alice, traderAddr, MaxUint256)

    const { amountIn } = await calcSwapFees(trader, SWAP_GAS, baseGasPrice, withdrawAmount)
    const amountOut = await calcDexAmountOut([verocket.router, vexWrapper], energyAddr, amountIn)

    const amountOutMin = amountOut + BigInt(1)

    // Act + assert
    await expect(swap(trader, keeper, alice.address, withdrawAmount, amountOutMin)).to.be.rejected
  })

  it('should revert if account does not set a reserve balance', async () => {
    // Arrange
    const { energy, trader, traderAddr, keeper, alice } = await fixture()

    const withdrawAmount = expandTo18Decimals(500)
    const amountOutMin = BigInt(100)

    // Do NOT set reserveBalance
    await approveToken(energy, alice, traderAddr, MaxUint256)

    // Act + assert
    await expect(swap(trader, keeper, alice.address, withdrawAmount, amountOutMin)).to.be.rejectedWith(
      'Trader: reserve not initialized'
    )
  })

  it('should revert if account does not approve energy', async () => {
    // Arrange
    const { trader, keeper, alice } = await fixture()

    const reserveBalance = expandTo18Decimals(5)
    const withdrawAmount = expandTo18Decimals(500)
    const amountOutMin = BigInt(100)

    // Do NOT approve energy
    await saveConfig(trader, alice, reserveBalance)

    // Act + assert
    await expect(swap(trader, keeper, alice.address, withdrawAmount, amountOutMin)).to.be.rejectedWith(
      'execution reverted: builtin: insufficient allowance'
    )
  })

  it('should revert if withdrawAmount >= balance - reserveBalance', async () => {
    // Arrange
    const { energy, trader, traderAddr, keeper, alice } = await fixture()

    const aliceBalanceVTHO_0 = await energy.balanceOf(alice.address)

    const reserveBalance = expandTo18Decimals(5)
    const withdrawAmount = aliceBalanceVTHO_0 - reserveBalance
    const amountOutMin = BigInt(100)

    await saveConfig(trader, alice, reserveBalance)
    await approveToken(energy, alice, traderAddr, MaxUint256)

    // Act + assert
    for (let k of [0, 1]) {
      await expect(
        trader.connect(keeper).swap(alice.address, withdrawAmount + BigInt(k), amountOutMin)
      ).to.be.rejectedWith('execution reverted: Trader: insufficient balance')
    }
  })

  dexs.forEach((dex) => {
    it(`should emit a Swap event upon successful exchange using ${dex}`, async () => {
      // Arrange
      const {
        energy,
        energyAddr,
        baseGasPrice,
        trader,
        traderAddr,
        SWAP_GAS,
        verocket,
        vexWrapper,
        vexWrapperAddr,
        keeper,
        alice,
        createVerocketPairVTHO_VET,
        createVexchangePairVTHO_VET,
      } = await fixture()

      const vthoAmount = expandTo18Decimals(20000) // energy/vtho
      const vetAmount = expandTo18Decimals(1000) // vvet9/wvet
      const delta = expandTo18Decimals(100)

      await createVerocketPairVTHO_VET({ vthoAmount, vetAmount: dex === 'verocket' ? vetAmount + delta : vetAmount })
      await createVexchangePairVTHO_VET({ vthoAmount, vetAmount: dex === 'vexchange' ? vetAmount + delta : vetAmount })

      const reserveBalance = expandTo18Decimals(5)
      const withdrawAmount = expandTo18Decimals(500)
      // ^ baseGasPrice is 1e^15 2 orders of magnitude higher than on live networks
      // therefore we need to increase the min withdrawAmount for the txFee to be
      // less or equal the withdrawAmount
      const amountOutMin = BigInt(100)

      await saveConfig(trader, alice, reserveBalance)
      await approveToken(energy, alice, traderAddr, MaxUint256)

      const { txFee, protocolFee, amountIn } = await calcSwapFees(trader, SWAP_GAS, baseGasPrice, withdrawAmount)
      const amountOut = await calcDexAmountOut([verocket.router, vexWrapper], energyAddr, amountIn)

      function isValidRouter(router: string): boolean {
        const mapping: Record<string, string> = {
          verocket: verocket.routerAddr,
          vexchange: vexWrapperAddr,
        }
        return router === mapping[dex]
      }

      // Act + assert
      await expect(swap(trader, keeper, alice.address, withdrawAmount, amountOutMin))
        .to.emit(trader, 'Swap')
        .withArgs(
          alice.address,
          isValidRouter,
          withdrawAmount,
          baseGasPrice,
          BigInt(30),
          protocolFee,
          withdrawAmount - txFee - protocolFee,
          amountOutMin,
          amountOut,
          amountOut
        )
    })
  })

  dexs.forEach((dex) => {
    testCases.forEach(({ reserveBalance, withdrawAmount }) => {
      it(`should spend no more than SWAP_GAS estimate using ${dex}`, async () => {
        // Arrange
        const {
          energy,
          trader,
          traderAddr,
          SWAP_GAS,
          keeper,
          alice,
          createVerocketPairVTHO_VET,
          createVexchangePairVTHO_VET,
        } = await fixture()

        const vthoAmount = expandTo18Decimals(20000) // energy/vtho
        const vetAmount = expandTo18Decimals(1000) // vvet9/wvet
        const delta = expandTo18Decimals(100)

        await createVerocketPairVTHO_VET({ vthoAmount, vetAmount: dex === 'verocket' ? vetAmount + delta : vetAmount })
        await createVexchangePairVTHO_VET({
          vthoAmount,
          vetAmount: dex === 'vexchange' ? vetAmount + delta : vetAmount,
        })

        const amountOutMin = BigInt(100)

        await saveConfig(trader, alice, reserveBalance)
        await approveToken(energy, alice, traderAddr, MaxUint256)

        // Act
        const swapReceipt = await swap(trader, keeper, alice.address, withdrawAmount, amountOutMin)

        // Assert
        expect(swapReceipt?.gasUsed).to.be.lte(SWAP_GAS)
      })
    })
  })

  it('should revert if called by any account other than the keeper', async () => {
    // Arrange
    const { energy, trader, traderAddr, owner, alice, bob } = await fixture()

    const reserveBalance = expandTo18Decimals(5)
    const withdrawAmount = expandTo18Decimals(500)
    const amountOutMin = BigInt(100)

    await saveConfig(trader, alice, reserveBalance)
    await approveToken(energy, alice, traderAddr, MaxUint256)

    // Act + assert
    for (const signer of [owner, alice, bob]) {
      await expect(trader.connect(signer).swap(alice.address, withdrawAmount, amountOutMin)).to.be.rejectedWith(
        'execution reverted: Roles: account is not keeper'
      )
    }
  })

  it('should revert when both pools are empty event when amountOutMin is zero', async () => {
    // Arrange
    const { energy, trader, traderAddr, keeper, alice } = await fixture()

    // Do NOT initialize pairs

    const reserveBalance = expandTo18Decimals(5)
    const withdrawAmount = expandTo18Decimals(500)
    const amountOutMin = BigInt(0) // Keep it zero!

    await approveToken(energy, alice, traderAddr, MaxUint256)
    await saveConfig(trader, alice, reserveBalance)

    // Act + assert
    await expect(swap(trader, keeper, alice.address, withdrawAmount, amountOutMin)).to.be.rejectedWith('')
  })
})
