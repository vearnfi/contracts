pragma solidity =0.5.16;

import './interfaces/IVexchangeV2Pair.sol';
import './VexchangeV2ERC20.sol';
import './interfaces/IVexchangeV2Factory.sol';
import './interfaces/IVexchangeV2Callee.sol';
import './libraries/Math.sol';
import './interfaces/IERC20.sol';
import './libraries/UQ112x112.sol';


contract VexchangeV2Pair is IVexchangeV2Pair, VexchangeV2ERC20 {
    using SafeMath  for uint;
    using UQ112x112 for uint224;

    uint public constant MINIMUM_LIQUIDITY = 10**3;
    bytes4 private constant SELECTOR = bytes4(keccak256(bytes('transfer(address,uint256)')));
    // Accuracy^2: 10_000_000_000_000_000_000_000_000_000_000_000_000_000_000_000_000_000_000_000_000_000_000_000_000_000
    uint256 public constant SQUARED_ACCURACY = 10e75;
    // Accuracy: 100_000_000_000_000_000_000_000_000_000_000_000_000
    uint256 public constant ACCURACY         = 10e37;
    uint256 public constant FEE_ACCURACY     = 10_000;

    uint public constant MAX_PLATFORM_FEE = 5000;   // 50.00%
    uint public constant MIN_SWAP_FEE     = 5;      //  0.05%
    uint public constant MAX_SWAP_FEE     = 200;    //  2.00%

    uint public swapFee;
    uint public platformFee;

    address public recoverer;
    address public factory;
    address public token0;
    address public token1;

    uint112 private reserve0;           // uses single storage slot, accessible via getReserves
    uint112 private reserve1;           // uses single storage slot, accessible via getReserves
    uint32  private blockTimestampLast; // uses single storage slot, accessible via getReserves

    uint public price0CumulativeLast;
    uint public price1CumulativeLast;
    uint public kLast; // reserve0 * reserve1, as of immediately after the most recent liquidity event

    uint private unlocked = 1;
    modifier lock() {
        require(unlocked == 1, 'VexchangeV2: LOCKED');
        unlocked = 0;
        _;
        unlocked = 1;
    }

    modifier onlyFactory() {
        require(msg.sender == factory, 'VexchangeV2: FORBIDDEN');
        _;
    }

    event Mint(address indexed sender, uint amount0, uint amount1);
    event Burn(address indexed sender, uint amount0, uint amount1, address indexed to);
    event Swap(
        address indexed sender,
        uint amount0In,
        uint amount1In,
        uint amount0Out,
        uint amount1Out,
        address indexed to
    );
    event Sync(uint112 reserve0, uint112 reserve1);
    event SwapFeeChanged(uint oldSwapFee, uint newSwapFee);
    event PlatformFeeChanged(uint oldPlatformFee, uint newPlatformFee);
    event RecovererChanged(address oldRecoverer, address newRecoverer);

    constructor() public {
        factory = msg.sender;
    }

    function platformFeeOn() external view returns (bool _platformFeeOn)
    {
        _platformFeeOn = platformFee > 0;
    }

    function setSwapFee(uint _swapFee) external onlyFactory {
        require(_swapFee >= MIN_SWAP_FEE && _swapFee <= MAX_SWAP_FEE, "VexchangeV2: INVALID_SWAP_FEE");

        emit SwapFeeChanged(swapFee, _swapFee);
        swapFee = _swapFee;
    }

    function setPlatformFee(uint _platformFee) external onlyFactory {
        require(_platformFee <= MAX_PLATFORM_FEE, "VexchangeV2: INVALID_PLATFORM_FEE");

        emit PlatformFeeChanged(platformFee, _platformFee);
        platformFee = _platformFee;
    }

    function setRecoverer(address _recoverer) external onlyFactory {
        emit RecovererChanged(recoverer, _recoverer);
        recoverer = _recoverer;
    }

    function getReserves() public view returns (uint112 _reserve0, uint112 _reserve1, uint32 _blockTimestampLast) {
        _reserve0 = reserve0;
        _reserve1 = reserve1;
        _blockTimestampLast = blockTimestampLast;
    }

    function _safeTransfer(address token, address to, uint value) private {
        (bool success, bytes memory data) = token.call(abi.encodeWithSelector(SELECTOR, to, value));
        require(success && (data.length == 0 || abi.decode(data, (bool))), 'VexchangeV2: TRANSFER_FAILED');
    }

    // called once by the factory at time of deployment
    function initialize(address _token0, address _token1, uint _swapFee, uint _platformFee) external {
        require(msg.sender == factory, 'VexchangeV2: FORBIDDEN'); // sufficient check
        token0 = _token0;
        token1 = _token1;
        swapFee = _swapFee;
        platformFee = _platformFee;
    }

    // update reserves and, on the first call per block, price accumulators
    function _update(uint balance0, uint balance1, uint112 _reserve0, uint112 _reserve1) private {
        require(balance0 <= uint112(-1) && balance1 <= uint112(-1), 'VexchangeV2: OVERFLOW');
        uint32 blockTimestamp = uint32(block.timestamp % 2**32);
        uint32 timeElapsed = blockTimestamp - blockTimestampLast; // overflow is desired
        if (timeElapsed > 0 && _reserve0 != 0 && _reserve1 != 0) {
            // * never overflows, and + overflow is desired
            price0CumulativeLast += uint(UQ112x112.encode(_reserve1).uqdiv(_reserve0)) * timeElapsed;
            price1CumulativeLast += uint(UQ112x112.encode(_reserve0).uqdiv(_reserve1)) * timeElapsed;
        }
        reserve0 = uint112(balance0);
        reserve1 = uint112(balance1);
        blockTimestampLast = blockTimestamp;
        emit Sync(reserve0, reserve1);
    }

    /**
     * _calcFee calculates the appropriate platform fee in terms of tokens that will be minted, based on the growth
     * in sqrt(k), the amount of liquidity in the pool, and the set variable fee in basis points.
     *
     * This function implements the equation defined in the Uniswap V2 whitepaper for calculating platform fees, on
     * which their fee calculation implementation is based. This is a refactored form of equation 6, on page 5 of the
     * Uniswap whitepaper; see https://uniswap.org/whitepaper.pdf for further details.
     *
     * The specific difference between the Uniswap V2 implementation and this fee calculation is the fee variable,
     * which remains a variable with range 0-50% here, but is fixed at (1/6)% in Uniswap V2.
     *
     * The mathematical equation:
     * If 'Fee' is the platform fee, and the previous and new values of the square-root of the invariant k, are
     * K1 and K2 respectively; this equation, in the form coded here can be expressed as:
     *
     *   _sharesToIssue = totalSupply * Fee * (1 - K1/K2) / ( 1 - Fee * (1 - K1/K2) )
     *
     * A reader of the whitepaper will note that this equation is not a literally the same as equation (6), however
     * with some straight-forward algebraic manipulation they can be shown to be mathematically equivalent.
     */
    function _calcFee(uint _sqrtNewK, uint _sqrtOldK, uint _platformFee, uint _circulatingShares) internal pure returns (uint _sharesToIssue) {
        // Assert newK & oldK        < uint112
        // Assert _platformFee       < FEE_ACCURACY
        // Assert _circulatingShares < uint112

        uint256 _scaledGrowth = _sqrtNewK.mul(ACCURACY) / _sqrtOldK;                         // ASSERT: < UINT256
        uint256 _scaledMultiplier = ACCURACY.sub(SQUARED_ACCURACY / _scaledGrowth);          // ASSERT: < UINT128
        uint256 _scaledTargetOwnership = _scaledMultiplier.mul(_platformFee) / FEE_ACCURACY; // ASSERT: < UINT144 during maths, ends < UINT128

        _sharesToIssue = _scaledTargetOwnership.mul(_circulatingShares) / ACCURACY.sub(_scaledTargetOwnership); // ASSERT: _scaledTargetOwnership < ACCURACY
    }

    function _mintFee(uint112 _reserve0, uint112 _reserve1) private returns (bool feeOn) {
        feeOn = platformFee > 0;

        if (feeOn) {
            uint _sqrtOldK = Math.sqrt(kLast); // gas savings

            if (_sqrtOldK != 0) {
                uint _sqrtNewK = Math.sqrt(uint(_reserve0).mul(_reserve1));

                if (_sqrtNewK > _sqrtOldK) {
                    uint _sharesToIssue = _calcFee(_sqrtNewK, _sqrtOldK, platformFee, totalSupply);

                    address platformFeeTo = IVexchangeV2Factory(factory).platformFeeTo();
                    if (_sharesToIssue > 0) _mint(platformFeeTo, _sharesToIssue);
                }
            }
        } else if (kLast != 0) {
            kLast = 0;
        }
    }

    // this low-level function should be called from a contract which performs important safety checks
    function mint(address to) external lock returns (uint liquidity) {
        (uint112 _reserve0, uint112 _reserve1,) = getReserves(); // gas savings
        uint balance0 = IERC20(token0).balanceOf(address(this));
        uint balance1 = IERC20(token1).balanceOf(address(this));
        uint amount0 = balance0.sub(_reserve0);
        uint amount1 = balance1.sub(_reserve1);

        bool feeOn = _mintFee(_reserve0, _reserve1);
        uint _totalSupply = totalSupply; // gas savings, must be defined here since totalSupply can update in _mintFee
        if (_totalSupply == 0) {
            liquidity = Math.sqrt(amount0.mul(amount1)).sub(MINIMUM_LIQUIDITY);
           _mint(address(0), MINIMUM_LIQUIDITY); // permanently lock the first MINIMUM_LIQUIDITY tokens
        } else {
            liquidity = Math.min(amount0.mul(_totalSupply) / _reserve0, amount1.mul(_totalSupply) / _reserve1);
        }
        require(liquidity > 0, 'VexchangeV2: INSUFFICIENT_LIQUIDITY_MINTED');
        _mint(to, liquidity);

        _update(balance0, balance1, _reserve0, _reserve1);
        if (feeOn) kLast = uint(reserve0).mul(reserve1); // reserve0 and reserve1 are up-to-date
        emit Mint(msg.sender, amount0, amount1);
    }

    // this low-level function should be called from a contract which performs important safety checks
    function burn(address to) external lock returns (uint amount0, uint amount1) {
        (uint112 _reserve0, uint112 _reserve1,) = getReserves(); // gas savings
        address _token0 = token0;                                // gas savings
        address _token1 = token1;                                // gas savings
        uint balance0 = IERC20(_token0).balanceOf(address(this));
        uint balance1 = IERC20(_token1).balanceOf(address(this));
        uint liquidity = balanceOf[address(this)];

        bool feeOn = _mintFee(_reserve0, _reserve1);
        uint _totalSupply = totalSupply; // gas savings, must be defined here since totalSupply can update in _mintFee
        amount0 = liquidity.mul(balance0) / _totalSupply; // using balances ensures pro-rata distribution
        amount1 = liquidity.mul(balance1) / _totalSupply; // using balances ensures pro-rata distribution
        require(amount0 > 0 && amount1 > 0, 'VexchangeV2: INSUFFICIENT_LIQUIDITY_BURNED');
        _burn(address(this), liquidity);
        _safeTransfer(_token0, to, amount0);
        _safeTransfer(_token1, to, amount1);
        balance0 = IERC20(_token0).balanceOf(address(this));
        balance1 = IERC20(_token1).balanceOf(address(this));

        _update(balance0, balance1, _reserve0, _reserve1);
        if (feeOn) kLast = uint(reserve0).mul(reserve1); // reserve0 and reserve1 are up-to-date
        emit Burn(msg.sender, amount0, amount1, to);
    }

    // this low-level function should be called from a contract which performs important safety checks
    function swap(uint amount0Out, uint amount1Out, address to, bytes calldata data) external lock {
        require(amount0Out > 0 || amount1Out > 0, 'VexchangeV2: INSUFFICIENT_OUTPUT_AMOUNT');
        (uint112 _reserve0, uint112 _reserve1,) = getReserves(); // gas savings
        require(amount0Out < _reserve0 && amount1Out < _reserve1, 'VexchangeV2: INSUFFICIENT_LIQUIDITY');

        uint balance0;
        uint balance1;
        { // scope for _token{0,1}, avoids stack too deep errors
        address _token0 = token0;
        address _token1 = token1;
        require(to != _token0 && to != _token1, 'VexchangeV2: INVALID_TO');
        if (amount0Out > 0) _safeTransfer(_token0, to, amount0Out); // optimistically transfer tokens
        if (amount1Out > 0) _safeTransfer(_token1, to, amount1Out); // optimistically transfer tokens
        if (data.length > 0) IVexchangeV2Callee(to).vexchangeV2Call(msg.sender, amount0Out, amount1Out, data);
        balance0 = IERC20(_token0).balanceOf(address(this));
        balance1 = IERC20(_token1).balanceOf(address(this));
        }
        uint amount0In = balance0 > _reserve0 - amount0Out ? balance0 - (_reserve0 - amount0Out) : 0;
        uint amount1In = balance1 > _reserve1 - amount1Out ? balance1 - (_reserve1 - amount1Out) : 0;
        require(amount0In > 0 || amount1In > 0, 'VexchangeV2: INSUFFICIENT_INPUT_AMOUNT');
        { // scope for reserve{0,1}Adjusted, avoids stack too deep errors
        uint balance0Adjusted = balance0.mul(10000).sub(amount0In.mul(swapFee));
        uint balance1Adjusted = balance1.mul(10000).sub(amount1In.mul(swapFee));
        require(balance0Adjusted.mul(balance1Adjusted) >= uint(_reserve0).mul(_reserve1).mul(10000**2), 'VexchangeV2: K');
        }

        _update(balance0, balance1, _reserve0, _reserve1);
        emit Swap(msg.sender, amount0In, amount1In, amount0Out, amount1Out, to);
    }

    // force balances to match reserves
    function skim(address to) external lock {
        address _token0 = token0; // gas savings
        address _token1 = token1; // gas savings
        _safeTransfer(_token0, to, IERC20(_token0).balanceOf(address(this)).sub(reserve0));
        _safeTransfer(_token1, to, IERC20(_token1).balanceOf(address(this)).sub(reserve1));
    }

    function recoverToken(address token) external {
        require(token != token0, "VexchangeV2: INVALID_TOKEN_TO_RECOVER");
        require(token != token1, "VexchangeV2: INVALID_TOKEN_TO_RECOVER");
        require(recoverer != address(0), "VexchangeV2: RECOVERER_ZERO_ADDRESS");

        uint _amountToRecover = IERC20(token).balanceOf(address(this));

        _safeTransfer(token, recoverer, _amountToRecover);
    }

    // force reserves to match balances
    function sync() external lock {
        _update(IERC20(token0).balanceOf(address(this)), IERC20(token1).balanceOf(address(this)), reserve0, reserve1);
    }
}
