export interface UserProfile {
    tokenId: bigint;
    name: string;
    birthYear: number;
    interests: string;
    photoUrl: string;
    email: string;
    exists: boolean;
    address?: string;
}

export interface Match {
    address: string;
    profile?: UserProfile;
    matchedAt?: number;
}

export interface Stake {
    amount: bigint;
    meetingTime: bigint;
    user1Confirmed: boolean;
    user2Confirmed: boolean;
    claimed: boolean;
}

export interface Reputation {
    totalDates: bigint;
    noShows: bigint;
    totalRating: bigint;
    ratingCount: bigint;
    averageRating?: number;
}

export interface Achievement {
    tokenId: bigint;
    achievementType: string;
    metadata?: string;
}

export interface InterestExpression {
    from: string;
    to: string;
    timestamp: number;
}

// API Response Types

export interface ConnectWalletResponse {
    success: boolean;
    message: string;
    userId: string;
    fullyVerified: boolean;
}

export interface ProfileCompleteResponse {
    success: boolean;
    message: string;
    contractAddress: string;
    mintingPayload: {
        name: string;
        birthYear: number;
        gender: string;
        interests: string;
        photoUrl: string;
        email: string;
        photoHash: string;
    };
    userInfo: {
        userId: string;
        email: string;
        walletAddress: string;
    };
}

export interface ProfileRegisterResponse {
    success: boolean;
    message: string;
    needsEmailVerification: boolean;
    contractAddress: string;
    createProfilePayload: {
        name: string;
        birthYear: number;
        gender: string;
        interests: string;
        photoUrl: string;
        email: string;
        photoHash: string;
    };
    userInfo: {
        userId: string;
        email: string;
        walletAddress: string;
        emailVerified: boolean;
    };
}

export interface UpdateInterestsResponse {
    success: boolean;
    message: string;
    onChainPayload: {
        to: string;
        data: string;
    };
    updatedInterests: string;
    userInfo: {
        userId: string;
        walletAddress: string;
    };
}

export interface ErrorResponse {
    error: string;
    [key: string]: any;
}
