import { IRouter } from '../../../typechain-types'

export async function calcDexAmountOut(
  routers: IRouter[], // [verocketRouter, vexWrapper]
  energyAddr: string,
  amountIn: bigint
): Promise<bigint> {
  let amountOut = BigInt(0)

  for (const router of routers) {
    const weth = await router.WETH()
    const amountsExpected = await router.getAmountsOut(amountIn, [energyAddr, weth])

    const amountOutExpected = amountsExpected[1]

    if (amountOutExpected > amountOut) {
      amountOut = amountOutExpected
    }
  }

  return amountOut
}
