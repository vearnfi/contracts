import { ethers } from 'hardhat'
import type { BigNumber } from 'ethers'
import chai, { expect } from 'chai'
import { solidity } from 'ethereum-waffle'
import { fixture } from './shared/fixture'
import { expandTo18Decimals } from './shared/expand-to-18-decimals'
import { saveConfig } from './shared/save-config'
import { approveEnergy } from './shared/approve-energy'
import { swap } from './shared/swap'

chai.use(solidity)

const {
  BigNumber: { from: bn },
  constants,
  provider,
} = ethers

// TODO: see chai matches `to.changeTokenBalances` and `to.changeEtherBalance`
// TODO: what happens if the account is actually a contract? Anything that might go wrong?
// TODO: test small withdrawAmount
describe('Trader.swap', function () {
  it('should exchange VTHO for VET when the method is called by the admin', async function () {
    const { energy, trader, admin, alice } = await fixture()

    const reserveBalance = expandTo18Decimals(5)
    const withdrawAmount = expandTo18Decimals(500)
    const exchangeRate = 100

    // Get VET balance before swap
    const aliceBalanceVET_0 = await provider.getBalance(alice.address)

    // Config, approve and swap
    await approveEnergy(energy, alice, trader.address, constants.MaxUint256)
    await saveConfig(trader, alice, reserveBalance)
    const swapReceipt = await swap(trader, admin, alice.address, 0, withdrawAmount, exchangeRate)
    // ^ TODO: get gasUsed and gasPrice
    console.log({swapReceipt: JSON.stringify(swapReceipt, null, 2)})

    // Get VET balance after swap
    const aliceBalanceVET_1 = await provider.getBalance(alice.address)

    // Make sure VET balance has increased
    expect(aliceBalanceVET_1).to.be.gt(aliceBalanceVET_0)
    // TODO: Calculate exact VET fees
    // expect(traderBalance).to.equal(...)
  })

  it('should emit a Swap event upon successful exchange', async function () {
    const { energy, trader, admin, alice } = await fixture()

    const reserveBalance = expandTo18Decimals(5)
    const withdrawAmount = expandTo18Decimals(500)
    // ^ baseGasPrice is 2 orders of magnitude higher than on live networks
    const exchangeRate = 100

    // Approve, config and swap
    await saveConfig(trader, alice, reserveBalance)
    await approveEnergy(energy, alice, trader.address, constants.MaxUint256)
    const swapReceipt = await swap(trader, admin, alice.address, 0, withdrawAmount, exchangeRate)
    // ^ TODO: get gasUsed and gasPrice

    const swapEvent = swapReceipt.events?.find((event) => event.event === 'Swap')

    expect(swapEvent).not.to.be.undefined
    expect(swapEvent?.args).not.to.be.undefined
    console.log('SWAP EVENT')

    if (swapEvent == null || swapEvent.args == null) return

    const { args: swapArgs } = swapEvent

    const gasPrice = bn(swapArgs[2])
    const gasLeft = bn(swapArgs[3])
    const protocolFee = bn(swapArgs[4])

    console.log({
      gasPrice: gasPrice.toString(),
      gasLeft: gasLeft.toString(),
      protocolFee: protocolFee.toString(),
      gasUsed: swapReceipt.gasUsed.toString(),
    })
  })

  it.only('should spend the correct amount of gas', async function () {
    const { energy, trader, admin, alice, SWAP_GAS } = await fixture()

    const reserveBalance = expandTo18Decimals(5)
    const withdrawAmount = expandTo18Decimals(500)
    const exchangeRate = 100

    // Config, approve and swap
    await saveConfig(trader, alice, reserveBalance)
    await approveEnergy(energy, alice, trader.address, constants.MaxUint256)
    const swapReceipt = await swap(trader, admin, alice.address, 0, withdrawAmount, exchangeRate)

    // Make sure gas spent is as expected
    expect(swapReceipt.gasUsed).to.equal(SWAP_GAS)
  })

  it('should revert if called by any account other than the admin', async function () {
    const { energy, trader, owner, alice, bob } = await fixture()

    const reserveBalance = expandTo18Decimals(5)
    const withdrawAmount = expandTo18Decimals(500)
    const exchangeRate = 100

    // Config, approve and swap
    await saveConfig(trader, alice, reserveBalance)
    await approveEnergy(energy, alice, trader.address, constants.MaxUint256)

    for (const signer of [owner, alice, bob]) {
      await expect(trader.connect(signer).swap(alice.address, 0, withdrawAmount, exchangeRate)).to.be.reverted
    }
  })

  describe.skip('Fees accrual', function () {
    const _MAX_WITHDRAW_AMOUNT = expandTo18Decimals(1000)
    const reserveBalance = expandTo18Decimals(5)
    const withdrawAmount = expandTo18Decimals(50)
    const exchangeRate = 100

    const testCases: { balance: BigNumber; withdrawAmount: BigNumber }[] = [
      {
        // 1. balance > MAX_WITHDRAW_AMOUNT + reserveBalance => withdrawAmount = MAX_WITHDRAW_AMOUNT
        balance: _MAX_WITHDRAW_AMOUNT.add(reserveBalance).add(1),
        withdrawAmount: _MAX_WITHDRAW_AMOUNT,
      },
      // {
      //   // 2. balance === MAX_WITHDRAW_AMOUNT + reserveBalance => withdrawAmount = MAX_WITHDRAW_AMOUNT
      //   balance: _MAX_WITHDRAW_AMOUNT.add(reserveBalance),
      //   withdrawAmount: _MAX_WITHDRAW_AMOUNT,
      // },
      // {
      //   // 3. balance === MAX_WITHDRAW_AMOUNT + reserveBalance - 1 => withdrawAmount = balance - reserveBalance
      //   balance: _MAX_WITHDRAW_AMOUNT.add(reserveBalance).sub(1),
      //   withdrawAmount: _MAX_WITHDRAW_AMOUNT.sub(1),
      // },
      // {
      //   // 4. balance === MAX_WITHDRAW_AMOUNT + 1 => withdrawAmount = balance - reserveBalance
      //   balance: _MAX_WITHDRAW_AMOUNT.add(1),
      //   withdrawAmount: _MAX_WITHDRAW_AMOUNT.add(1).sub(reserveBalance),
      // },
      // {
      //   // 5. balance === MAX_WITHDRAW_AMOUNT - 1 => withdrawAmount = balance - reserveBalance
      //   balance: _MAX_WITHDRAW_AMOUNT.sub(1),
      //   withdrawAmount: _MAX_WITHDRAW_AMOUNT.sub(1).sub(reserveBalance),
      // },
      // {
      //   // 6. balance === withdrawAmount => withdrawAmount = balance - reserveBalance
      //   balance: withdrawAmount,
      //   withdrawAmount: withdrawAmount.sub(reserveBalance),
      // },
    ]

    for (const { balance, withdrawAmount } of testCases) {
      it('should store protocol and transaction fees into the Trader contract after the swap', async function () {
        const { energy, trader, god, owner, admin, alice, bob, SWAP_GAS, MAX_WITHDRAW_AMOUNT } = await fixture()

        console.log({ balance: balance.toString() })

        expect(_MAX_WITHDRAW_AMOUNT).to.equal(MAX_WITHDRAW_AMOUNT)

        const traderBalanceVTHO_0 = await energy.balanceOf(trader.address)
        expect(traderBalanceVTHO_0).to.equal(0)
        console.log('EMPTY CONTRACT BALANCE')

        // Transfer some funds to bob to pay for txs
        const tx0 = await energy.connect(alice).transfer(bob.address, expandTo18Decimals(1000))
        await tx0.wait()
        console.log('TRANSAFER FROM A TO B')

        console.log({ gasPrice: (await provider.getGasPrice()).toString() })
        // Approve and save config
        await approveEnergy(energy, bob, trader.address, constants.MaxUint256)
        console.log('APPROVE B')
        await saveConfig(trader, bob, reserveBalance)
        console.log('CONFIG B')

        // Set bob's account to the desired balance
        await approveEnergy(energy, bob, alice.address, constants.MaxUint256)
        const bobBalanceVTHO_0 = await energy.balanceOf(bob.address)
        console.log({ bobBalanceVTHO_0: bobBalanceVTHO_0.toString() })

        if (bobBalanceVTHO_0.eq(balance)) {
          // Do nothing, all set.
        } else if (bobBalanceVTHO_0.lt(balance)) {
          // Transfer from Alice to Bob
          console.log('TRANSFER')
          const tx = await energy.connect(alice).transfer(bob.address, balance.sub(bobBalanceVTHO_0))
          tx.wait()
        } else {
          // Burn some tokens somehow without Bob paying for the fees, otherwise balance won't be as expected
          // console.log("BURN", {substraction: bobBalanceVTHO_0.sub(balance).toString(), })
          const tx = await energy.connect(alice).transferFrom(bob.address, alice.address, bobBalanceVTHO_0.sub(balance))
          tx.wait()
        }

        const bobBalanceVTHO_1 = await energy.balanceOf(bob.address)
        console.log({ bobBalanceVTHO_1: bobBalanceVTHO_1.toString() })
        expect(bobBalanceVTHO_1).to.equal(balance)
        console.log('BOB EXACT BALANCE')

        // Swap
        const swapReceipt = await swap(trader, admin, bob.address, 0, withdrawAmount, exchangeRate)

        // Read Swap event
        const swapEvent = swapReceipt.events?.find((event) => event.event === 'Swap')

        expect(swapEvent).not.to.be.undefined
        expect(swapEvent?.args).not.to.be.undefined
        console.log('SWAP EVENT')

        if (swapEvent == null || swapEvent.args == null) return

        const { args } = swapEvent

        const _withdrawAmount = bn(args[1])
        const _gasprice = bn(args[2])
        const _protocolFee = bn(args[3])

        const txFee = _gasprice.mul(SWAP_GAS) // TODO: this should equal gasUsed * effectiveGasPrice coming from the tx receipt

        console.log({ protocolFee: _protocolFee.toString() })
        console.log({ withdrawAmount: _withdrawAmount.toString() })
        console.log({ MAX_WITHDRAW_AMOUNT: MAX_WITHDRAW_AMOUNT.toString() })
        console.log({ bobBalanceVTHO_1: bobBalanceVTHO_1.toString() })

        // if aliceBalanceVTHO >= MAX_WITHDRAW_AMOUNT => withdrawAmount === MAX_WITHDRAW_AMOUNT - reserveBalance
        // if aliceBalanceVTHO < MAX_WITHDRAW_AMOUNT && aliceBalanceVTHO >= withdrawAmount => withdrawAmount === aliceBalance - reserveBalance

        expect(bobBalanceVTHO_1).to.be.gte(withdrawAmount)
        console.log('TRIGGER')

        expect(_withdrawAmount).to.equal(withdrawAmount)
        console.log('WITHDRAW')
        expect(_protocolFee).to.equal(_withdrawAmount.sub(_gasprice.mul(SWAP_GAS)).mul(3).div(1000))
        console.log('PROTO FEE')

        const traderBalanceVTHO_1 = await energy.balanceOf(trader.address)
        // console.log({ contractBalanceVTHO: traderBalanceVTHO_1.toString() })
        expect(traderBalanceVTHO_1).to.equal(_protocolFee.add(txFee))
        console.log('CONTRACT BALANCE')
      })
    }

    // TODO: make sure only the txFee and protocolFee are kept in the contract
    // while the remaining is being sent to the DEX
  })

  // TODO: try to estimate the exact swap fees (VET amount) based on
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

  // TODO: swap should fail if attempting a swap with balance < withdrawAmount
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
//   it('should swap VTHO for VET when balance is above withdrawAmount', async function () {
//     const { alice, SWAP_GAS, approve, saveConfig, swap } = await fixture()

//     const reserveBalance = parseUnits('5', 18)
//     const withdrawAmount = parseUnits('50', 18)
//     const exchangeRate = 100

//     // Get VET balance before swap
//     const aliceBalanceVET_0 = await provider.getBalance(alice.address)
//     // Approve, config and swap
//     await approve(alice)
//     await saveConfig(alice, reserveBalance, withdrawAmount)
//     const swapReceipt = await swap(alice.address, exchangeRate)
//     // Get VET balance after swap
//     const aliceBalanceVET_1 = await provider.getBalance(alice.address)

//     // Make sure gas spent is as expected
//     expect(swapReceipt.gasUsed).to.equal(SWAP_GAS)
//     // Make sure VET balance has increased
//     expect(aliceBalanceVET_1).to.be.gt(aliceBalanceVET_0)
//     // TODO: Calculate exact VET fees
//   })

//   // describe('Fees accrual', function () {
//   //   // TODO: MAX_WITHDRAW_AMOUNT should be fetched from the contract
//   //   const MAX_WITHDRAW_AMOUNT = parseUnits('1000', 18)
//   //   const reserveBalance = parseUnits('5', 18)
//   //   const withdrawAmount = parseUnits('50', 18)
//   //   const exchangeRate = 100

//   //   const testCases = [
//   //     // 1. balance >= MAX_WITHDRAW_AMOUNT + reserveBalance
//   //     MAX_WITHDRAW_AMOUNT.add(reserveBalance).add(1),
//   //     // 2. balance = MAX_WITHDRAW_AMOUNT + reserveBalance - 1
//   //     MAX_WITHDRAW_AMOUNT.add(reserveBalance).sub(1),
//   //     // 3. balance = MAX_WITHDRAW_AMOUNT + 1
//   //     MAX_WITHDRAW_AMOUNT.add(1),
//   //     // 4. balance = MAX_WITHDRAW_AMOUNT - 1
//   //     MAX_WITHDRAW_AMOUNT.sub(1),
//   //     // 5. balance = withdrawAmount
//   //     withdrawAmount,
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
//           SWAP_GAS,
//           MAX_WITHDRAW_AMOUNT,
//           approve,
//           saveConfig,
//           swap,
//         } = await fixture()

//         const aliceBalanceVET = await provider.getBalance(alice.address)
//         const aliceBalanceVTHO = await energy.balanceOf(alice.address)

//         const traderBalanceVTHO_0 = await energy.balanceOf(trader.address)

//         expect(traderBalanceVTHO_0).to.equal(0)

//     const reserveBalance = parseUnits('5', 18)
//     const withdrawAmount = parseUnits('50', 18)
//     const exchangeRate = 100

//         // Approve, save config and swap
//         await approve(alice)
//         await saveConfig(alice, withdrawAmount, reserveBalance)
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

//         const txFee = gasprice.mul(SWAP_GAS)

//         console.log({ protocolFee: protocolFee.toString() })
//         console.log({ withdrawAmount: withdrawAmount.toString() })
//         console.log({ MAX_WITHDRAW_AMOUNT: MAX_WITHDRAW_AMOUNT.toString() })
//         console.log({ aliceBalanceVTHO: aliceBalanceVTHO.toString() })

//         // if aliceBalanceVTHO >= MAX_WITHDRAW_AMOUNT => withdrawAmount === MAX_WITHDRAW_AMOUNT - reserveBalance
//         // if aliceBalanceVTHO < MAX_WITHDRAW_AMOUNT && aliceBalanceVTHO >= withdrawAmount => withdrawAmount === aliceBalance - reserveBalance

//         const traderBalanceVTHO_1 = await energy.balanceOf(trader.address)
//         console.log({ contractBalanceVTHO: traderBalanceVTHO_1.toString() })
//         expect(aliceBalanceVTHO).to.be.gte(withdrawAmount)
//         console.log('TRIGGER')
//         // TODO: create 2 different test cases
//         expect(withdrawAmount).to.equal(
//           aliceBalanceVTHO.gte(MAX_WITHDRAW_AMOUNT.add(reserveBalance))
//             ? MAX_WITHDRAW_AMOUNT
//             : aliceBalanceVTHO.sub(reserveBalance),
//         )
//         console.log('WITHDRAW')
//         expect(protocolFee).to.equal(withdrawAmount.sub(gasprice.mul(SWAP_GAS)).mul(3).div(1000))
//         console.log('PROTO FEE')
//         expect(traderBalanceVTHO_1).to.equal(protocolFee.add(txFee))
//         console.log('CONTRACT BALANCE')
//       })
//     // })
//   // })

//   // TODO: try to estimate the exact swap fees (VET amount) based on
//   // pool size and fees

//   // TODO: test fees

//   // TODO: swap should fail if attempting a swap with balance < withdrawAmount
// })
