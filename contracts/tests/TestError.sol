pragma solidity 0.8.20;

error CustomError();

contract TestError {

  function testCustomError() public pure {
    revert CustomError();
  }

  function testStringError() public pure {
    require(false, "I am a string error");
  }
}
