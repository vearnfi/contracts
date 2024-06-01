// SPDX-License-Identifier: Unlicense
pragma solidity 0.8.20;

import { AccessControl } from "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title Roles
 * @author Feder
 * @notice Implements Owner and Keeper roles.
 */
contract Roles is AccessControl {
    bytes32 public constant KEEPER_ROLE = keccak256("KEEPER_ROLE");

    /// @dev Add `root` to the default admin role as a member.
    constructor (address root) public {
        _grantRole(DEFAULT_ADMIN_ROLE, root); // DEFAULT_ADMIN_ROLE == OWNER_ROLE
        _setRoleAdmin(KEEPER_ROLE, DEFAULT_ADMIN_ROLE);
    }

    /// @dev Restricted to members of the default admin role (`owner`).
    modifier onlyOwner() {
        require(isOwner(msg.sender), "Roles: account is not owner");
        _;
    }

    /// @dev Restricted to members of the keeper role.
    modifier onlyKeeper() {
        require(isKeeper(msg.sender), "Roles: account is not keeper");
        _;
    }

    /// @dev Return `true` if the account belongs to the owner role.
    function isOwner(address account) public virtual view returns (bool) {
        return hasRole(DEFAULT_ADMIN_ROLE, account);
    }

    /// @dev Return `true` if the account belongs to the keeper role.
    function isKeeper(address account) public virtual view returns (bool) {
        return hasRole(KEEPER_ROLE, account);
    }

    /// @dev Add an account to the owner role. Restricted to owners.
    function addOwner(address account) public virtual {
        grantRole(DEFAULT_ADMIN_ROLE, account);
    }

    /// @dev Add an account to the keeper role. Restricted to owners.
    function addKeeper(address account) public virtual {
        grantRole(KEEPER_ROLE, account);
    }

    /// @dev Remove oneself from the owner role.
    function renounceOwner(address callerConfirmation) public virtual {
        renounceRole(DEFAULT_ADMIN_ROLE, callerConfirmation);
    }

    /// @dev Remove an account from the keeper role. Restricted to owners.
    function removeKeeper(address account) public virtual {
        revokeRole(KEEPER_ROLE, account);
    }
}
