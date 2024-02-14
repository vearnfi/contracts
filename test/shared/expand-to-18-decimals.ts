import { ethers } from 'hardhat'

/**
 * Expand amount to 18 decimals.
 * @param {number} amount Amount to be expanded.
 * @return {bigint} Expanded representation of the given number.
 */
export function expandTo18Decimals(amount: number): bigint {
  return ethers.parseUnits(amount.toString(), 18)
}
