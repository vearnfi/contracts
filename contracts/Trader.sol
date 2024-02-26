// SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.19;

import { IUniswapV2Router02 } from "@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol";
import { IEnergy } from "./interfaces/IEnergy.sol";
import { IParams } from "./interfaces/IParams.sol";

// TODO: should we include ownable from openzepplin?

// Notice: Custom errors seems not supported on VeChain. As a result, the `revertReason` field
// remains empty when such errors occur.

/**
 * @title Automatic VTHO to VET swaps.
 * @author Feder
 */
contract Trader {
  /**
   * @dev Interface to interact with the Energy (VTHO) contract.
   */
  IEnergy public constant vtho = IEnergy(0x0000000000000000000000000000456E65726779);

  /**
   * @dev Interface to interact with the Params contract.
   */
  IParams public constant params = IParams(0x0000000000000000000000000000506172616D73);

  /**
   * @dev Interface to interact with the UniswapV2 routers.
   */
  address[2] public routers;

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
   * For instance, if feeMultiplier equals 30, it means we are applying a 0.3 % fee
   * to the amount being swapped.
   */
  uint8 public feeMultiplier = 30;

  /**
   * @dev Base gas price fetched from Params VeChain contract.
   */
  uint256 public baseGasPrice;

  /**
   * @dev Maximum VTHO amount that can be withdrawn in one trade.
   * The aim is to prevent sandwich attacks.
   */
  uint256 public constant MAX_WITHDRAW_AMOUNT = 10_000e18;
  // TODO: can we replace this by fetching the selected
  // dex's reserves and requiring the amountIn to be less
  // than a percentage of the reserves and the resulting slippage
  // lower than certain value?

  /**
   * @dev Estimated gas cost for executing the swap function with an upper bound
   * of 0xfffffffffffffffffff for the withdrawAmount parameter.
   */
  uint256 public constant SWAP_GAS = 266_321;

  /**
   * @dev Dictionary matching account address to reserveBalance.
   */
  mapping(address => uint256) public reserves;

  /**
   * @dev Account has set a new swap configuration.
   */
  event Config(
    address indexed account,
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
   * @dev Prevents calling a function from anyone except the owner.
   */
  modifier onlyOwner() {
    require(msg.sender == owner, "Trader: account is not owner");
    _;
  }

  /**
   * @dev Prevents calling a function from anyone except the admin.
   */
  modifier onlyAdmin() {
    require(msg.sender == admin, "Trader: account is not admin");
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
    routers = routers_;

    fetchBaseGasPrice();
  }

  // Given the fact that nor a *receive* Ether nor a payable *fallback* function
  // is present, this contract cannot receive ETH through regular transactions and
  // throws an exception.

  /**
   * @dev Fetch and store base gas price from VeChain Params contract.
   *
   * Anybody should be able to call this function.
   */
  function fetchBaseGasPrice() public {
    baseGasPrice = params.get(0x000000000000000000000000000000000000626173652d6761732d7072696365);
    // ^ https://github.com/vechain/thor/blob/f77ab7f286d3b53da1b48c025afc633a7bd03561/thor/params.go#L44
  }

  /**
   * @dev Associate reserveBalance to the caller.
   *
   * Enforce reserveBalance to be non zero so that when the `swap`
   * method gets called we can verify that the config has been initilized.
   */
  function saveConfig(uint256 reserveBalance) external {
    require(reserveBalance > 0, "Trader: invalid reserve");

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
    require(newFeeMultiplier <= 30, "Trader: invalid fee multiplier");

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
   * @dev Withdraw VTHO from the target account, deduce tx and protocol fees,
   * perform a swap for VET tokens through a DEX, and return the resulting tokens back
   * to the original account.
   *
   * The Trader contract must be given approval for VTHO token spending in behalf of the
   * target account priot to calling this function.
   *
   * @param account Account owning the VTHO tokens.
   * @param routerIndex Index of the router to be used for the swap.
   * @param withdrawAmount Amount of VTHO to be withdrawn from the account.
   * @param maxRate Maximum accepted exchange rate holding a 3 decimal precision.
   * For example `maxRate = 20_000` implies `you get 1 VET for every 20 VTHO you deposit`.
   * The higher the maxRate the lower the output amount in VET.
   */
    // uint256[] memory amounts = router.getAmountsOut(amountIn, path);
  /// OBS: we cannot pass amountOutputMin because we don't know the the gas price before hand (?)
  /// TODO: see https://solidity-by-example.org/defi/uniswap-v2/ for naming conventions
  /// TODO: check this out https://medium.com/buildbear/uniswap-testing-1d88ca523bf0
  /// TODO: add exchangeId to select exchange to be used
  // TODO: should we use reentrancy since we are modifying the state of the VTHO token?
  // TODO: what happens if an attacker sets maxRate >> 0? The contract should revert
	function swap(
    address payable account,
    uint8 routerIndex,
    uint256 withdrawAmount,
    uint256 maxRate // TODO: do we need maxRate if we check balance / vthoReserves < 0.01 ?
    // ^ TODO: maxRate should have a 3 decimal precision. For instance, a maxRate of 13580
    // it's actually representing a 13,580 exchangeRate. We need to divide by 1000 after
    // multiplying by the exchange rate.
  )
    external
    onlyAdmin
  {
    // Make sure gas price is bounded.
    require(tx.gasprice <= 2 * baseGasPrice, "Trader: gas price too high");

    _validateWithdrawAmount(account, withdrawAmount);
    // TODO: withdrawAmount should be big enough to make the tx worth it


    // TODO: balance / vthoReserves < 0.01 (1%) // By enforing this, am I enforcing slippage < some value?
    // What happens if vthoReserves >>> vetReserves? Let's suppose the pool is inbalanced
    // This should not happen due to arbitrage oportunity (but could happen via sandwich)
    // TODO: what if we require withdrawAmount / vthoReserves < 0.01 (1%)
    // && minAmountOut / vvetReserves < 0.01 (1%)? Would that ensure slippage?
    // TODO: totalFees / balance < 0.1 (10%)

    // Make sure we don't get sandwiched
    // pair.getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast);

    // Enforce a cap to the withdraw amount and make sure the reserveBalance is kept in the account.
    // TODO: can we simplify this using Math.min(balance - config.reserveBalance, MAX_WITHDRAW_AMOUNT)
    // Then, is we remove triggerBalance, we can remove the balance variable and use vtho.balanceOf(account)
    // directly inside the Math.min(...)
    // uint256 withdrawAmount = balance >= MAX_WITHDRAW_AMOUNT + config.reserveBalance
    //   ? MAX_WITHDRAW_AMOUNT
    //   : balance - config.reserveBalance;
    // TODO: once exchangeId is set, test routerAddress != address(0)
    // require(exchangeRouter != address(0), "exchangeRouter needs to be set");

    // TODO: can we avoid being sandwiched by requesting for amountIn < alpha * reserve
    // TODO: fees should be below certain threshold?

    // Transfer the specified amount of VTHO to this contract.
    require(vtho.transferFrom(account, address(this), withdrawAmount), "Trader: transfer from failed");

    // Calulate transaction fee. We paid this upfront so it's time to get paid back.
    uint256 txFee = SWAP_GAS * tx.gasprice;

    // Calculate protocolFee once txFee has been deduced.
    uint256 protocolFee = (withdrawAmount - txFee) * feeMultiplier / 10_000;

    // Substract fee and tx cost from the initial withdraw amount.
    // The remainder is sent to the DEX.
    uint256 amountIn = withdrawAmount - txFee - protocolFee;
    // TODO: This could potentially throw if tx fee > withdrawAmount

    // Calculate the minimum expected output (VET).
    uint256 amountOutMin = amountIn * 1000 / maxRate;

    // Initialize router for the chosen DEX.
    IUniswapV2Router02 router = IUniswapV2Router02(routers[routerIndex]);

    // Approve the router to spend VTHO.
    require(vtho.approve(address(router), amountIn), "Trader: approve failed");

    // TODO: amountOutMin must be retrieved from an oracle of some kind
    address[] memory path = new address[](2);
    path[0] = address(vtho);
    path[1] = router.WETH();
    uint256[] memory amounts = router.swapExactTokensForETH(
      amountIn,
      amountOutMin,
      path,
      account,
      block.timestamp // TODO: What about deadline?
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

  function _validateWithdrawAmount(address account, uint256 withdrawAmount) internal view {
    // Fetch reserveBalance for target account.
    uint256 reserveBalance = reserves[account];

    // Make sure reserveBalance has been initialized.
    require(reserveBalance > 0, "Trader: invalid reserve");

    // Fetch target account balance (VTHO).
    uint256 balance = vtho.balanceOf(account);

    // Make sure reserveBalance is satisfied.
    require(balance >= withdrawAmount + reserveBalance, "Trader: insufficient balance");
  }
}
