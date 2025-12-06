// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

interface IMatching {
    function isMatched(address user1, address user2) external view returns (bool);
}

/**
 * @title Staking
 * @dev Manages USDC staking for dates
 */
contract Staking is Ownable {
    IERC20 public usdc;
    IMatching public matching;

    struct Stake {
        uint256 amount;
        uint256 meetingTime;
        bool user1Confirmed;
        bool user2Confirmed;
        bool claimed;
    }

    mapping(address => mapping(address => Stake)) public stakes;

    uint256 public constant CONFIRMATION_WINDOW = 48 hours;
    uint256 public constant PLATFORM_FEE = 5; // 5%

    event StakeCreated(address indexed user1, address indexed user2, uint256 amount, uint256 meetingTime);
    event MeetingConfirmed(address indexed user, address indexed matchedUser);
    event StakeClaimed(address indexed user1, address indexed user2, uint256 user1Amount, uint256 user2Amount);

    constructor(address _usdc, address _matching) {
        usdc = IERC20(_usdc);
        matching = IMatching(_matching);
    }

    /**
     * @dev Create a stake for a meeting
     */
    function createStake(address matchedUser, uint256 amount, uint256 meetingTime) external {
        require(matching.isMatched(msg.sender, matchedUser), "Not matched");
        require(amount >= 5 * 10**6, "Minimum stake is 5 USDC");
        require(meetingTime > block.timestamp, "Meeting time must be in the future");
        require(stakes[msg.sender][matchedUser].amount == 0, "Stake already exists");

        usdc.transferFrom(msg.sender, address(this), amount);

        stakes[msg.sender][matchedUser] = Stake({
            amount: amount,
            meetingTime: meetingTime,
            user1Confirmed: false,
            user2Confirmed: false,
            claimed: false
        });

        emit StakeCreated(msg.sender, matchedUser, amount, meetingTime);
    }

    /**
     * @dev Confirm that meeting happened
     */
    function confirmMeeting(address matchedUser) external {
        Stake storage stake1 = stakes[msg.sender][matchedUser];
        Stake storage stake2 = stakes[matchedUser][msg.sender];

        require(stake1.amount > 0 || stake2.amount > 0, "No stake exists");
        require(block.timestamp >= stake1.meetingTime || block.timestamp >= stake2.meetingTime, "Meeting time not reached");
        require(block.timestamp <= stake1.meetingTime + CONFIRMATION_WINDOW || 
                block.timestamp <= stake2.meetingTime + CONFIRMATION_WINDOW, "Confirmation window expired");

        if (stake1.amount > 0) {
            stake1.user1Confirmed = true;
        }
        if (stake2.amount > 0) {
            stake2.user2Confirmed = true;
        }

        emit MeetingConfirmed(msg.sender, matchedUser);
    }

    /**
     * @dev Claim stake after confirmation window
     * Uses checks-effects-interactions pattern to prevent reentrancy
     */
    function claimStake(address matchedUser) external {
        Stake storage stake1 = stakes[msg.sender][matchedUser];
        Stake storage stake2 = stakes[matchedUser][msg.sender];

        // Checks
        require(stake1.amount > 0 || stake2.amount > 0, "No stake exists");
        require(!stake1.claimed && !stake2.claimed, "Already claimed");
        require(block.timestamp > stake1.meetingTime + CONFIRMATION_WINDOW ||
                block.timestamp > stake2.meetingTime + CONFIRMATION_WINDOW, "Confirmation window not ended");

        // Effects - Update state BEFORE external calls
        uint256 user1Amount = stake1.amount;
        uint256 user2Amount = stake2.amount;
        
        stake1.claimed = true;
        stake2.claimed = true;

        uint256 user1Payout = 0;
        uint256 user2Payout = 0;
        uint256 feePayout = 0;

        // Calculate payouts
        if (stake1.user1Confirmed && stake2.user2Confirmed) {
            // Both confirmed - full refund minus platform fee
            uint256 fee1 = (user1Amount * PLATFORM_FEE) / 100;
            uint256 fee2 = (user2Amount * PLATFORM_FEE) / 100;
            user1Payout = user1Amount - fee1;
            user2Payout = user2Amount - fee2;
            feePayout = fee1 + fee2;

        } else if (stake1.user1Confirmed && !stake2.user2Confirmed) {
            // Only user1 confirmed - user1 gets 150%, user2 gets 50%
            uint256 bonus = (user2Amount * 50) / 100;
            user1Payout = user1Amount + bonus;
            user2Payout = user2Amount - bonus;

        } else if (!stake1.user1Confirmed && stake2.user2Confirmed) {
            // Only user2 confirmed - user2 gets 150%, user1 gets 50%
            uint256 bonus = (user1Amount * 50) / 100;
            user1Payout = user1Amount - bonus;
            user2Payout = user2Amount + bonus;

        } else {
            // Neither confirmed - full refund
            user1Payout = user1Amount;
            user2Payout = user2Amount;
        }

        // Interactions - External calls AFTER state changes
        if (user1Payout > 0) {
            require(usdc.transfer(msg.sender, user1Payout), "User1 transfer failed");
        }
        if (user2Payout > 0) {
            require(usdc.transfer(matchedUser, user2Payout), "User2 transfer failed");
        }
        if (feePayout > 0) {
            require(usdc.transfer(owner(), feePayout), "Fee transfer failed");
        }

        emit StakeClaimed(msg.sender, matchedUser, user1Amount, user2Amount);
    }

    /**
     * @dev Get stake information
     */
    function getStake(address user1, address user2) external view returns (Stake memory) {
        return stakes[user1][user2];
    }
}