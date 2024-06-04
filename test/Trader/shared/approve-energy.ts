import type { Signer, ContractTransactionReceipt, AddressLike } from 'ethers'
import { Energy } from '../../../typechain-types'

export async function approveEnergy(
  energy: Energy,
  signer: Signer,
  spender: string | Address | AddressLike,
  amount: bigint
): Promise<ContractTransactionReceipt | null> {
  const tx = await energy.connect(signer).approve(spender, amount)
  return tx.wait(1)
}
