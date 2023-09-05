import { ethers } from 'hardhat'
import chai, { expect } from 'chai'
import { solidity } from 'ethereum-waffle'
import { fixture } from './fixture'

chai.use(solidity)

const {
  getSigner,
  getSigners,
  getContractFactory,
  utils: { parseUnits, formatUnits, hexlify, FormatTypes },
  Contract,
  ContractFactory,
  BigNumber,
  constants,
  provider,
} = ethers

describe.skip('Trader.withdraw', function () {
  it('should swap VTHO for VET', async function () {
    const { energy, trader, admin, alice, bob } = await fixture()

    // const amount = parseUnits("50", await vtho.decimals());
    // console.log({ amount });
    const aliceVET0 = await provider.getBalance(alice.address)
    const aliceVTHO0: typeof BigNumber = await energy.balanceOf(alice.address)
    console.log({ aliceVTHO0, format: formatUnits(aliceVTHO0.toString(), 18) })

    const tx1 = await energy.connect(alice).approve(trader.address, constants.MaxUint256)
    await tx1.wait()
    console.log('APPROVE')

    const tx2 = await trader.connect(alice).saveConfig(parseUnits('50', 18), parseUnits('5', 18))
    await tx2.wait()
    console.log('SAVE CONFIG')

    //================
    // const amount = parseUnits('1000', 18)
    // console.log({ amount, format: formatUnits(amount.toString(), 18) })

    // // Burn some tokens to get a fixed VTHO balance
    // const tx0 = await energy.connect(alice).transfer(constants.AddressZero, aliceVTHO0.sub(amount))
    // await tx0.wait()

    // const aliceVTHO1: typeof BigNumber = await energy.balanceOf(alice.address)
    // console.log({ afterBurnBalance: aliceVTHO1, format: formatUnits(aliceVTHO1.toString(), 18) })

    // // expect(aliceVTHO1).to.equal(amount)
    // console.log('BURNT')
    //================

    const tx3 = await trader.connect(admin).swap(alice.address, 100)
    await tx3.wait()
    console.log('SWAP')

    const aliceVET1 = await provider.getBalance(alice.address)
    // Veify correct balances
    // expect(await vtho.balanceOf(greeter.address)).to.equal(amount);
    expect(aliceVET1).to.be.gt(aliceVET0)

    console.log({ aliceVET0, aliceVET1 })
    // // expect(await greeter.balanceOf(alice.address)).to.equal(amount);
    // expect(await vtho.balanceOf(trader.address)).to.equal(
    //   greeterBalance.add(amount)
    // );
  })

  // TODO: test fees
})
