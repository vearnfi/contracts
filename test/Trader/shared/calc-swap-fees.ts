import { Trader } from '../../../typechain-types'

type Output = {
  txFee: bigint
  protocolFee: bigint
  amountIn: bigint
}

export async function calcSwapFees(
  trader: Trader,
  swapGas: bigint,
  baseGasPrice: bigint,
  withdrawAmount: bigint
): Promise<Output> {
  const feeMultiplier = await trader.feeMultiplier()

  const txFee = swapGas * baseGasPrice
  const protocolFee = ((withdrawAmount - txFee) * feeMultiplier) / BigInt(10_000)
  const amountIn = withdrawAmount - txFee - protocolFee

  return {
    txFee,
    protocolFee,
    amountIn,
  }
}
