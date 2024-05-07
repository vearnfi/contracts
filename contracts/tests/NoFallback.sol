pragma solidity 0.8.19;

import { IEnergy } from "./../interfaces/IEnergy.sol";
import { Trader } from "../Trader.sol";

contract NoFallback {
  Trader public immutable trader;
  IEnergy public constant vtho = IEnergy(0x0000000000000000000000000000456E65726779);
  address public immutable owner;

  modifier onlyOwner() {
    require(msg.sender == owner, "NoFallback: account is not owner");
    _;
  }

  constructor(address traderAddr) {
    trader = Trader(traderAddr);
    owner = msg.sender;
  }

  function saveConfig(uint256 reserveBalance) public onlyOwner {
    trader.saveConfig(reserveBalance);
  }

  function approveEnergyAllowance() public onlyOwner {
    vtho.approve(address(trader), 2**256 - 1);
  }

  // No payable fallback funtion implemented
}
