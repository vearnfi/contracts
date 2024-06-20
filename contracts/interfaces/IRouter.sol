pragma solidity 0.8.20;

interface IRouter {
  function WETH() external view returns (address);
  function swapExactTokensForETH(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline)
  external
  returns (uint[] memory amounts);
  function getAmountsOut(uint amountIn, address[] calldata path) external view returns (uint[] memory amounts);
}
