// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

interface IMatching {
    function notifyProfileDeleted(address deletedUser) external;
}

/**
 * @title ProfileNFT
 * @dev Soulbound NFT for user profiles - non-transferable
 */
contract ProfileNFT is ERC721, Ownable {
    struct Profile {
        uint256 tokenId;
        string name;
        uint8 age;
        string gender;
        string interests;
        string photoUrl;
        string email;
        bool exists;
    }

    uint256 private _tokenIdCounter;
    mapping(address => Profile) public profiles;
    mapping(address => uint256) public addressToTokenId;
    mapping(uint256 => address) public tokenIdToAddress; // NEW: Map tokenId to address for efficient metadata queries
    mapping(string => bool) private emailExists;
    mapping(string => address) private emailToAddress;

    address public matchingContract;

    // Constants for validation
    uint256 private constant MAX_NAME_LENGTH = 100;
    uint256 private constant MIN_NAME_LENGTH = 2;
    uint256 private constant MAX_INTERESTS_LENGTH = 500;
    uint256 private constant MAX_PHOTO_URL_LENGTH = 500;

    /**
     * @dev Validate email format (basic validation)
     */
    function _isValidEmail(string memory email) private pure returns (bool) {
        bytes memory emailBytes = bytes(email);
        if (emailBytes.length < 5) return false; // Minimum: a@b.c
        if (emailBytes.length > 254) return false; // RFC 5321
        
        uint256 atCount = 0;
        bool hasAtSign = false;
        bool hasDot = false;
        
        for (uint256 i = 0; i < emailBytes.length; i++) {
            bytes1 char = emailBytes[i];
            
            // Count @ signs
            if (char == '@') {
                atCount++;
                hasAtSign = true;
                // @ must not be first or last
                if (i == 0 || i == emailBytes.length - 1) return false;
            }
            // Check for dot after @
            if (hasAtSign && char == '.') {
                hasDot = true;
            }
        }
        
        // Must have exactly one @ and at least one dot after it
        return atCount == 1 && hasDot;
    }

    /**
     * @dev Normalize email to lowercase for consistent storage
     */
    function _normalizeEmail(string memory email) private pure returns (string memory) {
        bytes memory emailBytes = bytes(email);
        bytes memory result = new bytes(emailBytes.length);
        
        for (uint256 i = 0; i < emailBytes.length; i++) {
            bytes1 char = emailBytes[i];
            // Convert A-Z to a-z
            if (char >= bytes1('A') && char <= bytes1('Z')) {
                result[i] = bytes1(uint8(char) + 32);
            } else {
                result[i] = char;
            }
        }
        
        return string(result);
    }

    // ... existing code ...
    event ProfileCreated(address indexed user, uint256 tokenId, string name);
    event ProfileUpdated(address indexed user, string name, uint8 age, string gender, string interests, string photoUrl, string email);
    event ProfileDeleted(address indexed user, uint256 tokenId);
    event EmailRegistered(string email, address user);

    constructor() ERC721("BaseMatch Profile", "BMPRO") {
        // Initialize the contract owner to the deployer
    }

    /**
     * @dev Set the Matching contract address (can only be set once)
     */
    function setMatchingContract(address _matchingContract) external onlyOwner {
        require(matchingContract == address(0), "Matching contract already set");
        require(_matchingContract != address(0), "Invalid address");
        matchingContract = _matchingContract;
    }

    /**
     * @dev Create a new profile (Soulbound NFT) with wallet connection
     */
    function createProfile(
        string memory name,
        uint8 age,
        string memory gender,
        string memory interests,
        string memory photoUrl
    ) external {
        require(!profiles[msg.sender].exists, "Profile already exists");
        require(age >= 18, "Must be 18 or older");
        require(age <= 120, "Age must be realistic");
        require(bytes(name).length >= MIN_NAME_LENGTH && bytes(name).length <= MAX_NAME_LENGTH, "Name must be 2-100 characters");
        require(bytes(interests).length > 0 && bytes(interests).length <= MAX_INTERESTS_LENGTH, "Interests must be 1-500 characters");
        require(bytes(photoUrl).length <= MAX_PHOTO_URL_LENGTH, "Photo URL too long");
        require(bytes(gender).length > 0 && bytes(gender).length <= 50, "Gender must be valid");

        _tokenIdCounter++;
        uint256 newTokenId = _tokenIdCounter;

        profiles[msg.sender] = Profile({
            tokenId: newTokenId,
            name: name,
            age: age,
            gender: gender,
            interests: interests,
            photoUrl: photoUrl,
            email: "",
            exists: true
        });

        addressToTokenId[msg.sender] = newTokenId;
        tokenIdToAddress[newTokenId] = msg.sender; // NEW: Map tokenId to address
        _safeMint(msg.sender, newTokenId);

        emit ProfileCreated(msg.sender, newTokenId, name);
    }

    /**
     * @dev Register with email and create a profile
     */
    function registerWithEmail(
        string memory name,
        uint8 age,
        string memory gender,
        string memory interests,
        string memory email
    ) external {
        require(!profiles[msg.sender].exists, "Profile already exists");
        require(age >= 18, "Must be 18 or older");
        require(age <= 120, "Age must be realistic");
        require(bytes(name).length >= MIN_NAME_LENGTH && bytes(name).length <= MAX_NAME_LENGTH, "Name must be 2-100 characters");
        require(bytes(interests).length > 0 && bytes(interests).length <= MAX_INTERESTS_LENGTH, "Interests must be 1-500 characters");
        require(bytes(email).length > 0, "Email cannot be empty");
        require(_isValidEmail(email), "Invalid email format");
        
        // Normalize email to lowercase for consistent storage
        string memory normalizedEmail = _normalizeEmail(email);
        require(!emailExists[normalizedEmail], "Email already registered");

        _tokenIdCounter++;
        uint256 newTokenId = _tokenIdCounter;

        // Store email registration
        emailExists[normalizedEmail] = true;
        emailToAddress[normalizedEmail] = msg.sender;

        profiles[msg.sender] = Profile({
            tokenId: newTokenId,
            name: name,
            age: age,
            gender: gender,
            interests: interests,
            photoUrl: "",
            email: normalizedEmail,
            exists: true
        });

        addressToTokenId[msg.sender] = newTokenId;
        tokenIdToAddress[newTokenId] = msg.sender; // NEW: Map tokenId to address
        _safeMint(msg.sender, newTokenId);

        emit ProfileCreated(msg.sender, newTokenId, name);
        emit EmailRegistered(normalizedEmail, msg.sender);
    }

    /**
     * @dev Update existing profile
     */
    function updateProfile(
        string memory name,
        uint8 age,
        string memory gender,
        string memory interests,
        string memory photoUrl,
        string memory email
    ) external {
        require(profiles[msg.sender].exists, "Profile does not exist");
        require(age >= 18, "Must be 18 or older");
        require(age <= 120, "Age must be realistic");
        require(bytes(name).length >= MIN_NAME_LENGTH && bytes(name).length <= MAX_NAME_LENGTH, "Name must be 2-100 characters");
        require(bytes(interests).length > 0 && bytes(interests).length <= MAX_INTERESTS_LENGTH, "Interests must be 1-500 characters");
        require(bytes(photoUrl).length <= MAX_PHOTO_URL_LENGTH, "Photo URL too long");
        require(bytes(gender).length > 0 && bytes(gender).length <= 50, "Gender must be valid");

        // If email is being updated and is not empty, validate it
        if (bytes(email).length > 0) {
            require(_isValidEmail(email), "Invalid email format");
            string memory normalizedEmail = _normalizeEmail(email);
            
            // Check if new email is already registered by someone else
            if (!_emailsEqual(profiles[msg.sender].email, normalizedEmail)) {
                require(!emailExists[normalizedEmail], "Email already registered");
                // Remove old email if it exists
                if (bytes(profiles[msg.sender].email).length > 0) {
                    emailExists[profiles[msg.sender].email] = false;
                }
                emailExists[normalizedEmail] = true;
                emailToAddress[normalizedEmail] = msg.sender;
            }
            
            profiles[msg.sender].email = normalizedEmail;
        }

        Profile storage profile = profiles[msg.sender];
        profile.name = name;
        profile.age = age;
        profile.gender = gender;
        profile.interests = interests;
        profile.photoUrl = photoUrl;

        emit ProfileUpdated(msg.sender, name, age, gender, interests, photoUrl, profile.email);
    }

    /**
     * @dev Helper to compare two email strings
     */
    function _emailsEqual(string memory a, string memory b) private pure returns (bool) {
        return keccak256(abi.encodePacked(a)) == keccak256(abi.encodePacked(b));
    }

    /**
     * @dev Get address by email
     */
    function getAddressByEmail(string memory email) external view returns (address) {
        return emailToAddress[email];
    }

    /**
     * @dev Check if email exists
     */
    function isEmailRegistered(string memory email) external view returns (bool) {
        return emailExists[email];
    }

    /**
     * @dev Get profile by address
     */
    function getProfile(address user) external view returns (Profile memory) {
        return profiles[user];
    }

    /**
     * @dev NEW: Get profile by tokenId (for metadata API queries)
     */
    function getProfileByTokenId(uint256 tokenId) external view returns (Profile memory) {
        address user = tokenIdToAddress[tokenId];
        require(user != address(0), "Token does not exist");
        return profiles[user];
    }

    /**
     * @dev Check if profile exists
     */
    function profileExists(address user) external view returns (bool) {
        return profiles[user].exists;
    }

    /**
     * @dev Delete user profile and burn NFT
     * Can only be called by the profile owner
     */
    function deleteProfile() external {
        require(profiles[msg.sender].exists, "Profile does not exist");
        
        Profile memory userProfile = profiles[msg.sender];
        uint256 tokenId = userProfile.tokenId;
        
        // Clear email registration if exists
        if (bytes(userProfile.email).length > 0) {
            emailExists[userProfile.email] = false;
            delete emailToAddress[userProfile.email];
        }
        
        // Notify Matching contract to clean up matches if contract is set
        if (matchingContract != address(0)) {
            try IMatching(matchingContract).notifyProfileDeleted(msg.sender) {
                // Successfully cleaned up matches
            } catch {
                // Continue even if matching cleanup fails
            }
        }
        
        // Clear profile data
        delete profiles[msg.sender];
        delete addressToTokenId[msg.sender];
        delete tokenIdToAddress[tokenId]; // NEW: Clean up tokenId mapping
        
        // Burn the NFT
        _burn(tokenId);
        
        emit ProfileDeleted(msg.sender, tokenId);
    }

    /**
     * @dev Override transfer functions to make it soulbound
     */
    function transferFrom(address, address, uint256) public pure override {
        revert("Soulbound: Transfer not allowed");
    }

    function safeTransferFrom(address, address, uint256, bytes memory) public pure override {
        revert("Soulbound: Transfer not allowed");
    }
}