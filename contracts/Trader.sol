//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "hardhat/console.sol";
import { IERC20 } from "../interfaces/IERC20.sol";
import { IUniswapV2Router02 } from "../interfaces/IUniswapV2Router02.sol";

contract Trader {
  IERC20 public VTHO;
  IUniswapV2Router02 public UniswapV2Router02;
  address payable public owner;
  // address public exchangeRouter;

  event Deposit(address from, uint256 amount);
  event Withdraw(address to, uint256 amount);

  constructor(address vthoAddr, address router) {
    VTHO = IERC20(vthoAddr);
    UniswapV2Router02 = IUniswapV2Router02(router);
    owner = payable(msg.sender);
  }

	/// @notice Pull VTHO from user's wallet. Before pulling though,
	/// the user has to give allowance on the VTHO contract.
  /// @param amountIn The amount of VTHO pulled from the user's address.
	function pull(address payable sender, uint256 amountIn, uint256 minRate) external {
		require(amountIn > 0, "Trader: Invalid amount");
		require(VTHO.balanceOf(sender) > amountIn, "Trader: Insufficient amount");
    // require(exchangeRouter != address(0), "exchangeRouter needs to be set");

    // TODO: substract FEE and transaction cost

		require(VTHO.transferFrom(sender, address(this), amountIn), "Trader: Pull failed");
		emit Deposit(sender, amountIn);

    uint256 amountOutMin = amountIn / minRate;

    require(
        VTHO.approve(address(UniswapV2Router02), amountIn),
        "Trader: approve failed."
    );

    // amountOutMin must be retrieved from an oracle of some kind
    address[] memory path = new address[](2);
    path[0] = address(VTHO);
    path[1] = UniswapV2Router02.WETH();
    UniswapV2Router02.swapExactTokensForETH(
      amountIn,
      amountOutMin,
      path,
      sender,
      block.timestamp
    );
	}
}
