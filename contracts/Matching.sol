// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IProfileNFT {
    function profileExists(address user) external view returns (bool);
}

/**
 * @title Matching
 * @dev Handles user matching and interest expressions
 */
contract Matching {
    IProfileNFT public profileNFT;

    struct Match {
        uint256 matchId;
        address user1;
        address user2;
        uint256 timestamp;
    }

    uint256 private _matchIdCounter;
    mapping(address => mapping(address => bool)) public interests;
    mapping(address => address[]) public userMatches;
    mapping(address => mapping(address => bool)) public isMatched;

    event InterestExpressed(address indexed from, address indexed to);
    event MatchCreated(address indexed user1, address indexed user2, uint256 matchId);

    constructor(address _profileNFT) {
        profileNFT = IProfileNFT(_profileNFT);
    }

    /**
     * @dev Express interest in another user
     */
    function expressInterest(address targetUser) external {
        require(msg.sender != targetUser, "Cannot express interest in yourself");
        require(profileNFT.profileExists(msg.sender), "Sender profile does not exist");
        require(profileNFT.profileExists(targetUser), "Target profile does not exist");
        require(!interests[msg.sender][targetUser], "Already expressed interest");
        require(!isMatched[msg.sender][targetUser], "Already matched");

        interests[msg.sender][targetUser] = true;
        emit InterestExpressed(msg.sender, targetUser);

        // Check if mutual interest exists
        if (interests[targetUser][msg.sender]) {
            _createMatch(msg.sender, targetUser);
        }
    }

    /**
     * @dev Create a match between two users
     */
    function _createMatch(address user1, address user2) private {
        _matchIdCounter++;
        uint256 matchId = _matchIdCounter;

        userMatches[user1].push(user2);
        userMatches[user2].push(user1);

        isMatched[user1][user2] = true;
        isMatched[user2][user1] = true;

        emit MatchCreated(user1, user2, matchId);
    }

    /**
     * @dev Get all matches for a user
     */
    function getMatches(address user) external view returns (address[] memory) {
        return userMatches[user];
    }

    /**
     * @dev Check if user has expressed interest
     */
    function hasExpressedInterest(address from, address to) external view returns (bool) {
        return interests[from][to];
    }
}
