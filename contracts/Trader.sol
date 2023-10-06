// SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.4;

import { IUniswapV2Router02 } from "@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol";
import { IEnergy } from "./interfaces/IEnergy.sol";

// TODO: should we include ownable from openzepplin?

/**
 * @title Automatic VTHO to VET swaps.
 * @author Feder
 */
contract Trader {
  /**
   * @dev Account configuration that needs to be met in order to trigger a swap for the said account.
   */
  // struct SwapConfig {
  //   uint triggerBalance;
  //   uint reserveBalance;
  // }

  struct SwapArgs {
    uint txFee;
    uint protocolFee;
    uint amountIn;
    uint amountOutMin;
  }
  // struct Fees {
  //   uint txFee;
  //   uint protocolFee;
  // }

  /**
   * @dev Interface to interact with the Energy/VTHO contract.
   */
  IEnergy public constant vtho = IEnergy(0x0000000000000000000000000000456E65726779);

  /**
   * @dev Interface to interact with the UniswapV2 router.
   */
  // IUniswapV2Router02 public router;
  address[2] public routers; // = new address[](2);

  /**
   * @dev Protocol owner.
   *
   * The owner is the only role with access to the setFeeMultiplier, setAdmin and withdrawFees functions.
   */
  address public immutable owner;
  // TODO: this should be private

  /**
   * @dev Protocol admin.
   *
   * The admin is the only role with access to swap function.
   */
  address public admin;
  // TODO: this should be private

  /**
   * @dev Multiplier used to calculate protocol fee based on the following formula:
   *
   * uint protocolFee = amount * feeMultiplier / 10_000.
   *
   * For instance, if feeMultiplier equals 30, it means we are applying a 0.3 % fee.
   */
  uint8 public feeMultiplier = 30;

  /**
   * @dev Maximum VTHO amount that can be withdrawn in one trade.
   */
  uint public constant MAX_WITHDRAW_AMOUNT = 1_000e18;

  /**
   * @dev Gas consumed by the swap function.
   */
  uint public constant SWAP_GAS = 268883;
  // TODO: SWAP_GAS should be private

  /**
   * @dev Dictionary matching address accounts to reserveBalance.
   */
  mapping(address => uint) public reserves;

  /**
   * @dev Account has set a new swap configuration.
   */
  event Config(
    address indexed account,
    uint reserveBalance
  );

  /**
   * @dev A swap operation has been completed.
   */
  event Swap(
    address indexed account,
    uint withdrawAmount,
    uint gasPrice,
    uint protocolFee,
    uint maxRate,
    uint amountOutMin,
    uint amountOut
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
   * @dev The provided reserveBalance value is higher than the maximum allowed or zero.
   */
  error Trader__InvalidReserve();

  /**
   * @dev The VTHO balance of the target account doesn not meet the triggerBalance.
   */
  error Trader__InsufficientBalance(uint balance, uint withdrawAmount, uint reserveBalance);

  /**
   * @dev Transfer VTHO for target account to the Trader contract failed.
   */
  error Trader__TransferFromFailed(address from, uint amount);

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
   * @dev Initializes the contract by setting the list of available DEXs
   * as well as the contract owner.
   */
  constructor(address[2] memory routers_) {
    // Set deployer as the owner.
    owner = msg.sender;

    // Initialize uniV2 routers.
    // TODO: should we use an internal fn to init the set of routers?
    // See: https://github.com/PatrickAlphaC/hardhat-nft-fcc/blob/main/contracts/RandomIpfsNft.sol#L93C1-L99C6
    // for (uint8 i = 0; i < 2; i++) {
    //   if (routers_[i] == address(0)) revert Trader__ZeroAddress();

    //   routers[i] = routers_[i];
    // }
    routers = routers_;
  }

  // If neither a *receive* Ether nor a payable *fallback* function is present,
  // the contract cannot receive Ether through regular transactions and throws
  // an exception.
  // TODO: test sending VET or VTHO directly to the contract should revert given
  // the fact that we didn't specify a fallback fn

  // TODO: rename to saveReserve? same for the Config event?
  /**
   * @dev Associate reserveBalance to the caller.
   *
   * Enforce reserveBalance to be non zero so that when the `swap`
   * method gets called we can verify that the config has been initilized.
   */
  function saveConfig(uint reserveBalance) external {
    if (reserveBalance == 0) revert Trader__InvalidReserve();

    reserves[msg.sender] = reserveBalance;

    emit Config(msg.sender, reserveBalance);
  }

  /**
   * @dev Set a new protocol feeMultiplier.
   *
   * The caller must have owner role.
   *
   * The supplied value must be between 0 and 30 (0% and 0.3% fee respectively).
   */
  function setFeeMultiplier(uint8 newFeeMultiplier) external onlyOwner {
    // Ensures the protocol fee can never be higher than 0.3%.
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
   * Use the `Transfer` event emitted by the Energy contract to track this
   * method call.
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
    uint8 routerIndex,
    uint withdrawAmount,
    uint maxRate // TODO: do we need maxRate if we check balance / vthoReserves < 0.01 ?
    // ^ TODO: maxRate should have a 3 decimal precision. For instance, a maxRate of 13580
    // it's actually representing a 13,580 exchangeRate. We need to divide by 1000 after
    // multiplying by the exchange rate.
  )
    external
    onlyAdmin
  {
    // Fetch reserveBalance for target account.
    uint reserveBalance = reserves[account];

    // Make sure reserveBalance has been initialized.
		if (reserveBalance == 0) revert Trader__InvalidReserve();

    // Fetch target account balance (VTHO).
    uint balance = vtho.balanceOf(account);

    // Make sure reserveBalance is kept in the account.
    if (balance < withdrawAmount + reserveBalance) {
      revert Trader__InsufficientBalance(balance, withdrawAmount, reserveBalance);
    }

    // TODO: triggerBalance - reserveBalance should be big enough to make the tx worth it


    // TODO: balance / vthoReserves < 0.01 (1%) // By enforing this, am I enforcing slippage < some value?
    // What happens if vthoReserves >>> vetReserves? Let's suppose the pool is inbalanced
    // This should not happen due to arbitrage oportunity (but could happen via sandwich)
    // TODO: what if we require withdrawAmount / vthoReserves < 0.01 (1%)
    // && minAmountOut / vvetReserves < 0.01 (1%)? Would that ensure slippage?
    // TODO: totalFees / balance < 0.1 (10%)

    // Make sure we don't get sandwiched
    // pair.getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast);
    // Make sure balance is above trigger amount.
    // if (balance < config.triggerBalance) revert Trader__InsufficientBalance(balance, config.triggerBalance);

    // Enforce a cap to the withdraw amount and make sure the reserveBalance is kept in the account.
    // TODO: can we simplify this using Math.min(balance - config.reserveBalance, MAX_WITHDRAW_AMOUNT)
    // Then, is we remove triggerBalance, we can remove the balance variable and use vtho.balanceOf(account)
    // directly inside the Math.min(...)
    // uint withdrawAmount = balance >= MAX_WITHDRAW_AMOUNT + config.reserveBalance
    //   ? MAX_WITHDRAW_AMOUNT
    //   : balance - config.reserveBalance;
    // TODO: once exchangeId is set, test routerAddress != address(0)
    // require(exchangeRouter != address(0), "exchangeRouter needs to be set");

    // TODO: can we avoid being sandwiched by requesting for amountIn < alpha * reserve

    // Transfer the specified amount of VTHO to this contract.
    if (!vtho.transferFrom(account, address(this), withdrawAmount)) {
      revert Trader__TransferFromFailed(account, withdrawAmount);
    }

    SwapArgs memory args = _calcSwapArgs(withdrawAmount, maxRate);
    // TODO: substract fee and transaction cost
    // TODO: This could potentially throw if tx fee > withdrawAmount
    // Calulate transaction fee. (We paid this upfront so it's time to get paid back).
    // uint txFee = SWAP_GAS * tx.gasprice;

    // Calculate protocolFee once txFee has been deduced.
    // uint protocolFee = (withdrawAmount - txFee) * feeMultiplier / 10_000;
    // uint protocolFee = _calcProtocolFee(withdrawAmount - txFee);
    // Fees memory fees = _calcFees(withdrawAmount);

    // TODO: fees should be below certain threshold
    // Substract fees and exchange the remaining VHTO amount for VET tokens.
    // uint amountIn = withdrawAmount - txFee - protocolFee;
    // uint amountIn = withdrawAmount - fees.txFee - fees.protocolFee;

    // Calculate the minimum expected output.
    // uint amountOutMin = amountIn / maxRate;

    // Initialize router for the chosen DEX.
    IUniswapV2Router02 router = IUniswapV2Router02(routers[routerIndex]);

    // Approve the router to spend VTHO.
    // if (!vtho.approve(address(router), amountIn)) revert Trader__ApproveFailed();
    if (!vtho.approve(address(router), args.amountIn)) revert Trader__ApproveFailed();

    // TODO: check for the best exchange rate on chain instead of passing an exchange parameter?
    // uint[] memory amounts = router.getAmountsOut(amountIn, path);

    // TODO: amountOutMin must be retrieved from an oracle of some kind
    address[] memory path = new address[](2);
    path[0] = address(vtho);
    path[1] = router.WETH();
    uint[] memory amounts = router.swapExactTokensForETH(
      args.amountIn,
      args.amountOutMin,
      path,
      account,
      block.timestamp // TODO: What about deadline?
    );
    // uint[] memory amounts = router.swapExactTokensForETH(
    //   amountIn,
    //   amountOutMin,
    //   path,
    //   account,
    //   block.timestamp // What about deadline?
    // );

    // TODO: should we assert previousVETBalance > newVETBalance?

		emit Swap(
      account,
      withdrawAmount,
      tx.gasprice,
      // TODO: feeMultiplier
      // protocolFee,
      args.protocolFee,
      // fees.protocolFee,
      maxRate,
      // TODO: add amountIn
      // amountOutMin,
      args.amountOutMin,
      amounts[amounts.length - 1]
    );
	}

  // function _calcTxFee() internal view returns (uint) {
  //   return SWAP_GAS * tx.gasprice;
  // }

  // function _calcProtocolFee(uint amount) internal view returns (uint) {
  //   return amount * feeMultiplier / 10_000;
  // }

  function _calcSwapArgs(uint withdrawAmount, uint maxRate) internal view returns (SwapArgs memory) {
    // TODO: should we set a gasLimit in price?
    // We are setting a low gas price when submitting the tx.
    uint txFee = SWAP_GAS * tx.gasprice;
    // TODO: Math.min(SWAP_GAS, gasLeft)?
    // TODO: should we fetch gasPrice from Params contract?

    // Calculate protocolFee once txFee has been deduced.
    // uint protocolFee = _calcProtocolFee(withdrawAmount - txFee);
    uint protocolFee = (withdrawAmount - txFee) * feeMultiplier / 10_000;

    // Substract fees and exchange the remaining VHTO amount for VET tokens.
    uint amountIn = withdrawAmount - txFee - protocolFee;

    // Calculate the minimum expected output (VET).
    uint amountOutMin = amountIn / maxRate;

    return SwapArgs(txFee, protocolFee, amountIn, amountOutMin);
  }
}
