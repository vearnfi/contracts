pragma solidity =0.6.6;

import '../ext-v2-core/IVexchangeV2Callee.sol';

import '../libraries/VexchangeV2Library.sol';
import '../interfaces/V1/IVexchangeV1Factory.sol';
import '../interfaces/V1/IVexchangeV1Exchange.sol';
import '../interfaces/IVexchangeV2Router01.sol';
import '../interfaces/IERC20.sol';
import '../interfaces/IVVET.sol';

contract ExampleFlashSwap is IVexchangeV2Callee {
    IVexchangeV1Factory immutable factoryV1;
    address immutable factory;
    IVVET immutable VVET;

    constructor(address _factory, address _factoryV1, address router) public {
        factoryV1 = IVexchangeV1Factory(_factoryV1);
        factory = _factory;
        VVET = IVVET(IVexchangeV2Router01(router).VVET());
    }

    // needs to accept ETH from any V1 exchange and VVET. ideally this could be enforced, as in the router,
    // but it's not possible because it requires a call to the v1 factory, which takes too much gas
    receive() external payable {}

    // gets tokens/VVET via a V2 flash swap, swaps for the ETH/tokens on V1, repays V2, and keeps the rest!
    function vexchangeV2Call(address sender, uint amount0, uint amount1, bytes calldata data) external override {
        address[] memory path = new address[](2);
        uint amountToken;
        uint amountETH;
        { // scope for token{0,1}, avoids stack too deep errors
        address token0 = IVexchangeV2Pair(msg.sender).token0();
        address token1 = IVexchangeV2Pair(msg.sender).token1();
        assert(msg.sender == VexchangeV2Library.pairFor(factory, token0, token1)); // ensure that msg.sender is actually a V2 pair
        assert(amount0 == 0 || amount1 == 0); // this strategy is unidirectional
        path[0] = amount0 == 0 ? token0 : token1;
        path[1] = amount0 == 0 ? token1 : token0;
        amountToken = token0 == address(VVET) ? amount1 : amount0;
        amountETH = token0 == address(VVET) ? amount0 : amount1;
        }

        assert(path[0] == address(VVET) || path[1] == address(VVET)); // this strategy only works with a V2 VVET pair
        IERC20 token = IERC20(path[0] == address(VVET) ? path[1] : path[0]);
        IVexchangeV1Exchange exchangeV1 = IVexchangeV1Exchange(factoryV1.getExchange(address(token))); // get V1 exchange

        if (amountToken > 0) {
            (uint minETH) = abi.decode(data, (uint)); // slippage parameter for V1, passed in by caller
            token.approve(address(exchangeV1), amountToken);
            uint amountReceived = exchangeV1.tokenToEthSwapInput(amountToken, minETH, uint(-1));
            uint amountRequired = VexchangeV2Library.getAmountsIn(factory, amountToken, path)[0];
            assert(amountReceived > amountRequired); // fail if we didn't get enough ETH back to repay our flash loan
            VVET.deposit{value: amountRequired}();
            assert(VVET.transfer(msg.sender, amountRequired)); // return VVET to V2 pair
            (bool success,) = sender.call{value: amountReceived - amountRequired}(new bytes(0)); // keep the rest! (ETH)
            assert(success);
        } else {
            (uint minTokens) = abi.decode(data, (uint)); // slippage parameter for V1, passed in by caller
            VVET.withdraw(amountETH);
            uint amountReceived = exchangeV1.ethToTokenSwapInput{value: amountETH}(minTokens, uint(-1));
            uint amountRequired = VexchangeV2Library.getAmountsIn(factory, amountETH, path)[0];
            assert(amountReceived > amountRequired); // fail if we didn't get enough tokens back to repay our flash loan
            assert(token.transfer(msg.sender, amountRequired)); // return tokens to V2 pair
            assert(token.transfer(sender, amountReceived - amountRequired)); // keep the rest! (tokens)
        }
    }
}
