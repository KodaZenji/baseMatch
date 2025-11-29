'use client';

import ProfileEdit from '@/components/ProfileEdit';
import { useAccount } from 'wagmi';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function ProfileEditPage() {
    const { address, isConnected } = useAccount();
    const router = useRouter();

    useEffect(() => {
        // Redirect to home if not connected
        if (!isConnected) {
            router.push('/');
        }
    }, [isConnected, router]);

    if (!isConnected) {
        return null;
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <ProfileEdit />
        </div>
    );
}