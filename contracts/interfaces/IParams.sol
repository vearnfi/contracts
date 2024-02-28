pragma solidity ^0.8.0;
// Notice: we are using solidity version 0.8.0 instead of 0.4.24
// in order to be able to import this interface inside the Trader contract.

/// @title Params stores the governance params of VeChain thor.
/// The params can be set by the executor, a contract that is authorized to modify governance params by a voting Committee.
/// Anyone can get the params just by calling "get" funtion.
/// The governance params is written in genesis block at launch time.
/// You can check these params at source file: https://github.com/vechain/thor/blob/master/thor/params.go.

interface IParams {
    function executor() external view returns(address);
    function set(bytes32 _key, uint256 _value) external;
    function get(bytes32 _key) external view returns(uint256);
}
