import type { Signer, ContractTransactionReceipt } from 'ethers'
import { Trader } from '../../typechain-types'

export async function saveConfig(
  trader: Trader,
  signer: Signer,
  reserveBalance: bigint,
): Promise<ContractTransactionReceipt | null> {
  const tx = await trader.connect(signer).saveConfig(reserveBalance)
  return tx.wait(1)
}
