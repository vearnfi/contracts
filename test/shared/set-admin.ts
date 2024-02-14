import type { Signer, ContractTransactionReceipt } from 'ethers'
import { Trader } from '../../typechain-types'

export async function setAdmin(
  trader: Trader,
   signer: Signer,
    account: string | Address
): Promise<ContractTransactionReceipt | null> {
  const tx = await trader.connect(signer).setAdmin(account)
  return tx.wait(1)
}
