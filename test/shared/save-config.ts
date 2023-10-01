import type { BigNumber, Signer, ContractReceipt } from 'ethers'
import { Trader } from '../../typechain-types'

export async function saveConfig(trader: Trader, signer: Signer, reserveBalance: BigNumber): Promise<ContractReceipt> {
  const tx = await trader.connect(signer).saveConfig(reserveBalance)
  return tx.wait(1)
}
