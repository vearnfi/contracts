//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract VTHO is ERC20 {
    uint constant _initial_supply = 100_000_000 * (10**18);
    constructor() ERC20("VeThor", "VTHO") {
        _mint(msg.sender, _initial_supply);
    }
}
