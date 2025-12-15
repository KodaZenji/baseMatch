// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

interface IMatching {
    function isMatched(address user1, address user2) external view returns (bool);
}

/**
 * @title Reputation
 * @dev Manages user reputation scores (Upgradeable)
 */
contract Reputation is Initializable, OwnableUpgradeable, UUPSUpgradeable {
    IMatching public matching;

    struct ReputationData {
        uint256 totalRating;    // Sum of all ratings
        uint256 ratingCount;    // Number of ratings received
        uint256 totalDates;     // Number of dates completed
        uint256 noShows;        // Number of no-shows
        uint256 lastUpdated;
    }

    mapping(address => ReputationData) public userReputation;
    mapping(address => mapping(address => bool)) public hasRated;

    event ReputationUpdated(address indexed user, uint256 newScore);
    event UserRated(address indexed rater, address indexed rated, uint256 score);

    constructor(address _matching) {
        _disableInitializers();
    }

    function initialize(address _matching) public initializer {
        __Ownable_init(msg.sender);
        __UUPSUpgradeable_init();
        matching = IMatching(_matching);
    }

    /**
     * @dev Authorize upgrade (only owner can upgrade)
     */
    function _authorizeUpgrade(address newImplementation)
        internal
        onlyOwner
        override
    {}

    /**
     * @dev Rate a matched user (1-5 stars)
     */
    function rateUser(address ratedUser, uint8 rating) external {
        require(matching.isMatched(msg.sender, ratedUser), "Users are not matched");
        require(rating >= 1 && rating <= 5, "Rating must be between 1 and 5");
        require(!hasRated[msg.sender][ratedUser], "Already rated this user");

        hasRated[msg.sender][ratedUser] = true;

        // Update reputation data
        ReputationData storage rep = userReputation[ratedUser];
        rep.totalRating += rating;
        rep.ratingCount += 1;
        rep.lastUpdated = block.timestamp;

        emit UserRated(msg.sender, ratedUser, rating);
        emit ReputationUpdated(ratedUser, rep.totalRating / rep.ratingCount);
    }

    /**
     * @dev Record a completed date
     */
    function recordDate(address user) external onlyOwner {
        userReputation[user].totalDates += 1;
    }

    /**
     * @dev Record a no-show
     */
    function recordNoShow(address user) external onlyOwner {
        userReputation[user].noShows += 1;
    }

    /**
     * @dev Get user reputation data
     */
    function getReputation(address user) external view returns (uint256 totalDates, uint256 noShows, uint256 totalRating, uint256 ratingCount) {
        ReputationData storage rep = userReputation[user];
        return (rep.totalDates, rep.noShows, rep.totalRating, rep.ratingCount);
    }

    /**
     * @dev Get average rating for a user
     */
    function getAverageRating(address user) external view returns (uint256) {
        ReputationData storage rep = userReputation[user];
        if (rep.ratingCount == 0) return 0;
        return rep.totalRating / rep.ratingCount;
    }
}