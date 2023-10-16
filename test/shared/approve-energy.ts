import type { BigNumber, Signer, ContractReceipt } from 'ethers'
import { Energy } from '../../typechain-types'

export async function approveEnergy(
  energy: Energy,
  signer: Signer,
  spender: string | Address,
  amount: BigNumber,
): Promise<ContractReceipt> {
  const tx = await energy.connect(signer).approve(spender, amount)
  return tx.wait(1)
}
