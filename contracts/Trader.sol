// SPDX-License-Identifier: Unlicense
pragma solidity 0.8.19;

import { IUniswapV2Router02 } from "@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol";
import { IEnergy } from "./interfaces/IEnergy.sol";
import { IParams } from "./interfaces/IParams.sol";

/**
 * @title Trader: Automatic VTHO to VET token swaps.
 * @author Feder
 * @dev This contract is designed to be deployed on VeChain, an EVM-compatible network with
 * a unique two-token model:
 * - VTHO: An ERC20 token used as gas.
 * - VET: The native token, which generates VTHO at a constant rate of 5*10^-8 VTHO per VET per
 * block when held in an account or contract.
 *
 * @notice
 * 1. VeChain explorers don't yet support custom errors, reason for which we are still using string errors instead.
 * 2. VeChain lacks access to on-chain price oracles, for this reason we make use of an off-chain price feed
 * to mitigate the possibility of a sandwich attack.
 */
contract Trader {
  /**
   * @dev Interface for interacting with the Energy (VTHO) contract.
   */
  IEnergy public constant vtho = IEnergy(0x0000000000000000000000000000456E65726779);

  /**
   * @dev Interface for interacting with the Params contract.
   */
  IParams public constant params = IParams(0x0000000000000000000000000000506172616D73);

  /**
   * @dev Address of the VVET contract (equivalent to WETH).
   */
  address public immutable vvet;

  /**
   * @dev Protocol owner, who has access to specific functions such as setting fee multipliers
   * setting admin accounts and withdrawing fees.
   */
  address public immutable owner;

  /**
   * @dev Admin of the protocol, responsible for executing the swap function.
   */
  address public admin;

  /**
   * @dev List of addresses of UniswapV2 routers.
   */
  address[2] public routers;

  /**
   * @dev Denominator used to calculate the fee applied by the protocol.
   */
  uint256 public constant FEE_PRECISION = 10_000;

  /**
   * @dev Maximum feeMultiplier allowed in the protocol.
   */
  uint256 public constant MAX_FEE_MULTIPLIER = 30;

  /**
   * @dev Multiplier used to calculate protocol fees.
   * For example, a fee multiplier of 30 applies a 0.3% fee to the amount being swapped.
   */
  uint256 public feeMultiplier = MAX_FEE_MULTIPLIER;

  /**
   * @dev Base gas price fetched from the VeChain Params contract.
   */
  uint256 public baseGasPrice;

  /**
   * @dev Estimated gas cost for executing the swap function with an upper bound
   * of 0xfffffffffffffffffff for the withdrawAmount parameter.
   */
  uint256 public constant SWAP_GAS = 285_980;

  /**
   * @dev Mapping of account addresses to reserve balances.
   */
  mapping(address => uint256) public reserves;

  /**
   * @dev Emitted when fetching base gas price from the VeChain Params contract.
   */
  event FetchGas(uint256 baseGasPrice);

  /**
   * @dev Emitted when setting a new feeMultiplier.
   */
  event SetFee(uint256 feeMultiplier);

  /**
   * @dev Emitted when setting a new admin.
   */
  event SetAdmin(address indexed admin);

  /**
   * @dev Emitted when withdrawing fees.
   */
  event WithdrawFees(address indexed caller, uint256 amount);

  /**
   * @dev Emitted when an account sets a new swap configuration.
   */
  event Config(
    address indexed account,
    uint256 reserveBalance
  );

  /**
   * @dev Emitted when a swap operation is completed.
   */
  event Swap(
    address indexed account,
    address indexed router,
    uint256 withdrawAmount,
    uint256 gasPrice,
    uint256 feeMultiplier,
    uint256 protocolFee,
    uint256 amountIn,
    uint256 amountOutMin,
    uint256 amountOutExpected,
    uint256 amountOutReceived
  );

  /**
   * @dev Modifier to restrict function access to the owner.
   */
  modifier onlyOwner() {
    require(msg.sender == owner, "Trader: account is not owner");
    _;
  }

  /**
   * @dev Modifier to restrict function access to the admin.
   */
  modifier onlyAdmin() {
    require(msg.sender == admin, "Trader: account is not admin");
    _;
  }

  /**
   * @dev Initializes the contract by setting the list of available DEXs
   * and the contract owner.
   */
  constructor(address vvet_, address[2] memory routers_) {
    vvet = vvet_;
    routers = routers_;
    owner = msg.sender;
    fetchBaseGasPrice();
  }

  /**
   * @dev Fetches and stores the base gas price from the VeChain Params contract.
   */
  function fetchBaseGasPrice() public {
    baseGasPrice = params.get(0x000000000000000000000000000000000000626173652d6761732d7072696365);
    // ^ https://github.com/vechain/thor/blob/f77ab7f286d3b53da1b48c025afc633a7bd03561/thor/params.go#L44

    emit FetchGas(baseGasPrice);
  }

  /**
   * @dev Associates a reserve balance with the caller's account.
   * Enforce reserveBalance to be non zero so that when the `swap`
   * method gets called we can verify that the config has been initilized.
   */
  function saveConfig(uint256 reserveBalance) external {
    require(reserveBalance > 0, "Trader: invalid reserve");

    reserves[msg.sender] = reserveBalance;

    emit Config(msg.sender, reserveBalance);
  }

  /**
   * @dev Sets a new protocol fee multiplier.
   */
  function setFeeMultiplier(uint8 newFeeMultiplier) external onlyOwner {
    // Ensures the protocol fee can never be higher than 0.3%.
    require(newFeeMultiplier <= MAX_FEE_MULTIPLIER, "Trader: invalid fee multiplier");

    feeMultiplier = newFeeMultiplier;

    emit SetFee(feeMultiplier);
  }

  /**
   * @dev Sets a new admin account.
   */
  function setAdmin(address newAdmin) external onlyOwner {
    admin = newAdmin;

    emit SetAdmin(admin);
  }

  /**
   * @dev Withdraws fees accrued by the protocol.
   */
  function withdrawFees() external {
    uint256 fees = vtho.balanceOf(address(this));

    require(vtho.transfer(owner, fees), "Trader: withdraw fees failed");

    emit WithdrawFees(msg.sender, fees);
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
   * @param withdrawAmount Amount of VTHO to be withdrawn from the account.
   * @param amountOutMin Minimum output amount computed using an off-chain price oracle.
   */
	function swap(address payable account, uint256 withdrawAmount, uint256 amountOutMin) external onlyAdmin {
    require(tx.gasprice <= 2 * baseGasPrice, "Trader: gas price too high");

    _validateWithdrawAmount(account, withdrawAmount);

    // Transfer the specified amount of VTHO to this contract.
    require(vtho.transferFrom(account, address(this), withdrawAmount), "Trader: transfer from failed");

    // Calulate transaction fee. We paid this upfront so it's time to get paid back.
    uint256 txFee = SWAP_GAS * tx.gasprice;

    // Calculate protocolFee once txFee has been deduced.
    uint256 protocolFee = (withdrawAmount - txFee) * feeMultiplier / FEE_PRECISION;

    // Substract fee and tx cost from the initial withdraw amount.
    // The remainder is sent to the DEX.
    // Notice: This could potentially throw if fees > withdrawAmount.
    uint256 amountIn = withdrawAmount - txFee - protocolFee;

    address[] memory path = new address[](2);
    path[0] = address(vtho);
    path[1] = vvet;

    (IUniswapV2Router02 router, uint256 amountOutExpected) = _selectRouter(path, amountIn);

    // Make sure off-chain price oracle is close enough to the selected router output.
    require(amountOutExpected >= amountOutMin, "Trader: amount out expected too low");

    // Approve the router to spend VTHO.
    require(vtho.approve(address(router), amountIn), "Trader: approve failed");

    uint256[] memory amountsReceived = router.swapExactTokensForETH(
      amountIn,
      amountOutExpected * 990 / 1_000, // Accept a 1% slippage
      path,
      account,
      block.timestamp // We can set this value when creating the tx
    );

		emit Swap(
      account,
      address(router),
      withdrawAmount,
      tx.gasprice,
      feeMultiplier,
      protocolFee,
      amountIn,
      amountOutMin,
      amountOutExpected,
      amountsReceived[amountsReceived.length - 1]
    );
  }

  /**
   * @dev Validates the withdrawal amount against the reserve balance.
   */
  function _validateWithdrawAmount(address account, uint256 withdrawAmount) internal view {
    uint256 reserveBalance = reserves[account];

    require(reserveBalance > 0, "Trader: reserve not initialized");

    require(vtho.balanceOf(account) >= withdrawAmount + reserveBalance, "Trader: insufficient balance");
  }

  /**
   * @dev Selects the router that yields the best output from the list of available routers.
   */
  function _selectRouter(
    address[] memory path,
    uint256 amountIn
  ) internal view returns (IUniswapV2Router02, uint256) {
    uint256 routerIndex = 0;
    uint256 amountOut = 0;

    for (uint256 i = 0; i < routers.length; i++) {
      IUniswapV2Router02 router = IUniswapV2Router02(routers[i]);

      uint256[] memory amountsExpected = router.getAmountsOut(
        amountIn,
        path
      );

      uint256 amountOutExpected = amountsExpected[1];

      if (amountOutExpected > amountOut) {
        routerIndex = i;
        amountOut = amountOutExpected;
      }
    }

    return (IUniswapV2Router02(routers[routerIndex]), amountOut);
  }

  // This contract cannot receive VET through regular transactions and throws an exception.
}
