// SPDX-License-Identifier: GPL-3.0-only
pragma solidity =0.5.16;

// Loyalty tracks users contribution to a collective program.
// contribution = points x time;
// The longer the time period, the better; More points, the better.

import './libraries/SafeMath.sol';

contract Loyalty {
    using SafeMath for uint256;

    struct User {
        uint256 points; // The total points a user earned.
        uint256 contribution; // Accumulated sum of a user's contribution.
        uint256 lastUpdatedTime; // Last time the above sum was updated.
    }

    // A map to track all users' points and contribution;
    mapping(address => User) private users; // user address => user
    
    // A total registry to track the whole program's points and contribution;
    User private total;

    constructor() public {
        total.points = 0;
        total.contribution = 0;
        total.lastUpdatedTime = block.timestamp;
    }

    // Add points to a user
    function addPoints (address _who, uint256 _amount) internal {
        update(_who);
        users[_who].points += _amount;
        total.points += _amount;
    }

    // Remove points from user
    function removePoints (address _who, uint256 _amount) internal {
        update(_who);
        require(users[_who].points >= _amount, "Loyalty: points not enough");
        users[_who].points -= _amount;
        total.points -= _amount;
    }

    // View points of a single user
    function viewPoints (address _who) public view returns (uint256) {
        return users[_who].points;
    }

    // View points of the whole program
    function viewTotalPoints() public view returns (uint256) {
        return total.points;
    }

    // View contribution of a single user
    function viewContribution (address _who) public view returns (uint256) {
        User memory user = users[_who];
        if (user.lastUpdatedTime == 0) {
            return 0;
        }
        return user.contribution + calculateContribution(user.lastUpdatedTime, block.timestamp, user.points);
    }

    // Remove the user's contribution
    function removeContribution (address _who, uint256 _amount) internal {
        update(_who);
        require(users[_who].contribution >= _amount, "Loyalty: contribution not enough");
        users[_who].contribution -= _amount;
        users[_who].lastUpdatedTime = block.timestamp;
        
        total.contribution -= _amount;
        total.lastUpdatedTime = block.timestamp;
    }

    // View contribution of the whole program
    function viewTotalContribution () public view returns (uint256) {
        return total.contribution + calculateContribution(total.lastUpdatedTime, block.timestamp, total.points);
    }

    // Update the user contribution + the total contribution;
    function update (address _who) internal {
        uint256 currentTime = block.timestamp; // save gas
        User memory user = users[_who]; // save gas

        // If existing user, update his profile
        if (user.lastUpdatedTime > 0) {
            assert(user.lastUpdatedTime <= currentTime);
            users[_who].contribution += calculateContribution(
                user.lastUpdatedTime,
                currentTime,
                user.points
            );
        }
        // Existing or new uesr, update the time
        users[_who].lastUpdatedTime = currentTime;

        // Update the total
        assert(total.lastUpdatedTime <= currentTime);
        total.contribution += calculateContribution(
            total.lastUpdatedTime,
            currentTime,
            total.points
        );
        total.lastUpdatedTime = currentTime;
    }

    // Calculate the contribution during a time period;
    function calculateContribution (
        uint256 t1,
        uint256 t2,
        uint256 points
    ) internal pure returns (uint256) {
        require(t1 <= t2, "t1 should be <= t2");
        return (t2 - t1) * points;
    }
}
