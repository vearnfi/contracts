//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.4;

import { Math } from "@openzeppelin/contracts/utils/math/Math.sol";
import { IUniswapV2Router02 } from "@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol";
import { IEnergy } from "../interfaces/IEnergy.sol";

// TODO: should we include ownable from openzepplin?

error ZeroAddress();
error NotOwner(address account);
error InvalidTrigger();
error InvalidReserve();
error InvalidConfig(uint256 triggerBalance, uint256 reserveBalance);
error InsufficientBalance(uint256 available, uint256 required);
error TransferFromFailed(address from, uint256 amount);
error ApproveFailed();
error TransferFailed(address to, uint256 amount);

contract Trader {
  IEnergy public vtho = IEnergy(0x0000000000000000000000000000456E65726779);
  IUniswapV2Router02 public router;

  address public immutable owner;
  uint256 public constant MAX_VTHO_WITHDRAWAL_AMOUNT = 1_000e18;
  // Amount of gas consumed by the swap function
  uint256 public constant SWAP_GAS = 268677;

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
    if (msg.sender != owner) revert NotOwner(msg.sender);
    _;
  }

  constructor(address routerAddress) {
    if (routerAddress == address(0)) revert ZeroAddress();
    // require(routerAddress != address(0), "Trader: router not set");

    owner = msg.sender;
    router = IUniswapV2Router02(routerAddress);
  }

  function saveConfig(
    uint256 triggerBalance,
    uint256 reserveBalance
  ) public {
		if (triggerBalance == 0) revert InvalidTrigger();
		if (reserveBalance == 0) revert InvalidReserve();
    if (triggerBalance <= reserveBalance) revert InvalidConfig(triggerBalance, reserveBalance);
    // TODO: reserveBalance < MAX_VTHO_WITHDRAWAL_AMOUNT
    // TODO: what about triggerBalance < MAX_...
    // TODO: triggerBalance - reserveBalance should be big enough to make the tx worth it

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
  /// TODO: secure this function onlyOwner or onlyOwnerOrAdmin
	function swap(
    address payable account,
    // uint256 withdrawAmount,
    uint256 maxRate
  ) external onlyOwner {
    SwapConfig memory config = addressToConfig[account];
    uint256 balance = vtho.balanceOf(account);

		if (config.triggerBalance == 0) revert InvalidTrigger();
		if (config.reserveBalance == 0) revert InvalidReserve();
		if (balance < config.triggerBalance) revert InsufficientBalance(balance, config.triggerBalance);

    uint256 withdrawAmount = balance >= MAX_VTHO_WITHDRAWAL_AMOUNT + config.reserveBalance
      ? MAX_VTHO_WITHDRAWAL_AMOUNT
      : balance - config.reserveBalance;
		// require(withdrawAmount >= config.triggerBalance, "Trader: unauthorized amount");
		// require(config.reserveBalance >= vtho.balanceOf(account) - withdrawAmount, "Trader: insufficient reserve");
    // TODO: once exchangeId is set, test routerAddress != address(0)
    // require(exchangeRouter != address(0), "exchangeRouter needs to be set");

    // Transfer the specified amount of VTHO to this contract.
		if (!vtho.transferFrom(account, address(this), withdrawAmount)) revert TransferFromFailed(account, withdrawAmount);

    // TODO: substract fee and transaction cost
    // TODO: This could potentially throw if tx fee > withdrawAmount
    uint256 txFee = tx.gasprice * SWAP_GAS;
    uint256 protocolFee = (withdrawAmount - txFee) * 3 / 1_000;
    // TODO: fees should be below certain threshold
    uint256 amountIn = withdrawAmount - txFee - protocolFee;
    uint256 amountOutMin = amountIn / maxRate; // lower bound to the expected output amount

    // TODO: should we use safeApprove? See TransferHelper UniV3 periphery
    // Approve the router to spend VTHO.
    if (!vtho.approve(address(router), amountIn)) revert ApproveFailed();

    // TODO: check for the best exchange rate on chain instead of passing an exchange parameter

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
    uint256 balance = vtho.balanceOf(address(this));

    if (!vtho.transfer(owner, balance)) revert TransferFailed(owner, balance);

    emit Withdraw(owner, balance);
  }

  // If neither a *receive* Ether nor a payable *fallback* function is present, the contract
  // cannot receive Ether through regular transactions and throws an exception.
  // TODO: test sending ETH or VTHO directly to the contract should revert given the fact that we didn't specify a fallback fn
}
