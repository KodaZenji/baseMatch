'use client';

import ProfileEdit from '@/components/ProfileEdit';
import { useAccount } from 'wagmi';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function ProfileEditPage() {
    const { address, isConnected } = useAccount();
    const router = useRouter();
    const [isEmailUser, setIsEmailUser] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Check if user has email verified (from localStorage or session)
        const emailVerified = localStorage.getItem('emailVerified');
        const userEmail = localStorage.getItem('userEmail');
        
        if (emailVerified || userEmail) {
            setIsEmailUser(true);
        }
        
        setIsLoading(false);
    }, []);

    useEffect(() => {
        // Only redirect if loading is done and user is neither wallet connected nor email verified
        if (!isLoading && !isConnected && !isEmailUser) {
            router.push('/');
        }
    }, [isConnected, isEmailUser, isLoading, router]);

    // Show loading state while checking authentication
    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-gray-500">Loading...</div>
            </div>
        );
    }

    // If not authenticated at all, don't render anything (will redirect)
    if (!isConnected && !isEmailUser) {
        return null;
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <ProfileEdit />
        </div>
    );
}
