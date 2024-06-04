import { UniswapV2Router02 } from '../../../typechain-types'

export async function calcDexAmountOut(
  routers: UniswapV2Router02[],
  energyAddr: string,
  vvet9Addr: string,
  amountIn: bigint
): Promise<bigint> {
  let amountOut = BigInt(0)

  for (const router of routers) {
    const amountsExpected = await router.getAmountsOut(amountIn, [energyAddr, vvet9Addr])

    const amountOutExpected = amountsExpected[1]

    if (amountOutExpected > amountOut) {
      amountOut = amountOutExpected
    }
  }

  return amountOut
}
