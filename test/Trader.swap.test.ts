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
  it.only('should swap VTHO for VET when balance is above triggerBalance', async function () {
    const { energy, trader, admin, alice, SWAP_GAS_AMOUNT } = await fixture()

    const reserveBalance = parseUnits('5', 18)
    const triggerBalance = parseUnits('50', 18)
    const exchangeRate = 100

    // Get VET balance before swap
    const aliceBalanceVET_0 = await provider.getBalance(alice.address)
    // Approve, config and swap
    const tx1 = await energy.connect(alice).approve(trader.address, constants.MaxUint256)
    await tx1.wait()
    const tx2 = await trader.connect(alice).saveConfig(triggerBalance, reserveBalance)
    await tx2.wait()
    const tx3 = await trader.connect(admin).swap(alice.address, exchangeRate)
    const swapReceipt = await tx3.wait()
    // Get VET balance after swap
    const aliceBalanceVET_1 = await provider.getBalance(alice.address)

    // Make sure gas spent is as expected
    expect(swapReceipt.gasUsed).to.eq(SWAP_GAS_AMOUNT)
    console.log('GAS USED')
    // Make sure VET balance has increased
    expect(aliceBalanceVET_1).to.be.gt(aliceBalanceVET_0)
    console.log('BALANCE')
    // TODO: Calculate exact VET output
  })

  // TODO: create several test cases:
  // 1. balance >= MAX_VTHO_WITHDRAWAL_AMOUNT + reserveBalance
  // 2. balance = MAX_VTHO_WITHDRAWAL_AMOUNT + reserveBalance - 1
  // 3. balance = MAX_VTHO_WITHDRAWAL_AMOUNT + 1
  // 4. balance = MAX_VTHO_WITHDRAWAL_AMOUNT - 1
  // 5. balance = triggerBalance
  it('should store protocol and transaction fees into the contract after the swap', async function () {
    const { energy, trader, owner, admin, alice, bob, SWAP_GAS_AMOUNT, MAX_VTH0_WITHDRAW_AMOUNT, } = await fixture()

    const aliceBalanceVET = await provider.getBalance(alice.address)
    const aliceBalanceVTHO = await energy.balanceOf(alice.address)

    const reserveBalance = parseUnits('5', 18)
    const triggerBalance = parseUnits('50', 18)

    const traderBalanceVTHO_0 = await energy.balanceOf(trader.address)
    expect(traderBalanceVTHO_0).to.eq(0)
    console.log('EMPTY CONTRACT BALANCE')

    // Approve, save config and swap
    const tx1 = await energy.connect(alice).approve(trader.address, constants.MaxUint256)
    await tx1.wait()
    const tx2 = await trader.connect(alice).saveConfig(triggerBalance, reserveBalance)
    await tx2.wait()
    const tx3 = await trader.connect(admin).swap(alice.address, 100)
    const receipt = await tx3.wait()

    // Read Swap event
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
  // pool size and fees --> An OMG buyer sends 1 ETH to the contract. A 0.25% fee is taken out for the liquidity providers, and the remaining 0.9975 ETH is added to ETH_pool.

//   10 ETH and 500 OMG (ERC20) are deposited into a smart contract by liquidity providers. An invariant is automatically set such that ETH_pool * OMG_pool = invariant.

//     ETH_pool = 10

//     OMG_pool = 500

//     invariant = 10 * 500 = 5000

// An OMG buyer sends 1 ETH to the contract. A 0.25% fee is taken out for the liquidity providers, and the remaining 0.9975 ETH is added to ETH_pool. Next, the invariant is divided by the new amount of ETH in the liquidity pool to determine the new size of OMG_pool. The remaining OMG is sent to the buyer.

//     Buyer sends: 1 ETH

//     Fee = 1 ETH * 2.5 / 1000 = 0.0025 ETH

//     ETH_pool = 10 + 1 - 0.0025 = 10.9975

//     OMG_pool = 5000/10.9975 = 454.65

//     Buyer receieves: 500 - 454.65 = 45.35 OMG

// The fee is now added back into the liquidity pool, which acts as a payout to liquidity providers that is collected when liquidity is removed from the market. Since the fee is added after price calculation, the invariant increases slightly with every trade, making the system profitable for liquidity providers. In fact, what the invariant really represents is ETH_pool * OMG_pool at the end of the previous trade.

//     ETH_pool = 10.9975 + 0.0025 = 11

//     OMG_pool = 454.65

//     new invariant = 11 * 454.65 = 5,001.15

// In this case the buyer received a rate of 45.35 OMG/ETH. However the price has shifted. If another buyer makes a trade in the same direction, they will get a slightly worse rate of OMG/ETH. However, if a buyer makes a trade in the opposite direction they will get a slightly better ETH/OMG rate.

  // TODO: test fees

  // TODO: swap should fail if attempting a swap with balance < triggerBalance
})

// import { ethers } from 'hardhat'
// import chai, { expect } from 'chai'
// import { solidity } from 'ethereum-waffle'
// import { fixture } from './shared/fixture'

// chai.use(solidity)

// const {
//   utils: { parseUnits, formatUnits },
//   BigNumber: { from: bn },
//   constants,
//   provider,
// } = ethers

// describe('Trader.swap', function () {
//   it('should swap VTHO for VET when balance is above triggerBalance', async function () {
//     const { alice, SWAP_GAS_AMOUNT, approve, saveConfig, swap } = await fixture()

//     const reserveBalance = parseUnits('5', 18)
//     const triggerBalance = parseUnits('50', 18)
//     const exchangeRate = 100

//     // Get VET balance before swap
//     const aliceBalanceVET_0 = await provider.getBalance(alice.address)
//     // Approve, config and swap
//     await approve(alice)
//     await saveConfig(alice, reserveBalance, triggerBalance)
//     const swapReceipt = await swap(alice.address, exchangeRate)
//     // Get VET balance after swap
//     const aliceBalanceVET_1 = await provider.getBalance(alice.address)

//     // Make sure gas spent is as expected
//     expect(swapReceipt.gasUsed).to.eq(SWAP_GAS_AMOUNT)
//     // Make sure VET balance has increased
//     expect(aliceBalanceVET_1).to.be.gt(aliceBalanceVET_0)
//     // TODO: Calculate exact VET output
//   })

//   // describe('Fees accrual', function () {
//   //   // TODO: MAX_VTHO_WITHDRAWAL_AMOUNT should be fetched from the contract
//   //   const MAX_VTHO_WITHDRAWAL_AMOUNT = parseUnits('1000', 18)
//   //   const reserveBalance = parseUnits('5', 18)
//   //   const triggerBalance = parseUnits('50', 18)
//   //   const exchangeRate = 100

//   //   const testCases = [
//   //     // 1. balance >= MAX_VTHO_WITHDRAWAL_AMOUNT + reserveBalance
//   //     MAX_VTHO_WITHDRAWAL_AMOUNT.add(reserveBalance).add(1),
//   //     // 2. balance = MAX_VTHO_WITHDRAWAL_AMOUNT + reserveBalance - 1
//   //     MAX_VTHO_WITHDRAWAL_AMOUNT.add(reserveBalance).sub(1),
//   //     // 3. balance = MAX_VTHO_WITHDRAWAL_AMOUNT + 1
//   //     MAX_VTHO_WITHDRAWAL_AMOUNT.add(1),
//   //     // 4. balance = MAX_VTHO_WITHDRAWAL_AMOUNT - 1
//   //     MAX_VTHO_WITHDRAWAL_AMOUNT.sub(1),
//   //     // 5. balance = triggerBalance
//   //     triggerBalance,
//   //   ]

//     // testCases.forEach((balance) => {
//       it.only('should store protocol and transaction fees into the contract after the swap', async function () {
//         const {
//           energy,
//           trader,
//           owner,
//           admin,
//           alice,
//           bob,
//           SWAP_GAS_AMOUNT,
//           MAX_VTH0_WITHDRAW_AMOUNT,
//           approve,
//           saveConfig,
//           swap,
//         } = await fixture()

//         const aliceBalanceVET = await provider.getBalance(alice.address)
//         const aliceBalanceVTHO = await energy.balanceOf(alice.address)

//         const traderBalanceVTHO_0 = await energy.balanceOf(trader.address)

//         expect(traderBalanceVTHO_0).to.eq(0)

//     const reserveBalance = parseUnits('5', 18)
//     const triggerBalance = parseUnits('50', 18)
//     const exchangeRate = 100

//         // Approve, save config and swap
//         await approve(alice)
//         await saveConfig(alice, triggerBalance, reserveBalance)
//         const swapReceipt = await swap(alice.address, exchangeRate)

//         // Get Swap event
//         const swapEvent = swapReceipt.events?.find((event) => event.event === 'Swap')

//         expect(swapEvent).not.to.be.undefined
//         expect(swapEvent?.args).not.to.be.undefined

//         if (swapEvent == null || swapEvent.args == null) return

//         const { args } = swapEvent

//         const withdrawAmount = bn(args[1])
//         const gasprice = bn(args[2])
//         const protocolFee = bn(args[3])

//         const txFee = gasprice.mul(SWAP_GAS_AMOUNT)

//         console.log({ protocolFee: protocolFee.toString() })
//         console.log({ withdrawAmount: withdrawAmount.toString() })
//         console.log({ MAX_VTH0_WITHDRAW_AMOUNT: MAX_VTH0_WITHDRAW_AMOUNT.toString() })
//         console.log({ aliceBalanceVTHO: aliceBalanceVTHO.toString() })

//         // if aliceBalanceVTHO >= MAX_VTHO_WITHDRAWAL_AMOUNT => withdrawAmount === MAX_VTHO_WITHDRAWAL_AMOUNT - reserveBalance
//         // if aliceBalanceVTHO < MAX_VTHO_WITHDRAWAL_AMOUNT && aliceBalanceVTHO >= triggerBalance => withdrawAmount === aliceBalance - reserveBalance

//         const traderBalanceVTHO_1 = await energy.balanceOf(trader.address)
//         console.log({ contractBalanceVTHO: traderBalanceVTHO_1.toString() })
//         expect(aliceBalanceVTHO).to.be.gte(triggerBalance)
//         console.log('TRIGGER')
//         // TODO: create 2 different test cases
//         expect(withdrawAmount).to.eq(
//           aliceBalanceVTHO.gte(MAX_VTH0_WITHDRAW_AMOUNT.add(reserveBalance))
//             ? MAX_VTH0_WITHDRAW_AMOUNT
//             : aliceBalanceVTHO.sub(reserveBalance),
//         )
//         console.log('WITHDRAW')
//         expect(protocolFee).to.eq(withdrawAmount.sub(gasprice.mul(SWAP_GAS_AMOUNT)).mul(3).div(1000))
//         console.log('PROTO FEE')
//         expect(traderBalanceVTHO_1).to.eq(protocolFee.add(txFee))
//         console.log('CONTRACT BALANCE')
//       })
//     // })
//   // })

//   // TODO: try to estimate the exact swap output (VET amount) based on
//   // pool size and fees

//   // TODO: test fees

//   // TODO: swap should fail if attempting a swap with balance < triggerBalance
// })
