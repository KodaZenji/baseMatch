// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title Achievement
 * @dev Achievement NFTs for users
 */
contract Achievement is ERC721, Ownable {
    uint256 private _tokenIdCounter;
    mapping(address => uint256[]) public userAchievements;

    event AchievementMinted(address indexed user, uint256 tokenId, string achievementType);

    constructor() ERC721("BaseMatch Achievement", "BMACH") {
        // Initialize the contract owner to the deployer
    }

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
}
