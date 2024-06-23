// SPDX-License-Identifier: Unlicense
pragma solidity 0.8.20;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { IVexchangeV2Router02 } from "./interfaces/IVexchangeV2Router02.sol";

/**
 * @title Vexchange V2 Router Wrapper
 * @notice Wrapper around the Vexchange Router V2 contract exposing the original Uniswap V2 Router Interface.
 */
contract VexWrapper {
    using SafeERC20 for IERC20;

    IVexchangeV2Router02 public immutable vex;

    constructor(address payable vex_) public {
        vex = IVexchangeV2Router02(vex_);
    }

    function WETH() external view returns (address) {
        return vex.VVET();
    }

    function factory() external view returns (address) {
        return vex.factory();
    }

    function swapExactETHForTokens(uint amountOutMin, address[] calldata path, address to, uint deadline)
        external
        payable
        returns (uint[] memory amounts)
    {
        return vex.swapExactVETForTokens{value: msg.value}(
            amountOutMin, path, to, deadline
        );
    }

    function swapExactTokensForETH(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline)
        external
        returns (uint[] memory amounts)
    {
        IERC20 tokenIn = IERC20(path[0]);

        // Transfer tokens to VexWrapper.
        tokenIn.safeTransferFrom(msg.sender, address(this), amountIn);

        // Approve Vexchange for token spending in behalf of VexWrapper.
        require(tokenIn.approve(address(vex), amountIn), "VexWrapper: approve failed");

        return vex.swapExactTokensForVET(
            amountIn,
            amountOutMin,
            path,
            to,
            deadline
        );
    }

    function getAmountsOut(uint amountIn, address[] calldata path)
        external
        view
        returns (uint[] memory amounts)
    {
        return vex.getAmountsOut(amountIn, path);
    }

    function getAmountsIn(uint amountOut, address[] calldata path)
        external
        view
        returns (uint[] memory amounts)
    {
        return vex.getAmountsIn(amountOut, path);
    }
}
