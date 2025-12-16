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
    mapping(uint256 => string) public achievementMetadataURI;
    mapping(address => mapping(uint256 => bool)) public userHasEarnedAchievement;
    
    // Base IPFS URI for all achievement metadata
    string public baseMetadataURI;

    event AchievementMinted(address indexed user, uint256 tokenId, string achievementType);

    function initialize() public initializer {
        __ERC721_init("BaseMatch Achievement", "BMACH");
        __Ownable_init(msg.sender);
        __UUPSUpgradeable_init();
        _tokenIdCounter = 0;
        
        // ✅ Automatically initialize IPFS base URI
        baseMetadataURI = "https://equal-bronze-bat.myfilebase.com/ipfs/QmUaKVFosUfGagYmuE9fTqkw19LKJ9F3Job7QEtrnUZJdW/";
        
        // ✅ Automatically initialize all achievement metadata URIs
        _initializeAchievementMetadata();
    }

    /**
     * @dev Automatically initialize all achievement metadata URIs on deployment
     */
    function _initializeAchievementMetadata() private {
        achievementMetadataURI[1] = string(abi.encodePacked(baseMetadataURI, "first-date.json"));
        achievementMetadataURI[2] = string(abi.encodePacked(baseMetadataURI, "5-dates.json"));
        achievementMetadataURI[3] = string(abi.encodePacked(baseMetadataURI, "10-dates.json"));
        achievementMetadataURI[4] = string(abi.encodePacked(baseMetadataURI, "5-star.json"));
        achievementMetadataURI[5] = string(abi.encodePacked(baseMetadataURI, "perfect-week.json"));
        achievementMetadataURI[6] = string(abi.encodePacked(baseMetadataURI, "match-maker.json"));
    }

    /**
     * @dev Update base IPFS URI (only owner, in case IPFS location changes)
     */
    function setBaseMetadataURI(string memory newBaseURI) external onlyOwner {
        baseMetadataURI = newBaseURI;
        // Re-initialize achievement metadata with new base URI
        _initializeAchievementMetadata();
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
     * @dev Mint an achievement NFT (one per user per achievement type)
     * Returns true if minted, false if user already has this achievement
     */
    function mintAchievement(address user, string memory achievementType) external onlyOwner returns (bool) {
        // Extract tokenId from achievementType (e.g., "First Date" -> tokenId 1)
        uint256 tokenId = getTokenIdFromType(achievementType);
        require(tokenId > 0, "Invalid achievement type");
        
        // Check if user already earned this achievement
        if (userHasEarnedAchievement[user][tokenId]) {
            return false;
        }
        
        // Mark as earned and mint
        userHasEarnedAchievement[user][tokenId] = true;
        _safeMint(user, tokenId);
        userAchievements[user].push(tokenId);
        
        emit AchievementMinted(user, tokenId, achievementType);
        return true;
    }

    /**
     * @dev Helper to convert achievement type string to tokenId
     */
    function getTokenIdFromType(string memory achievementType) public pure returns (uint256) {
        bytes32 typeHash = keccak256(abi.encodePacked(achievementType));
        
        if (typeHash == keccak256(abi.encodePacked("First Date"))) return 1;
        if (typeHash == keccak256(abi.encodePacked("5 Dates"))) return 2;
        if (typeHash == keccak256(abi.encodePacked("10 Dates"))) return 3;
        if (typeHash == keccak256(abi.encodePacked("5 Star Rating"))) return 4;
        if (typeHash == keccak256(abi.encodePacked("Perfect Week"))) return 5;
        if (typeHash == keccak256(abi.encodePacked("Match Maker"))) return 6;
        
        return 0;
    }

    /**
     * @dev Get all achievements for a user
     */
    function getUserAchievements(address user) external view returns (uint256[] memory) {
        return userAchievements[user];
    }

    /**
     * @dev Check if user has earned a specific achievement
     */
    function hasEarnedAchievement(address user, uint256 tokenId) external view returns (bool) {
        return userHasEarnedAchievement[user][tokenId];
    }

    /**
     * @dev Return IPFS metadata URI for tokenId
     */
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        require(_ownerOf(tokenId) != address(0), "ERC721: Invalid token ID");
        return achievementMetadataURI[tokenId];
    }

    /**
     * @dev Override transfer functions to make achievements non-transferable (Soulbound)
     */
    function transferFrom(address, address, uint256) public pure override {
        revert("Achievement: Non-transferable (Soulbound)");
    }

    function safeTransferFrom(address, address, uint256, bytes memory) public pure override {
        revert("Achievement: Non-transferable (Soulbound)");
    }
}
