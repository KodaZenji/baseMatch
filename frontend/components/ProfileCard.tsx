// Inside frontend/components/ProfileCard.tsx

// ... (component definition and imports)

export default function ProfileCard({
    profile,
    // ... (props)
}) {
    // ... (state, effects, and helper functions remain the same)

    return (
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300">
            {/* ... (Notification and Profile Image sections remain the same) */}

            {/* Profile Info */}
            <div className="p-6">
                <div className="flex justify-between items-start mb-2">
                    <h3 className="text-xl font-bold text-gray-900">{profile.name}</h3>
                    {onGift && (
                        <button
                            onClick={onGift}
                            className="text-pink-600 hover:text-pink-800 font-medium text-sm"
                        >
                            🎁 Gift
                        </button>
                    )}
                </div>

                <div className="flex items-center text-gray-600 mb-2 space-x-2">
                    <span className="mr-2">{profile.age} years</span>
                    
                    {/* 1. EMAIL VERIFIED BADGE */}
                    {profile.email_verified && (
                        <span 
                            className="bg-green-100 text-green-800 text-xs font-medium px-2 py-1 rounded-full flex items-center"
                            title="Email Verified"
                        >
                            📧 Email Verified
                        </span>
                    )}
                    
                    {/* 2. WALLET VERIFIED BADGE */}
                    {profile.wallet_verified && (
                        <span 
                            className="bg-purple-100 text-purple-800 text-xs font-medium px-2 py-1 rounded-full flex items-center"
                            title="Wallet Linked & Verified"
                        >
                            🔗 Wallet Linked
                        </span>
                    )}
                    
                    {profile.gender && (
                        <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded-full">
                            {profile.gender}
                        </span>
                    )}
                </div>

                <p className="text-gray-600 mb-4">{profile.interests}</p>
                {/* ... (rest of the buttons) */}
            </div>
        </div>
    );
}
