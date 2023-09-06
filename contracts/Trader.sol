//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.2;

import { Math } from "@openzeppelin/contracts/utils/math/Math.sol";
import { IUniswapV2Router02 } from "@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol";
import { IEnergy } from "../interfaces/IEnergy.sol";

contract Trader {
  IEnergy private vtho = IEnergy(0x0000000000000000000000000000456E65726779);
  IUniswapV2Router02 public router;

  address payable public owner;
  uint public constant MAX_VTHO_WITHDRAWAL_AMOUNT = 1_000e18;
  // Amount of gas consumed by the swap function
  uint public constant SWAP_GAS_AMOUNT = 273057;

  struct SwapConfig {
    uint256 triggerBalance;
    uint256 reserveBalance;
  }

  mapping(address => SwapConfig) public addressToConfig;

  event Swap(
    address indexed account,
    uint256 withdrawAmount,
    uint256 gasPrice,
    uint256 protocolFee,
    uint256 maxRate,
    uint256 amountOutMin,
    uint256 amountOut
  );
  event Withdraw(address indexed to, uint256 amount);
  event Config(address indexed account, uint256 triggerBalance, uint256 reserveBalance);

  /// @dev Prevents calling a function from anyone except the owner
  modifier onlyOwner() {
    require(msg.sender == owner);
    _;
  }

  constructor(address routerAddress) {
    require(routerAddress != address(0), "Trader: router not set");

    owner = payable(msg.sender);
    router = IUniswapV2Router02(routerAddress);
  }

  function saveConfig(
    uint256 triggerBalance,
    uint256 reserveBalance
  ) public {
		require(triggerBalance > 0, "Trader: invalid triggerBalance");
		require(reserveBalance > 0, "Trader: invalid reserveBalance");
    require(triggerBalance > reserveBalance, "Trader: invalid config");
    // TODO: reserveBalance < MAX_VTHO_WITHDRAWAL_AMOUNT
    // TODO: what about triggerBalance < MAX_...

    addressToConfig[msg.sender] = SwapConfig(triggerBalance, reserveBalance);

    emit Config(msg.sender, triggerBalance, reserveBalance);
  }

	/// @notice Pull vtho from user's wallet. Before pulling though,
	/// the user has to give allowance on the vtho contract.
  /// @param account Account owning the vtho tokens.
  /// _param withdrawAmount Amount of VTHO to be withdrawn from the account and swapped for VET.
  /// @param maxRate Maximum accepted exchange rate. For example `maxRate = 20` implies
  /// `you get 1 VET for every 20 vtho you deposit`. The higher the maxRate the lower the output amount in VET.
  /// OBS: we cannot pass amountOutputMin because we don't know the the gas price before hand (?)
  /// TODO: see https://solidity-by-example.org/defi/uniswap-v2/ for naming conventions
  /// TODO: check this out https://medium.com/buildbear/uniswap-testing-1d88ca523bf0
  /// TODO: add exchangeId to select exchange to be used
	function swap(
    address payable account,
    // uint256 withdrawAmount,
    uint256 maxRate
  ) external {
    SwapConfig memory config = addressToConfig[account];

		require(config.triggerBalance > 0, "Trader: triggerBalance not set");
		require(config.reserveBalance > 0, "Trader: reserveBalance not set");
		require(vtho.balanceOf(account) >= config.triggerBalance, "Trader: triggerBalance not reached");

    uint256 withdrawAmount = Math.min(MAX_VTHO_WITHDRAWAL_AMOUNT, vtho.balanceOf(account) - config.reserveBalance); // TODO: this should be big enough
		// require(withdrawAmount >= config.triggerBalance, "Trader: unauthorized amount");
		// require(config.reserveBalance >= vtho.balanceOf(account) - withdrawAmount, "Trader: insufficient reserve");
    // TODO: once exchangeId is set, test routerAddress != address(0)
    // require(exchangeRouter != address(0), "exchangeRouter needs to be set");

    // TODO: should we use safeTransferFrom? See TransferHelper UniV3 periphery
    // Transfer the specified amount of VTHO to this contract.
		require(vtho.transferFrom(account, address(this), withdrawAmount), "Trader: transferFrom failed");

    // TODO: substract fee and transaction cost
    // TODO: This could potentially throw if tx fee > withdrawAmount
    uint256 txFee = tx.gasprice * SWAP_GAS_AMOUNT; // TODO: replace gas amount.
    uint256 protocolFee = (withdrawAmount - txFee) * 3 / 1_000;
    // TODO: fees should be below certain threshold
    uint256 amountIn = withdrawAmount - txFee - protocolFee;
    uint256 amountOutMin = amountIn / maxRate; // lower bound to the expected output amount

    // TODO: should we use safeApprove? See TransferHelper UniV3 periphery
    // Approve the router to spend VTHO.
    require(
        vtho.approve(address(router), amountIn),
        "Trader: approve failed."
    );

    // TODO: amountOutMin must be retrieved from an oracle of some kind
    address[] memory path = new address[](2);
    path[0] = address(vtho);
    path[1] = router.WETH();
    uint[] memory amounts = router.swapExactTokensForETH(
      amountIn,
      amountOutMin,
      path,
      account,
      block.timestamp // What about deadline?
    );

		emit Swap(
      account,
      withdrawAmount,
      tx.gasprice,
      protocolFee,
      maxRate,
      amountOutMin,
      amounts[amounts.length - 1]
    );
	}

  function withdraw() external onlyOwner {
    vtho.transfer(owner, vtho.balanceOf(address(this)));
  }

  // receive() external payable {
  //   assert(msg.sender == WETH); // only accept ETH via fallback from the WETH contract
  // }
}
