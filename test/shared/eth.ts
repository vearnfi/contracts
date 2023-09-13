import { ethers } from 'hardhat'
import type { BigNumber } from 'ethers'

/**
 * Expand amount to 18 decimals.
 * @param {number} amount Amount to be expanded.
 * @return {BigNumber} Expanded representation of the given number.
 */
export function eth(amount: number): BigNumber {
  return ethers.utils.parseUnits(amount.toString(), 18)
}
