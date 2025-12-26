export const PROFILE_NFT_ABI = [
    {
        type: "function",
        name: "createProfile",
        stateMutability: "nonpayable",
        inputs: [
            { name: "name", type: "string" },
            { name: "age", type: "uint8" },
            { name: "gender", type: "string" },
            { name: "interests", type: "string" },
            { name: "photoUrl", type: "string" }
        ],
        outputs: []
    },
    {
        type: "function",
        name: "registerWithEmail",
        stateMutability: "nonpayable",
        inputs: [
            { name: "name", type: "string" },
            { name: "age", type: "uint8" },
            { name: "gender", type: "string" },
            { name: "interests", type: "string" },
            { name: "email", type: "string" }
        ],
        outputs: []
    },
    {
        type: "function",
        name: "getProfile",
        stateMutability: "view",
        inputs: [
            { name: "user", type: "address" }
        ],
        outputs: [
            {
                name: "",
                type: "tuple",
                components: [
                    { name: "tokenId", type: "uint256" },
                    { name: "name", type: "string" },
                    { name: "age", type: "uint8" },
                    { name: "gender", type: "string" },
                    { name: "interests", type: "string" },
                    { name: "photoUrl", type: "string" },
                    { name: "email", type: "string" },
                    { name: "exists", type: "bool" }
                ]
            }
        ]
    },
    {
        type: "function",
        name: "updateProfile",
        stateMutability: "nonpayable",
        inputs: [
            { name: "name", type: "string" },
            { name: "age", type: "uint8" },
            { name: "gender", type: "string" },
            { name: "interests", type: "string" },
            { name: "photoUrl", type: "string" },
            { name: "email", type: "string" }
        ],
        outputs: []
    },
    {
        type: "function",
        name: "deleteProfile",
        stateMutability: "nonpayable",
        inputs: [],
        outputs: []
    },
    {
        type: "function",
        name: "profileExists",
        stateMutability: "view",
        inputs: [
            { name: "user", type: "address" }
        ],
        outputs: [
            { name: "", type: "bool" }
        ]
    },
    {
        type: "function",
        name: "getAddressByEmail",
        stateMutability: "view",
        inputs: [
            { name: "email", type: "string" }
        ],
        outputs: [
            { name: "", type: "address" }
        ]
    },
    {
        type: "function",
        name: "isEmailRegistered",
        stateMutability: "view",
        inputs: [
            { name: "email", type: "string" }
        ],
        outputs: [
            { name: "", type: "bool" }
        ]
    },
    {
        type: "event",
        name: "ProfileCreated",
        inputs: [
            { name: "user", type: "address", indexed: true },
            { name: "tokenId", type: "uint256", indexed: false },
            { name: "name", type: "string", indexed: false }
        ]
    },
    {
        type: "event",
        name: "EmailRegistered",
        inputs: [
            { name: "email", type: "string", indexed: false },
            { name: "user", type: "address", indexed: false }
        ]
    },
    {
        type: "event",
        name: "ProfileUpdated",
        inputs: [
            { name: "user", type: "address", indexed: true },
            { name: "name", type: "string", indexed: false },
            { name: "age", type: "uint8", indexed: false },
            { name: "gender", type: "string", indexed: false },
            { name: "interests", type: "string", indexed: false },
            { name: "photoUrl", type: "string", indexed: false },
            { name: "email", type: "string", indexed: false }
        ]
    },
    {
        type: "event",
        name: "ProfileDeleted",
        inputs: [
            { name: "user", type: "address", indexed: true },
            { name: "tokenId", type: "uint256", indexed: false }
        ]
    }
] as const;


export type ProfileNFTABI = typeof PROFILE_NFT_ABI;

export const MATCHING_ABI = [
    {
        type: "function",
        name: "expressInterest",
        stateMutability: "nonpayable",
        inputs: [
            { name: "targetUser", type: "address" }
        ],
        outputs: []
    },
    {
        type: "function",
        name: "getMatches",
        stateMutability: "view",
        inputs: [
            { name: "user", type: "address" }
        ],
        outputs: [
            { name: "", type: "address[]" }
        ]
    },
    {
        type: "function",
        name: "isMatched",
        stateMutability: "view",
        inputs: [
            { name: "user1", type: "address" },
            { name: "user2", type: "address" }
        ],
        outputs: [
            { name: "", type: "bool" }
        ]
    },
    {
        type: "function",
        name: "hasExpressedInterest",
        stateMutability: "view",
        inputs: [
            { name: "from", type: "address" },
            { name: "to", type: "address" }
        ],
        outputs: [
            { name: "", type: "bool" }
        ]
    },
    {
        type: "function",
        name: "removeMatch",
        stateMutability: "nonpayable",
        inputs: [
            { name: "matchedUser", type: "address" }
        ],
        outputs: []
    },
    {
        type: "event",
        name: "InterestExpressed",
        inputs: [
            { name: "from", type: "address", indexed: true },
            { name: "to", type: "address", indexed: true }
        ]
    },
    {
        type: "event",
        name: "MatchCreated",
        inputs: [
            { name: "user1", type: "address", indexed: true },
            { name: "user2", type: "address", indexed: true },
            { name: "matchId", type: "uint256", indexed: false }
        ]
    }
] as const;

export const STAKING_ABI = [
    {
        type: "function",
        name: "createStake",
        stateMutability: "nonpayable",
        inputs: [
            { name: "user2", type: "address" },
            { name: "amount", type: "uint256" },
            { name: "meetingTime", type: "uint256" }
        ],
        outputs: [
            { name: "", type: "uint256" }
        ]
    },
    {
        type: "function",
        name: "acceptStake",
        stateMutability: "nonpayable",
        inputs: [
            { name: "stakeId", type: "uint256" }
        ],
        outputs: []
    },
    {
        type: "function",
        name: "confirmMeeting",
        stateMutability: "nonpayable",
        inputs: [
            { name: "stakeId", type: "uint256" },
            { name: "iShowedUp", type: "bool" },
            { name: "theyShowedUp", type: "bool" }
        ],
        outputs: []
    },
    {
        type: "function",
        name: "processExpiredStake",
        stateMutability: "nonpayable",
        inputs: [
            { name: "stakeId", type: "uint256" }
        ],
        outputs: []
    },
    {
        type: "function",
        name: "cancelStake",
        stateMutability: "nonpayable",
        inputs: [
            { name: "stakeId", type: "uint256" }
        ],
        outputs: []
    },
    {
        type: "function",
        name: "getStake",
        stateMutability: "view",
        inputs: [
            { name: "stakeId", type: "uint256" }
        ],
        outputs: [
            {
                name: "",
                type: "tuple",
                components: [
                    { name: "user1", type: "address" },
                    { name: "user2", type: "address" },
                    { name: "user1Amount", type: "uint256" },
                    { name: "user2Amount", type: "uint256" },
                    { name: "totalStaked", type: "uint256" },
                    { name: "meetingTime", type: "uint256" },
                    { name: "user1Staked", type: "bool" },
                    { name: "user2Staked", type: "bool" },
                    { name: "processed", type: "bool" },
                    { name: "createdAt", type: "uint256" }
                ]
            }
        ]
    },
    {
        type: "function",
        name: "getConfirmation",
        stateMutability: "view",
        inputs: [
            { name: "stakeId", type: "uint256" },
            { name: "user", type: "address" }
        ],
        outputs: [
            {
                name: "",
                type: "tuple",
                components: [
                    { name: "hasConfirmed", type: "bool" },
                    { name: "iShowedUp", type: "bool" },
                    { name: "theyShowedUp", type: "bool" }
                ]
            }
        ]
    },
    {
        type: "event",
        name: "StakeCreated",
        inputs: [
            { name: "stakeId", type: "uint256", indexed: true },
            { name: "user1", type: "address", indexed: true },
            { name: "user2", type: "address", indexed: true },
            { name: "amount", type: "uint256", indexed: false },
            { name: "meetingTime", type: "uint256", indexed: false }
        ]
    },
    {
        type: "event",
        name: "StakeAccepted",
        inputs: [
            { name: "stakeId", type: "uint256", indexed: true },
            { name: "user2", type: "address", indexed: true },
            { name: "amount", type: "uint256", indexed: false }
        ]
    },
    {
        type: "event",
        name: "MeetingConfirmed",
        inputs: [
            { name: "stakeId", type: "uint256", indexed: true },
            { name: "confirmer", type: "address", indexed: true },
            { name: "iShowedUp", type: "bool", indexed: false },
            { name: "theyShowedUp", type: "bool", indexed: false }
        ]
    },
    {
        type: "event",
        name: "StakeProcessed",
        inputs: [
            { name: "stakeId", type: "uint256", indexed: true },
            { name: "user1Payout", type: "uint256", indexed: false },
            { name: "user2Payout", type: "uint256", indexed: false },
            { name: "platformFee", type: "uint256", indexed: false },
            { name: "outcome", type: "string", indexed: false }
        ]
    }
] as const;

export const REPUTATION_ABI = [
    {
        type: "function",
        name: "rateUser",
        stateMutability: "nonpayable",
        inputs: [
            { name: "ratedUser", type: "address" },
            { name: "rating", type: "uint8" }
        ],
        outputs: []
    },
    {
        type: "function",
        name: "recordDate",
        stateMutability: "nonpayable",
        inputs: [
            { name: "user", type: "address" }
        ],
        outputs: []
    },
    {
        type: "function",
        name: "recordNoShow",
        stateMutability: "nonpayable",
        inputs: [
            { name: "user", type: "address" }
        ],
        outputs: []
    },
    {
        type: "function",
        name: "getReputation",
        stateMutability: "view",
        inputs: [
            { name: "user", type: "address" }
        ],
        outputs: [
            { name: "totalDates", type: "uint256" },
            { name: "noShows", type: "uint256" },
            { name: "totalRating", type: "uint256" },
            { name: "ratingCount", type: "uint256" }
        ]
    },
    {
        type: "function",
        name: "getAverageRating",
        stateMutability: "view",
        inputs: [
            { name: "user", type: "address" }
        ],
        outputs: [
            { name: "", type: "uint256" }
        ]
    },
    {
        type: "event",
        name: "UserRated",
        inputs: [
            { name: "rater", type: "address", indexed: true },
            { name: "rated", type: "address", indexed: true },
            { name: "rating", type: "uint8", indexed: false }
        ]
    },
    {
        type: "event",
        name: "ReputationUpdated",
        inputs: [
            { name: "user", type: "address", indexed: true },
            { name: "newScore", type: "uint256", indexed: false }
        ]
    }
] as const;


export const ACHIEVEMENT_ABI = [
    {
        type: "constructor",
        inputs: [],
        stateMutability: "nonpayable"
    },
    {
        type: "function",
        name: "mintAchievement",
        stateMutability: "nonpayable",
        inputs: [
            { name: "user", type: "address" },
            { name: "achievementType", type: "string" }
        ],
        outputs: []
    },
    {
        type: "function",
        name: "getUserAchievements",
        stateMutability: "view",
        inputs: [
            { name: "user", type: "address" }
        ],
        outputs: [
            { name: "", type: "uint256[]" }
        ]
    },
    {
        type: "function",
        name: "tokenURI",
        stateMutability: "view",
        inputs: [
            { name: "tokenId", type: "uint256" }
        ],
        outputs: [
            { name: "", type: "string" }
        ]
    },
    {
        type: "function",
        name: "balanceOf",
        stateMutability: "view",
        inputs: [
            { name: "owner", type: "address" }
        ],
        outputs: [
            { name: "", type: "uint256" }
        ]
    },
    {
        type: "function",
        name: "ownerOf",
        stateMutability: "view",
        inputs: [
            { name: "tokenId", type: "uint256" }
        ],
        outputs: [
            { name: "", type: "address" }
        ]
    },
    {
        type: "function",
        name: "setBaseMetadataURI",
        stateMutability: "nonpayable",
        inputs: [
            { name: "newBaseURI", type: "string" }
        ],
        outputs: []
    },
    {
        type: "event",
        name: "AchievementMinted",
        inputs: [
            { name: "user", type: "address", indexed: true },
            { name: "tokenId", type: "uint256", indexed: false },
            { name: "achievementType", type: "string", indexed: false }
        ]
    },
    {
        type: "event",
        name: "Transfer",
        inputs: [
            { name: "from", type: "address", indexed: true },
            { name: "to", type: "address", indexed: true },
            { name: "tokenId", type: "uint256", indexed: true }
        ]
    }
] as const;

// Contract addresses - Network-aware configuration
const isMainnet = process.env.NEXT_PUBLIC_ENABLE_TESTNETS === 'false';

export const CONTRACTS = {
    PROFILE_NFT: isMainnet
        ? process.env.NEXT_PUBLIC_PROFILE_NFT_ADDRESS || ''
        : process.env.NEXT_PUBLIC_PROFILE_NFT_ADDRESS || '',
    MATCHING: isMainnet
        ? process.env.NEXT_PUBLIC_MATCHING_ADDRESS || ''
        : process.env.NEXT_PUBLIC_MATCHING_ADDRESS || '',
    STAKING: isMainnet
        ? process.env.NEXT_PUBLIC_STAKING_ADDRESS || ''
        : process.env.NEXT_PUBLIC_STAKING_ADDRESS || '',
    REPUTATION: isMainnet
        ? process.env.NEXT_PUBLIC_REPUTATION_ADDRESS || ''
        : process.env.NEXT_PUBLIC_REPUTATION_ADDRESS || '',
    ACHIEVEMENT: isMainnet
        ? process.env.NEXT_PUBLIC_ACHIEVEMENT_ADDRESS || ''
        : process.env.NEXT_PUBLIC_ACHIEVEMENT_ADDRESS || '',
    USDC: isMainnet
        ? '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' // Base mainnet USDC
        : '0x036CbD53842c5426634e7929541eC2318f3dCF7e', // Base Sepolia USDC
    PLATFORM_WALLET: process.env.NEXT_PUBLIC_PLATFORM_WALLET || '0x6D8985eC2B7a1101Bfa4Ae5E04EC6B424aAF87fB',
} as const;

// USDC Token ABI (ERC-20)
export const USDC_ABI = [
    {
        "constant": true,
        "inputs": [],
        "name": "name",
        "outputs": [
            {
                "name": "",
                "type": "string"
            }
        ],
        "payable": false,
        "stateMutability": "view",
        "type": "function"
    },
    {
        "constant": false,
        "inputs": [
            {
                "name": "_spender",
                "type": "address"
            },
            {
                "name": "_value",
                "type": "uint256"
            }
        ],
        "name": "approve",
        "outputs": [
            {
                "name": "",
                "type": "bool"
            }
        ],
        "payable": false,
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "constant": true,
        "inputs": [],
        "name": "totalSupply",
        "outputs": [
            {
                "name": "",
                "type": "uint256"
            }
        ],
        "payable": false,
        "stateMutability": "view",
        "type": "function"
    },
    {
        "constant": false,
        "inputs": [
            {
                "name": "_from",
                "type": "address"
            },
            {
                "name": "_to",
                "type": "address"
            },
            {
                "name": "_value",
                "type": "uint256"
            }
        ],
        "name": "transferFrom",
        "outputs": [
            {
                "name": "",
                "type": "bool"
            }
        ],
        "payable": false,
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "constant": true,
        "inputs": [],
        "name": "decimals",
        "outputs": [
            {
                "name": "",
                "type": "uint8"
            }
        ],
        "payable": false,
        "stateMutability": "view",
        "type": "function"
    },
    {
        "constant": true,
        "inputs": [
            {
                "name": "_owner",
                "type": "address"
            }
        ],
        "name": "balanceOf",
        "outputs": [
            {
                "name": "balance",
                "type": "uint256"
            }
        ],
        "payable": false,
        "stateMutability": "view",
        "type": "function"
    },
    {
        "constant": true,
        "inputs": [],
        "name": "symbol",
        "outputs": [
            {
                "name": "",
                "type": "string"
            }
        ],
        "payable": false,
        "stateMutability": "view",
        "type": "function"
    },
    {
        "constant": false,
        "inputs": [
            {
                "name": "_to",
                "type": "address"
            },
            {
                "name": "_value",
                "type": "uint256"
            }
        ],
        "name": "transfer",
        "outputs": [
            {
                "name": "",
                "type": "bool"
            }
        ],
        "payable": false,
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "constant": true,
        "inputs": [
            {
                "name": "_owner",
                "type": "address"
            },
            {
                "name": "_spender",
                "type": "address"
            }
        ],
        "name": "allowance",
        "outputs": [
            {
                "name": "",
                "type": "uint256"
            }
        ],
        "payable": false,
        "stateMutability": "view",
        "type": "function"
    },
    {
        "payable": true,
        "stateMutability": "payable",
        "type": "fallback"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": true,
                "name": "owner",
                "type": "address"
            },
            {
                "indexed": true,
                "name": "spender",
                "type": "address"
            },
            {
                "indexed": false,
                "name": "value",
                "type": "uint256"
            }
        ],
        "name": "Approval",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": true,
                "name": "from",
                "type": "address"
            },
            {
                "indexed": true,
                "name": "to",
                "type": "address"
            },
            {
                "indexed": false,
                "name": "value",
                "type": "uint256"
            }
        ],
        "name": "Transfer",
        "type": "event"
    }
] as const;

