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
            { name: "matchedUser", type: "address" },
            { name: "amount", type: "uint256" },
            { name: "meetingTime", type: "uint256" }
        ],
        outputs: []
    },
    {
        type: "function",
        name: "confirmMeeting",
        stateMutability: "nonpayable",
        inputs: [
            { name: "matchedUser", type: "address" }
        ],
        outputs: []
    },
    {
        type: "function",
        name: "claimStake",
        stateMutability: "nonpayable",
        inputs: [
            { name: "matchedUser", type: "address" }
        ],
        outputs: []
    },
    {
        type: "function",
        name: "getStake",
        stateMutability: "view",
        inputs: [
            { name: "user1", type: "address" },
            { name: "user2", type: "address" }
        ],
        outputs: [
            { name: "amount", type: "uint256" },
            { name: "meetingTime", type: "uint256" },
            { name: "user1Confirmed", type: "bool" },
            { name: "user2Confirmed", type: "bool" },
            { name: "claimed", type: "bool" }
        ]
    },
    {
        type: "event",
        name: "StakeCreated",
        inputs: [
            { name: "user1", type: "address", indexed: true },
            { name: "user2", type: "address", indexed: true },
            { name: "amount", type: "uint256", indexed: false },
            { name: "meetingTime", type: "uint256", indexed: false }
        ]
    },
    {
        type: "event",
        name: "MeetingConfirmed",
        inputs: [
            { name: "user", type: "address", indexed: true },
            { name: "matchedUser", type: "address", indexed: true }
        ]
    },
    {
        type: "event",
        name: "StakeClaimed",
        inputs: [
            { name: "user1", type: "address", indexed: true },
            { name: "user2", type: "address", indexed: true },
            { name: "user1Amount", type: "uint256", indexed: false },
            { name: "user2Amount", type: "uint256", indexed: false }
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
        name: "getAchievements",
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
        type: "event",
        name: "AchievementMinted",
        inputs: [
            { name: "user", type: "address", indexed: true },
            { name: "tokenId", type: "uint256", indexed: false },
            { name: "achievementType", type: "string", indexed: false }
        ]
    }
] as const;

// Contract addresses - Base Sepolia Testnet (Chain ID: 84532)
export const CONTRACTS = {
    PROFILE_NFT: process.env.NEXT_PUBLIC_PROFILE_NFT_ADDRESS || '0xdBAe105e85b6d98e8f1Ef9048450E7C517f83B5F',
    MATCHING: process.env.NEXT_PUBLIC_MATCHING_ADDRESS || '0x543f51EEc43059c99DA79DbBE374d1E80C7c432f',
    STAKING: process.env.NEXT_PUBLIC_STAKING_ADDRESS || '0x15c026EC2c6f274df67DDcbA2cB41f385EEa4880',
    REPUTATION: process.env.NEXT_PUBLIC_REPUTATION_ADDRESS || '0x885189997F66FEeA15923A27388D49612B8C6a91',
    ACHIEVEMENT: process.env.NEXT_PUBLIC_ACHIEVEMENT_ADDRESS || '0x3542dEB52188887Addd04533305cCfe7DC848604',
    USDC: '0x036CbD53842c5426634e7929541eC2318f3dCF7e', // Base Sepolia USDC (mock/test token)
    PLATFORM_WALLET: process.env.NEXT_PUBLIC_PLATFORM_WALLET || '0x72389703895D9DF273830dBaE7d19AC399161797',
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

