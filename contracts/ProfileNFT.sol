// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

interface IMatching {
    function notifyProfileDeleted(address deletedUser) external;
}

/**
 * @title ProfileNFT
 * @dev Soulbound NFT for user profiles - non-transferable (Upgradeable)
 */
contract ProfileNFT is Initializable, ERC721Upgradeable, OwnableUpgradeable, UUPSUpgradeable {
    struct Profile {
        uint256 tokenId;
        string name;
        uint8 age; // Old field kept for storage compatibility
        string gender;
        string interests;
        string photoUrl;
        string email;
        bool exists;
        uint256 birthYear; // New field for dynamic age calculation
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

    event ProfileCreated(address indexed user, uint256 tokenId, string name);
    event ProfileUpdated(address indexed user, string name, uint8 age, string gender, string interests, string photoUrl, string email, uint256 birthYear);
    event ProfileDeleted(address indexed user, uint256 tokenId);
    event EmailRegistered(string email, address user);

    function initialize() public initializer {
        __ERC721_init("BaseMatch Profile", "BMPRO");
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
        uint256 birthYear,
        string memory gender,
        string memory interests,
        string memory photoUrl
    ) external {
        require(!profiles[msg.sender].exists, "Profile already exists");
        require(birthYear > 0, "Birth year must be set");
        require(_calculateAgeFromBirthYear(birthYear) >= 18, "Must be 18 or older");
        require(_calculateAgeFromBirthYear(birthYear) <= 120, "Age must be realistic");
        require(bytes(name).length >= MIN_NAME_LENGTH && bytes(name).length <= MAX_NAME_LENGTH, "Name must be 2-100 characters");
        require(bytes(interests).length > 0 && bytes(interests).length <= MAX_INTERESTS_LENGTH, "Interests must be 1-500 characters");
        require(bytes(photoUrl).length <= MAX_PHOTO_URL_LENGTH, "Photo URL too long");
        require(bytes(gender).length > 0 && bytes(gender).length <= 50, "Gender must be valid");

        _tokenIdCounter++;
        uint256 newTokenId = _tokenIdCounter;

        profiles[msg.sender] = Profile({
            tokenId: newTokenId,
            name: name,
            age: uint8(_calculateAgeFromBirthYear(birthYear)), // Store calculated age for compatibility
            gender: gender,
            interests: interests,
            photoUrl: photoUrl,
            email: "",
            exists: true,
            birthYear: birthYear
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
        uint256 birthYear,
        string memory gender,
        string memory interests,
        string memory email
    ) external {
        require(!profiles[msg.sender].exists, "Profile already exists");
        require(birthYear > 0, "Birth year must be set");
        require(_calculateAgeFromBirthYear(birthYear) >= 18, "Must be 18 or older");
        require(_calculateAgeFromBirthYear(birthYear) <= 120, "Age must be realistic");
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
            age: uint8(_calculateAgeFromBirthYear(birthYear)), // Store calculated age for compatibility
            gender: gender,
            interests: interests,
            photoUrl: "",
            email: normalizedEmail,
            exists: true,
            birthYear: birthYear
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
        uint256 birthYear,
        string memory gender,
        string memory interests,
        string memory photoUrl,
        string memory email
    ) external {
        require(profiles[msg.sender].exists, "Profile does not exist");
        require(birthYear > 0, "Birth year must be set");
        require(_calculateAgeFromBirthYear(birthYear) >= 18, "Must be 18 or older");
        require(_calculateAgeFromBirthYear(birthYear) <= 120, "Age must be realistic");
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
        profile.age = uint8(_calculateAgeFromBirthYear(birthYear)); // Update calculated age for compatibility
        profile.gender = gender;
        profile.interests = interests;
        profile.photoUrl = photoUrl;
        profile.birthYear = birthYear;

        emit ProfileUpdated(msg.sender, name, uint8(_calculateAgeFromBirthYear(birthYear)), gender, interests, photoUrl, profile.email, birthYear);
    }

    /**
     * @dev Helper to compare two email strings
     */
    function _emailsEqual(string memory a, string memory b) private pure returns (bool) {
        return keccak256(abi.encodePacked(a)) == keccak256(abi.encodePacked(b));
    }

    /**
     * @dev Calculate age from birth year
     * Using a fixed current year since block.timestamp doesn't work well for years
     * We'll use a more precise calculation based on timestamp
     */
    function _calculateAge(uint256 birthYear) private view returns (uint256) {
        require(birthYear > 0, "Birth year must be set");
        require(birthYear <= block.timestamp, "Birth year cannot be in the future");
        
        // Get the current year from timestamp
        uint256 currentYear = _getYear(block.timestamp);
        
        uint256 age = currentYear - birthYear;
        
        // Check if birthday has passed this year, if not subtract 1
        // For simplicity, we'll just return the year difference
        // A more precise calculation would require month/day tracking
        return age;
    }
    
    /**
     * @dev Get year from timestamp
     * This is a simplified calculation - for more precision, we'd need to account for leap years
     */
    function _getYear(uint256 timestamp) private pure returns (uint256) {
        // Unix timestamp for Jan 1, 1970
        uint256 secondsPerDay = 24 * 60 * 60;
        uint256 daysPerYear = 365;
        
        // Days since Unix epoch
        uint256 daysSinceEpoch = timestamp / secondsPerDay;
        
        // Approximate year (1970 + days/365)
        uint256 approximateYear = 1970 + (daysSinceEpoch / daysPerYear);
        
        return approximateYear;
    }
    
    /**
     * @dev Calculate age from birth year for storage compatibility
     */
    function _calculateAgeFromBirthYear(uint256 birthYear) private view returns (uint256) {
        require(birthYear > 0, "Birth year must be set");
        require(birthYear <= _getYear(block.timestamp), "Birth year cannot be in the future");
        
        uint256 currentYear = _getYear(block.timestamp);
        uint256 age = currentYear - birthYear;
        
        // Make sure age doesn't exceed uint8 max value
        require(age <= 255, "Age too high for storage");
        
        return age;
    }
    
    /**
     * @dev Get current age for a profile
     */
    function getCurrentAge(address user) external view returns (uint256) {
        require(profiles[user].exists, "Profile does not exist");
        return _calculateAge(profiles[user].birthYear);
    }
    
    /**
     * @dev Get birth year for a profile
     */
    function getBirthYear(address user) external view returns (uint256) {
        require(profiles[user].exists, "Profile does not exist");
        return profiles[user].birthYear;
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
        
        // Clear email registration if exists (must normalize like we did when storing)
        if (bytes(userProfile.email).length > 0) {
            string memory normalizedEmail = _normalizeEmail(userProfile.email);
            emailExists[normalizedEmail] = false;
            delete emailToAddress[normalizedEmail];
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