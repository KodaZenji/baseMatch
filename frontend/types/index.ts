export interface UserProfile {
    tokenId: bigint;
    name: string;
    age: number;
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
