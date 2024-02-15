import { expandTo18Decimals } from './expand-to-18-decimals'

export function calcVthoGrowth(initVetBalance: bigint, blocks: number): bigint {
  return (initVetBalance * BigInt(5_000_000_000) * BigInt(blocks)) / expandTo18Decimals(1)
}
