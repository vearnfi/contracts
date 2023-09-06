import { ethers } from 'hardhat'
import chai, { expect } from 'chai'
import { solidity } from 'ethereum-waffle'
import { fixture } from './fixture'

chai.use(solidity)

const {
  utils: { parseUnits, formatUnits },
  BigNumber,
  constants,
  provider,
} = ethers

describe('Trader.swap', function () {
  it.only('should swap VTHO for VET', async function () {
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

    const tx3 = await trader.connect(admin).swap(alice.address, 100)
    const receipt = await tx3.wait()
    console.log('SWAP', `Gas used: ${receipt.gasUsed.toString()}`)

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
