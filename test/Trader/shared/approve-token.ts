import type {
  Signer,
  ContractTransactionReceipt,
  AddressLike,
  BaseContract,
  BigNumberish,
  ContractRunner,
} from 'ethers'
import type { TypedContractMethod } from '../../../typechain-types/common'

export interface Token extends BaseContract {
  connect(runner?: ContractRunner | null): Token
  approve: TypedContractMethod<[_spender: AddressLike, _value: BigNumberish], [boolean], 'nonpayable'>
}

export async function approveToken(
  token: Token,
  signer: Signer,
  spender: string | Address | AddressLike,
  amount: bigint
): Promise<ContractTransactionReceipt | null> {
  const tx = await token.connect(signer).approve(spender, amount)
  return tx.wait(1)
}
