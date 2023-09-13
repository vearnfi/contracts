//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.4;

import { IUniswapV2Router02 } from "@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol";
import { IEnergy } from "../interfaces/IEnergy.sol";

// TODO: should we include ownable from openzepplin?

/**
 * @title Automatic VTHO to VET swaps using optimized strategies.
 * @author Feder
 */
contract Trader {
  //-------------------//
  // Type Declarations //
  //-------------------//
  struct SwapConfig {
    uint256 triggerBalance;
    uint256 reserveBalance;
  }

  //-----------------//
  // State Variables //
  //-----------------//
  /** Interface to interact with the Energy/VTHO contract. */
  IEnergy public constant vtho = IEnergy(0x0000000000000000000000000000456E65726779);
  /** Interface to interact with the UniswapV2 router contract. */
  IUniswapV2Router02 public router;
  /** Protocol owner. */
  address public immutable owner;
  /** Protocol admin. */
  address public admin;
  /** Multiplier used to calculate protocol fee. */
  uint8 public feeMultiplier = 30;
  /** Max VTHO amount that can be withdraw in one trade. */
  uint256 public constant MAX_WITHDRAW_AMOUNT = 1_000e18;
  /** Gas consumed by the swap function. */
  uint256 public constant SWAP_GAS = 268677;
  /** Set of user swap configurations. */
  mapping(address => SwapConfig) public addressToConfig;

  //--------//
  // Events //
  //--------//
  event Config(
    address indexed account,
    uint256 triggerBalance,
    uint256 reserveBalance
  );
  event Swap(
    address indexed account,
    uint256 withdrawAmount,
    uint256 gasPrice,
    uint256 protocolFee,
    uint256 maxRate,
    uint256 amountOutMin,
    uint256 amountOut
  );

  //--------//
  // Errors //
  //--------//
  error ZeroAddress();
  error NotOwner(address account);
  error NotAdmin(address account);
  error InvalidFeeMultiplier();
  error InvalidTrigger();
  error InvalidReserve();
  error InvalidConfig(uint256 triggerBalance, uint256 reserveBalance);
  error InsufficientBalance(uint256 available, uint256 required);
  error TransferFromFailed(address from, uint256 amount);
  error ApproveFailed();

  //-----------//
  // Modifiers //
  //-----------//
  /**
   * @notice Prevents calling a function from anyone except the owner.
   */
  modifier onlyOwner() {
    if (msg.sender != owner) revert NotOwner(msg.sender);
    _;
  }

  /**
   * @notice Prevents calling a function from anyone except the admin.
   */
  modifier onlyAdmin() {
    if (msg.sender != admin) revert NotAdmin(msg.sender);
    _;
  }

  //-----------//
  // Functions //
  //-----------//
  constructor(address routerAddress) {
    if (routerAddress == address(0)) revert ZeroAddress();
    owner = msg.sender;
    router = IUniswapV2Router02(routerAddress);
  }

  // If neither a *receive* Ether nor a payable *fallback* function is present,
  // the contract cannot receive Ether through regular transactions and throws
  // an exception.
  // TODO: test sending VET or VTHO directly to the contract should revert given
  // the fact that we didn't specify a fallback fn

  function saveConfig(
    uint256 triggerBalance,
    uint256 reserveBalance
  ) external {
		if (triggerBalance == 0) revert InvalidTrigger();
		if (reserveBalance == 0) revert InvalidReserve();
    if (triggerBalance <= reserveBalance) revert InvalidConfig(triggerBalance, reserveBalance);
    // TODO: reserveBalance < MAX_WITHDRAW_AMOUNT
    // TODO: what about triggerBalance < MAX_...
    // TODO: triggerBalance - reserveBalance should be big enough to make the tx worth it

    addressToConfig[msg.sender] = SwapConfig(triggerBalance, reserveBalance);

    emit Config(msg.sender, triggerBalance, reserveBalance);
  }

  /**
   * @notice Set protocol fee multiplier.
   * @param newFeeMultiplier New value to be used as the fee multiplier.
   * @dev The protocol fee is then calculated using the following formula:
   * uint256 protocolFee = amount * feeMultiplier / 10_000
   */
  function setFeeMultiplier(uint8 newFeeMultiplier) external onlyOwner {
    if (newFeeMultiplier > 30) revert InvalidFeeMultiplier();
    feeMultiplier = newFeeMultiplier;
  }

  /**
   * @notice Set protocol admin.
   * @param newAdmin Address to be the new protocol admin.
   */
  function setAdmin(address newAdmin) external onlyOwner {
    admin = newAdmin;
  }

  /**
   * @notice Withdraw fees accrued by the protocol.
   * @dev Accrued fees include protocol and transaction fees.
   * @dev This function can be tracked using the `Transfer` event emitted by the Energy contract.
   */
  function withdraw() external onlyOwner {
    vtho.transfer(owner, vtho.balanceOf(address(this)));
  }

  /**
   * @notice Withdraw VTHO from the target account, perform a swap for VET tokens through a DEX,
   * and return the resulting tokens back to the original account.
   * @param account Account owning the VTHO tokens.
   * _param withdrawAmount Amount of VTHO to be withdrawn from the account and swapped for VET.
   * @param maxRate Maximum accepted exchange rate. For example `maxRate = 20` implies
   * `you get 1 VET for every 20 VTHO you deposit`. The higher the maxRate the lower the output amount in VET.
   * @dev Trader contract must be given approval for VTHO token spending in behalf of the
   * target account priot to calling this function.
   */
  /// OBS: we cannot pass amountOutputMin because we don't know the the gas price before hand (?)
  /// TODO: see https://solidity-by-example.org/defi/uniswap-v2/ for naming conventions
  /// TODO: check this out https://medium.com/buildbear/uniswap-testing-1d88ca523bf0
  /// TODO: add exchangeId to select exchange to be used
  /// TODO: secure this function onlyOwner or onlyOwnerOrAdmin
  // TODO: should we use reentrancy since we are modifying the state of the VTHO token?
	function swap(
    address payable account,
    // uint256 withdrawAmount,
    uint256 maxRate
  ) external onlyAdmin {
    SwapConfig memory config = addressToConfig[account];
    uint256 balance = vtho.balanceOf(account);

		if (config.triggerBalance == 0) revert InvalidTrigger();
		if (config.reserveBalance == 0) revert InvalidReserve();
		if (balance < config.triggerBalance) revert InsufficientBalance(balance, config.triggerBalance);

    uint256 withdrawAmount = balance >= MAX_WITHDRAW_AMOUNT + config.reserveBalance
      ? MAX_WITHDRAW_AMOUNT
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
    uint256 protocolFee = (withdrawAmount - txFee) * feeMultiplier / 10_000;
    // TODO: fees should be below certain threshold
    uint256 amountIn = withdrawAmount - txFee - protocolFee;
    // Lower bound for the expected output amount.
    uint256 amountOutMin = amountIn / maxRate;

    // Approve the router to spend VTHO.
    if (!vtho.approve(address(router), amountIn)) revert ApproveFailed();

    // TODO: check for the best exchange rate on chain instead of passing an exchange parameter?

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

    // TODO: should we assert previousVETBalance > newVETBalance?

		emit Swap(
      account,
      withdrawAmount,
      tx.gasprice,
      protocolFee,
      maxRate,
      // TODO: add amountIn
      amountOutMin,
      amounts[amounts.length - 1]
    );
	}

  /**
   * @notice Calculate protocol fee applied to the given amount.
   */
  function _calcProtocolFee(uint256 amount) internal view returns (uint256) {
    return amount * feeMultiplier / 10_000;
  }

}
