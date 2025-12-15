// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

interface IProfileNFT {
    function profileExists(address user) external view returns (bool);
}

/**
 * @title Matching
 * @dev Handles user matching and interest expressions (Upgradeable)
 */
contract Matching is Initializable, OwnableUpgradeable, UUPSUpgradeable {
    IProfileNFT public profileNFT;
    address public profileNFTContract;

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
    event ProfileDeleted(address indexed user, uint256 matchesCleared);
    event MatchRemoved(address indexed user1, address indexed user2);

    constructor(address _profileNFT) {
        _disableInitializers();
    }

    function initialize(address _profileNFT) public initializer {
        __Ownable_init(msg.sender);
        __UUPSUpgradeable_init();
        profileNFT = IProfileNFT(_profileNFT);
        profileNFTContract = _profileNFT;
    }

    /**
     * @dev Authorize upgrade (only owner can upgrade)
     */
    function _authorizeUpgrade(address newImplementation)
        internal
        onlyOwner
        override
    {}

    modifier onlyProfileNFT() {
        require(msg.sender == profileNFTContract, "Only ProfileNFT can call this");
        _;
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

    /**
     * @dev Remove a match between two users (both users' match records deleted)
     * Does NOT affect reputation scores
     */
    function removeMatch(address matchedUser) external {
        require(matchedUser != address(0), "Invalid address");
        require(isMatched[msg.sender][matchedUser], "Not matched with this user");

        // Clear mutual match status
        isMatched[msg.sender][matchedUser] = false;
        isMatched[matchedUser][msg.sender] = false;

        // Clear mutual interests
        interests[msg.sender][matchedUser] = false;
        interests[matchedUser][msg.sender] = false;

        // Remove from match lists
        _removeFromMatchList(msg.sender, matchedUser);
        _removeFromMatchList(matchedUser, msg.sender);

        emit MatchRemoved(msg.sender, matchedUser);
    }

    /**
     * @dev Clean up all match data when a profile is deleted
     * Can only be called by ProfileNFT contract
     */
    function notifyProfileDeleted(address deletedUser) external onlyProfileNFT {
        address[] memory matches = userMatches[deletedUser];
        uint256 matchCount = matches.length;
        
        // Clean up all matches for this user
        for (uint256 i = 0; i < matchCount; i++) {
            address matchedUser = matches[i];
            
            // Clear mutual match status
            isMatched[deletedUser][matchedUser] = false;
            isMatched[matchedUser][deletedUser] = false;
            
            // Clear mutual interests
            interests[deletedUser][matchedUser] = false;
            interests[matchedUser][deletedUser] = false;
            
            // Remove deletedUser from matchedUser's match list
            _removeFromMatchList(matchedUser, deletedUser);
        }
        
        // Clear deletedUser's match list
        delete userMatches[deletedUser];
        
        emit ProfileDeleted(deletedUser, matchCount);
    }

    /**
     * @dev Helper function to remove a user from another user's match list
     */
    function _removeFromMatchList(address user, address toRemove) private {
        address[] storage matches = userMatches[user];
        uint256 length = matches.length;
        
        for (uint256 i = 0; i < length; i++) {
            if (matches[i] == toRemove) {
                // Move the last element to this position and pop
                matches[i] = matches[length - 1];
                matches.pop();
                break;
            }
        }
    }
}
