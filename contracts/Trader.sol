//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.2;

import "hardhat/console.sol";
import { IERC20 } from "../interfaces/IERC20.sol"; // TODO: check VTHO is ERC20 compliant or import from VIP160 + import from dep
import { IUniswapV2Router02 } from "@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol";

// TODO: we should be able to add server routers and choose one when calling
// the swap method
contract Trader {
  IERC20 public VTHO;
  IUniswapV2Router02 public UniswapV2Router02;
  address payable public owner;
  // address public exchangeRouter;

  event Swap(address indexed account, uint256 amountIn, uint256 fees, uint256 minRate, uint256 amountOutMin, uint256 amountOut);
  event Withdraw(address indexed to, uint256 amount);
  event Gas(uint256 gasprice);

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

		require(VTHO.transferFrom(account, address(this), amountIn), "Trader: transferFrom failed");

    // TODO: substract fee and transaction cost
    uint256 fees = (amountIn * 3) / 1_000 + tx.gasprice * 5_000; // TODO: replace 5_000 with the amount of gas required to run the `swap` function
    uint256 _amountIn = amountIn - fees;
    uint256 amountOutMin = _amountIn / minRate;

    require(
        VTHO.approve(address(UniswapV2Router02), _amountIn),
        "Trader: approve failed."
    );

    // TODO: amountOutMin must be retrieved from an oracle of some kind
    address[] memory path = new address[](2);
    path[0] = address(VTHO);
    path[1] = UniswapV2Router02.WETH(); // TODO: how do I test this?
    uint[] memory amounts = UniswapV2Router02.swapExactTokensForETH(
      _amountIn,
      amountOutMin,
      path,
      account,
      block.timestamp
    );

		emit Swap(account, amountIn, fees, minRate, amountOutMin, amounts[amounts.length - 1]);
    emit Gas(tx.gasprice);
	}
}
