import type { Signer, ContractTransactionReceipt } from 'ethers'
import { Trader } from '../../../typechain-types'

export async function swap(
  trader: Trader,
  signer: Signer,
  targetAddress: string | Address,
  withdrawAmount: bigint,
  amountOutMin: bigint
): Promise<ContractTransactionReceipt | null> {
  // console.log(await trader.connect(signer).swap.estimateGas(targetAddress, withdrawAmount, amountOutMin))
  const tx = await trader.connect(signer).swap(targetAddress, withdrawAmount, amountOutMin)
  return tx.wait(1)
}
