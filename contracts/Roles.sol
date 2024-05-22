// SPDX-License-Identifier: Unlicense
pragma solidity 0.8.20;

import { AccessControl } from "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title Roles
 * @author Feder
 * @notice Implements Owner and Admin roles.
 */
contract Roles is AccessControl {
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

    /// @dev Add `root` to the default admin role as a member.
    constructor (address root) public {
        _grantRole(DEFAULT_ADMIN_ROLE, root); // DEFAULT_ADMIN_ROLE == OWNER_ROLE
        _setRoleAdmin(ADMIN_ROLE, DEFAULT_ADMIN_ROLE);
    }

    /// @dev Restricted to members of the default admin role (`owner`).
    modifier onlyOwner() {
        require(isOwner(msg.sender), "Roles: account is not owner");
        _;
    }

    /// @dev Restricted to members of the admin role.
    modifier onlyAdmin() {
        require(isAdmin(msg.sender), "Roles: account is not admin");
        _;
    }

    /// @dev Return `true` if the account belongs to the owner role.
    function isOwner(address account) public virtual view returns (bool) {
        return hasRole(DEFAULT_ADMIN_ROLE, account);
    }

    /// @dev Return `true` if the account belongs to the admin role.
    function isAdmin(address account) public virtual view returns (bool) {
        return hasRole(ADMIN_ROLE, account);
    }

    /// @dev Add an account to the owner role. Restricted to owners.
    function addOwner(address account) public virtual onlyOwner {
        grantRole(DEFAULT_ADMIN_ROLE, account);
    }

    /// @dev Add an account to the admin role. Restricted to owners.
    function addAdmin(address account) public virtual onlyOwner {
        grantRole(ADMIN_ROLE, account);
    }

    /// @dev Remove oneself from the owner role.
    function renounceOwner() public virtual {
        renounceRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    /// @dev Remove an account from the admin role. Restricted to owners.
    function removeAdmin(address account) public virtual onlyOwner {
        revokeRole(ADMIN_ROLE, account);
    }
}
