import type { Signer, ContractReceipt } from 'ethers'
import { Trader } from '../../typechain-types'

export async function setAdmin(trader: Trader, signer: Signer, account: string | Address): Promise<ContractReceipt> {
  const tx = await trader.connect(signer).setAdmin(account)
  return tx.wait(1)
}
