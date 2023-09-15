//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.4;

import { IUniswapV2Router02 } from "@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol";
import { IEnergy } from "../interfaces/IEnergy.sol";

// TODO: should we include ownable from openzepplin?

/**
 * @title Automatic VTHO to VET swaps.
 * @author Feder
 */
contract Trader {
  /**
   * @dev Account configuration that needs to be met in order to trigger a swap for the said account.
   */
  struct SwapConfig {
    uint256 triggerBalance;
    uint256 reserveBalance;
  }

  /**
   * @dev Interface to interact with the Energy/VTHO contract.
   */
  IEnergy public constant vtho = IEnergy(0x0000000000000000000000000000456E65726779);

  /**
   * @dev Interface to interact with the UniswapV2 router.
   */
  IUniswapV2Router02 public router;

  /**
   * @dev Protocol owner.
   *
   * The owner is the only role with access to the setFeeMultiplier, setAdmin and withdrawFees functions.
   */
  address public immutable owner;

  /**
   * @dev Protocol admin.
   *
   * The admin is the only role with access to swap function.
   */
  address public admin;

  /**
   * @dev Multiplier used to calculate protocol fee based on the following formula:
   *
   * uint256 protocolFee = amount * feeMultiplier / 10_000.
   *
   * For instance, if feeMultiplier equals 30, it means we are applying a 0.3 % fee.
   */
  uint8 public feeMultiplier = 30;

  /**
   * @dev Maximum VTHO amount that can be withdrawn in one trade.
   */
  uint256 public constant MAX_WITHDRAW_AMOUNT = 1_000e18;

  /**
   * @dev Gas consumed by the swap function.
   */
  uint256 public constant SWAP_GAS = 268677;

  /**
   * @dev Dictionary matching address accounts to swap configurations.
   */
  mapping(address => SwapConfig) public addressToConfig;

  /**
   * @dev Account has set a new swap configuration.
   */
  event Config(
    address indexed account,
    uint256 triggerBalance,
    uint256 reserveBalance
  );

  /**
   * @dev A swap operation has been completed.
   */
  event Swap(
    address indexed account,
    uint256 withdrawAmount,
    uint256 gasPrice,
    uint256 protocolFee,
    uint256 maxRate,
    uint256 amountOutMin,
    uint256 amountOut
  );

  /**
   * @dev
   */
  error Trader__ZeroAddress();

  /**
   * @dev The caller does not have owner role.
   */
  error Trader__NotOwner(address account);

  /**
   * @dev The caller does not have admin role.
   */
  error Trader__NotAdmin(address account);

  /**
   * @dev The new feeMultiplier value is higher than the maximum allowed.
   */
  error Trader__InvalidFeeMultiplier();

  /**
   * @dev The provided triggerBalance value is higher than the maximum allowed or zero.
   */
  error Trader__InvalidTrigger();

  /**
   * @dev The provided reserveBalance value is higher than the maximum allowed or zero.
   */
  error Trader__InvalidReserve();

  /**
   * @dev The provided reserveBalance value is higher than the maximum allowed or zero.
   */
  error Trader__InvalidConfig(uint256 triggerBalance, uint256 reserveBalance);

  /**
   * @dev The VTHO balance of the target account doesn not meet the triggerBalance.
   */
  error Trader__InsufficientBalance(uint256 available, uint256 required);

  /**
   * @dev Transfer VTHO for target account to the Trader contract failed.
   */
  error Trader__TransferFromFailed(address from, uint256 amount);

  /**
   * @dev Giving approval for VTHO spending to a DEX has failed.
   */
  error Trader__ApproveFailed();

  /**
   * @dev Prevents calling a function from anyone except the owner.
   */
  modifier onlyOwner() {
    if (msg.sender != owner) revert Trader__NotOwner(msg.sender);
    _;
  }

  /**
   * @dev Prevents calling a function from anyone except the admin.
   */
  modifier onlyAdmin() {
    if (msg.sender != admin) revert Trader__NotAdmin(msg.sender);
    _;
  }

  /**
   * @dev Initializes the contract setting the address of the deployer as the initial owner
   * as well as the available DEXs.
   */
  constructor(address routerAddress) {
    if (routerAddress == address(0)) revert Trader__ZeroAddress();
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
		if (triggerBalance == 0) revert Trader__InvalidTrigger();
		if (reserveBalance == 0) revert Trader__InvalidReserve();
    if (triggerBalance <= reserveBalance) revert Trader__InvalidConfig(triggerBalance, reserveBalance);
    // TODO: reserveBalance < MAX_WITHDRAW_AMOUNT
    // TODO: what about triggerBalance < MAX_...
    // TODO: triggerBalance - reserveBalance should be big enough to make the tx worth it

    addressToConfig[msg.sender] = SwapConfig(triggerBalance, reserveBalance);

    emit Config(msg.sender, triggerBalance, reserveBalance);
  }

  /**
   * @dev Set a new protocol feeMultiplier.
   *
   * The caller must have owner role.
   *
   * The supplied value must be between 0 and 30 (0% and 0.3% fee respectively).
   */
  function setFeeMultiplier(uint8 newFeeMultiplier) external onlyOwner {
    if (newFeeMultiplier > 30) revert Trader__InvalidFeeMultiplier();
    feeMultiplier = newFeeMultiplier;
  }

  /**
   * @dev Set a new admin account.
   *
   * The caller must have owner role.
   */
  function setAdmin(address newAdmin) external onlyOwner {
    admin = newAdmin;
  }

  /**
   * @dev Withdraw fees accrued by the protocol.
   *
   * The caller must have owner role.
   *
   * Accrued fees include both protocol and transaction fees.
   *
   * Use the `Transfer` event emitted by the Energy contract to track this function.
   */
  function withdrawFees() external onlyOwner {
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
    /* uint256 withdrawAmount, */
    uint256 maxRate
  )
    external
    onlyAdmin
  {
    SwapConfig memory config = addressToConfig[account];
    uint256 balance = vtho.balanceOf(account);

		if (config.triggerBalance == 0) revert Trader__InvalidTrigger();
		if (config.reserveBalance == 0) revert Trader__InvalidReserve();
		if (balance < config.triggerBalance) revert Trader__InsufficientBalance(balance, config.triggerBalance);

    uint256 withdrawAmount = balance >= MAX_WITHDRAW_AMOUNT + config.reserveBalance
      ? MAX_WITHDRAW_AMOUNT
      : balance - config.reserveBalance;
		// require(withdrawAmount >= config.triggerBalance, "Trader: unauthorized amount");
		// require(config.reserveBalance >= vtho.balanceOf(account) - withdrawAmount, "Trader: insufficient reserve");
    // TODO: once exchangeId is set, test routerAddress != address(0)
    // require(exchangeRouter != address(0), "exchangeRouter needs to be set");

    // Transfer the specified amount of VTHO to this contract.
		if (!vtho.transferFrom(account, address(this), withdrawAmount)) revert Trader__TransferFromFailed(account, withdrawAmount);

    // TODO: substract fee and transaction cost
    // TODO: This could potentially throw if tx fee > withdrawAmount
    // Calulate transaction fee. We paid this cost upfront so it's time to get paid back.
    uint256 txFee = SWAP_GAS * tx.gasprice;

    // Calculate protocolFee once txFee has been deduced.
    uint256 protocolFee = (withdrawAmount - txFee) * feeMultiplier / 10_000;

    // TODO: fees should be below certain threshold
    // Deduce fees and exchange the remaining amount for VET tokens.
    uint256 amountIn = withdrawAmount - txFee - protocolFee;

    // Calculate the minimum expected output.
    uint256 amountOutMin = amountIn / maxRate;

    // Approve the router to spend VTHO.
    if (!vtho.approve(address(router), amountIn)) revert Trader__ApproveFailed();

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
      // TODO: feeMultiplier
      protocolFee,
      maxRate,
      // TODO: add amountIn
      amountOutMin,
      amounts[amounts.length - 1]
    );
	}
}
