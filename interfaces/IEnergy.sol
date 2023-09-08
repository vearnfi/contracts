// SPDX-License-Identifier: GPL-3.0-only
pragma solidity ^0.8.0;

// TODO: why not using 0.4.24 as in Energy contract def?
interface IEnergy {
  // @param _owner The address from which the balance will be retrieved
  // @return The balance
	function balanceOf(address _owner) external view returns(uint256);

  // @notice send `_value` token to `_to` from `msg.sender`
  // @param _to The address of the recipient
  // @param _value The amount of token to be transferred
  // @return Whether the transfer was successful or not
  function transfer(address _to, uint256 _value) external returns (bool success);

  // @notice send `_value` token to `_to` from `_from` on the condition it is approved by `_from`
  // @param _from The address of the sender
  // @param _to The address of the recipient
  // @param _value The amount of token to be transferred
  // @return Whether the transfer was successful or not
  function transferFrom(address _from, address _to, uint256 _amount) external returns(bool success);

  // @notice `msg.sender` approves `_addr` to spend `_value` tokens
  // @param _spender The address of the account able to transfer the tokens
  // @param _value The amount of wei to be approved for transfer
  // @return Whether the approval was successful or not
  function approve(address _spender, uint256 _value) external returns(bool success);
}
