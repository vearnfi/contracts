import type { Signer, ContractTransactionReceipt } from 'ethers'
import { Trader } from '../../typechain-types'

export async function setFeeMultiplier(
  trader: Trader,
  signer: Signer,
  newFee: bigint
): Promise<ContractTransactionReceipt | null> {
  const tx = await trader.connect(signer).setFeeMultiplier(newFee)
  return tx.wait(1)
}
