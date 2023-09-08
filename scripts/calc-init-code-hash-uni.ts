import { keccak256 } from '@ethersproject/solidity'
import * as pairArtifact from '../artifacts/contracts/uniswap/v2-core/UniswapV2Pair.sol/UniswapV2Pair.json'

// See: https://github.com/Uniswap/v2-core/issues/102
try {
  const COMPUTED_INIT_CODE_HASH = keccak256(['bytes'], [pairArtifact.bytecode])
  console.log({ COMPUTED_INIT_CODE_HASH })
} catch (error) {
  console.log(error)
}
