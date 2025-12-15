// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

/**
 * @title Achievement
 * @dev Achievement NFTs for users (Upgradeable)
 */
contract Achievement is Initializable, ERC721Upgradeable, OwnableUpgradeable, UUPSUpgradeable {
    uint256 private _tokenIdCounter;
    mapping(address => uint256[]) public userAchievements;

    event AchievementMinted(address indexed user, uint256 tokenId, string achievementType);

    constructor() {
        _disableInitializers();
    }

    function initialize() public initializer {
        __ERC721_init("BaseMatch Achievement", "BMACH");
        __Ownable_init(msg.sender);
        __UUPSUpgradeable_init();
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
     * @dev Mint an achievement NFT
     */
    function mintAchievement(address user, string memory achievementType) external onlyOwner {
        _tokenIdCounter++;
        uint256 newTokenId = _tokenIdCounter;
        
        _safeMint(user, newTokenId);
        userAchievements[user].push(newTokenId);
        
        emit AchievementMinted(user, newTokenId, achievementType);
    }

    /**
     * @dev Get all achievements for a user
     */
    function getUserAchievements(address user) external view returns (uint256[] memory) {
        return userAchievements[user];
    }

    /**
     * @dev Override transfer functions to make achievements non-transferable
     */
    function transferFrom(address, address, uint256) public pure override {
        revert("Achievement: Transfer not allowed");
    }

    function safeTransferFrom(address, address, uint256, bytes memory) public pure override {
        revert("Achievement: Transfer not allowed");
    }
}
