import type { Signer, ContractTransactionReceipt } from 'ethers'
import { Trader } from '../../typechain-types'

export async function swap(
  trader: Trader,
  signer: Signer,
  targetAddress: string | Address,
  routerIndex: number,
  withdrawAmount: bigint,
  maxRate: number
): Promise<ContractTransactionReceipt | null> {
  const tx = await trader.connect(signer).swap(targetAddress, routerIndex, withdrawAmount, maxRate)
  return tx.wait(1)
}
