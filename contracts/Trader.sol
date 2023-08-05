//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.2;

import "hardhat/console.sol";
import { IERC20 } from "../interfaces/IERC20.sol"; // TODO: check vtho is ERC20 compliant or import from VIP160 + import from dep
import { IUniswapV2Router02 } from "@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol";

// TODO: we should be able to add server routers and choose one when calling
// the swap method
contract Trader {
  IERC20 public vtho;
  IUniswapV2Router02 public router;
  address payable public owner;
  struct SwapConfig {
    uint256 triggerAmount;
    uint256 reserveBalance;
  }
  mapping(address => SwapConfig) public configByAddress;

  event Swap(address indexed account, uint256 withdrawAmount, uint256 fees, uint256 maxRate, uint256 amountOutMin, uint256 amountOut);
  event Withdraw(address indexed to, uint256 amount);
  event Gas(uint256 gasprice);
  event SetConfig(address indexed account, uint256 triggerAmount, uint256 reserveBalance);

  constructor(address vthoAddress, address routerAddress) {
    vtho = IERC20(vthoAddress);
    router = IUniswapV2Router02(routerAddress);
    owner = payable(msg.sender);
  }

  function setConfig(
    uint256 triggerAmount,
    uint256 reserveBalance
  ) public {
		require(triggerAmount > 0, "Trader: invalid triggerAmount");
		require(reserveBalance > 0, "Trader: invalid reserveBalance");

    configByAddress[msg.sender] = SwapConfig(triggerAmount, reserveBalance);

    emit SetConfig(msg.sender, triggerAmount, reserveBalance);
  }

	/// @notice Pull vtho from user's wallet. Before pulling though,
	/// the user has to give allowance on the vtho contract.
  /// @param account Account owning the vtho tokens.
  /// @param withdrawAmount Amount of VTHO to be withdrawn from the account and swapped for VET.
  /// @param maxRate Maximum accepted exchange rate. For example `maxRate = 20` implies
  /// `you get 1 VET for every 20 vtho you deposit`. The higher the maxRate the lower the output amount in VET.
  /// OBS: we cannot pass amountOutputMin because we don't know the the gas price before hand (?)
  /// TODO: see https://solidity-by-example.org/defi/uniswap-v2/ for naming conventions
  /// TODO: check this out https://medium.com/buildbear/uniswap-testing-1d88ca523bf0
	function swap(
    address payable account,
    uint256 withdrawAmount,
    uint256 maxRate
  ) external {
    SwapConfig memory config = configByAddress[account];

		require(config.triggerAmount > 0, "Trader: invalid triggerAmount");
		require(config.reserveBalance > 0, "Trader: invalid reserveBalance");
		require(withdrawAmount >= config.triggerAmount, "Trader: unauthorized amount");
		require(vtho.balanceOf(account) >= withdrawAmount, "Trader: insufficient funds");
    // require(exchangeRouter != address(0), "exchangeRouter needs to be set");

    // TODO: should we use safeTransferFrom? See TransferHelper UniV3 periphery
		require(vtho.transferFrom(account, address(this), withdrawAmount), "Trader: transferFrom failed");

    // TODO: substract fee and transaction cost
    // TODO: This could potentially throw if tx fee > withdrawAmount
    uint256 fees = (withdrawAmount * 3) / 1_000 + tx.gasprice * 5; // TODO: replace 5 with the amount of gas required to run the `swap` function
    uint256 amountIn = withdrawAmount - fees;
    uint256 amountOutMin = amountIn / maxRate; // lower bound to the expected output amount

    // TODO: should we use safeApprove? See TransferHelper UniV3 periphery
    require(
        vtho.approve(address(router), amountIn),
        "Trader: approve failed."
    );

    // TODO: amountOutMin must be retrieved from an oracle of some kind
    address[] memory path = new address[](2);
    path[0] = address(vtho);
    path[1] = router.WETH(); // TODO: how to test this? See https://ethereum.stackexchange.com/questions/114170/unit-testing-uniswapv2pair-function-call-to-a-non-contract-account
    uint[] memory amounts = router.swapExactTokensForETH(
      amountIn,
      amountOutMin,
      path,
      account,
      block.timestamp // What about deadline?
    );

		emit Swap(account, withdrawAmount, fees, maxRate, amountOutMin, amounts[amounts.length - 1]);
    emit Gas(tx.gasprice);
	}
}
