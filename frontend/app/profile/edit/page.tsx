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
        const emailVerified = localStorage.getItem('emailVerified');
        const userEmail = localStorage.getItem('userEmail');
        
        if (emailVerified || userEmail) {
            setIsEmailUser(true);
        }
        
        setIsLoading(false);
    }, []);

    useEffect(() => {
        if (!isLoading && !isConnected && !isEmailUser) {
            router.push('/');
        }
    }, [isConnected, isEmailUser, isLoading, router]);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center transition-colors">
                <div className="text-gray-500 dark:text-gray-400">Loading...</div>
            </div>
        );
    }

    if (!isConnected && !isEmailUser) {
        return null;
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
            <ProfileEdit />
        </div>
    );
}
