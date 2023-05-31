//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "hardhat/console.sol";
import { IERC20 } from "../interfaces/IERC20.sol";
import { IUniswapV2Router02 } from "../interfaces/IUniswapV2Router02.sol";

// TODO: we should be able to add server routers and choose one when calling
// the swap method
contract Trader {
  IERC20 public VTHO;
  IUniswapV2Router02 public UniswapV2Router02;
  address payable public owner;
  // address public exchangeRouter;

  event Swap(address account, uint256 amountIn, uint256 minRate, uint256 amountOutMin);
  event Withdraw(address to, uint256 amount);

  constructor(address vthoAddr, address router) {
    VTHO = IERC20(vthoAddr);
    UniswapV2Router02 = IUniswapV2Router02(router);
    owner = payable(msg.sender);
  }

	/// @notice Pull VTHO from user's wallet. Before pulling though,
	/// the user has to give allowance on the VTHO contract.
  /// @param account Account owning the VTHO tokens.
  /// @param amountIn Amount of VTHO to be swapped for VET.
  /// @param minRate Minimum accepted exchange rate.
	function swap(
    address payable account,
    uint256 amountIn,
    uint256 minRate
  ) external {
		require(amountIn > 0, "Trader: invalid amount");
		require(VTHO.balanceOf(account) > amountIn, "Trader: insufficient amount");
    // require(exchangeRouter != address(0), "exchangeRouter needs to be set");

    // TODO: substract fees and transaction cost

		require(VTHO.transferFrom(account, address(this), amountIn), "Trader: transferFrom failed");

    uint256 amountOutMin = amountIn / minRate;

    require(
        VTHO.approve(address(UniswapV2Router02), amountIn),
        "Trader: approve failed."
    );

    // TODO: amountOutMin must be retrieved from an oracle of some kind
    address[] memory path = new address[](2);
    path[0] = address(VTHO);
    path[1] = UniswapV2Router02.WETH();
    UniswapV2Router02.swapExactTokensForETH(
      amountIn,
      amountOutMin,
      path,
      account,
      block.timestamp
    );

		emit Swap(account, amountIn, minRate, amountOutMin);
	}
}
