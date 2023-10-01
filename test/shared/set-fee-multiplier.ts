import type { Signer, ContractReceipt } from 'ethers'
import { Trader } from '../../typechain-types'

export async function setFeeMultiplier(trader: Trader, signer: Signer, newFee: number): Promise<ContractReceipt> {
  const tx = await trader.connect(signer).setFeeMultiplier(newFee)
  return tx.wait(1)
}
