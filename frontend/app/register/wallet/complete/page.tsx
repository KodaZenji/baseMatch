'use client';

import { useState, useEffect, Suspense } from 'react';
import { useAccount } from 'wagmi';
import { useRouter, useSearchParams } from 'next/navigation';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Heart, User, CheckCircle2, Loader2 } from 'lucide-react';

function CompleteProfileContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { address, isConnected } = useAccount();
    const source = searchParams.get('source');

    const [formData, setFormData] = useState({
        name: '',
        birthYear: '',
        gender: '',
        interests: '',
        email: '',
    });

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [avatarUrl, setAvatarUrl] = useState('');
    const [profileSource, setProfileSource] = useState<string | null>(null);

    useEffect(() => {
        let profileData = null;
        
        if (source === 'farcaster') {
            const stored = localStorage.getItem('farcasterProfile');
            if (stored) {
                profileData = JSON.parse(stored);
                setProfileSource('farcaster');
            }
        } else if (source === 'baseapp') {
            const stored = localStorage.getItem('baseAppProfile');
            if (stored) {
                profileData = JSON.parse(stored);
                setProfileSource('baseapp');
            }
        }

        if (profileData) {
            setFormData(prev => ({
                ...prev,
                name: profileData.displayName || '',
                interests: profileData.bio || '',
            }));
            setAvatarUrl(profileData.pfp || '');
            // We keep it in storage until they actually submit to be safe
        }
    }, [source]);

    useEffect(() => {
        if (address && !avatarUrl) {
            setAvatarUrl(`https://api.dicebear.com/7.x/pixel-art/svg?seed=${address.substring(2, 10)}`);
        }
    }, [address, avatarUrl]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            const response = await fetch('/api/profile/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    address,
                    ...formData,
                    photoUrl: avatarUrl,
                    profileSource: profileSource || 'manual',
                }),
            });
            if (!response.ok) throw new Error('Registration failed');
            
            // Clean up
            localStorage.removeItem('farcasterProfile');
            localStorage.removeItem('baseAppProfile');
            router.push('/mint');
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    if (!isConnected) return (
        <div className="min-h-screen bg-indigo-600 flex items-center justify-center">
            <div className="bg-white p-8 rounded-3xl text-center shadow-2xl">
                <Heart className="w-12 h-12 text-pink-500 mx-auto mb-4" fill="currentColor" />
                <h2 className="text-xl font-bold mb-4">Connect Wallet to Continue</h2>
                <ConnectButton />
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-black py-12 px-4">
            <div className="max-w-xl mx-auto">
                <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
                    
                    {/* Header Banner */}
                    <div className="h-32 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 relative">
                        <div className="absolute -bottom-12 left-1/2 -translate-x-1/2">
                            <div className="relative">
                                <img 
                                    src={avatarUrl} 
                                    alt="Profile" 
                                    className="w-24 h-24 rounded-full border-4 border-white dark:border-gray-900 shadow-xl object-cover"
                                />
                                {profileSource && (
                                    <div className="absolute bottom-0 right-0 bg-green-500 border-2 border-white dark:border-gray-900 rounded-full p-1">
                                        <CheckCircle2 className="w-4 h-4 text-white" />
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="pt-16 pb-10 px-8">
                        <div className="text-center mb-8">
                            <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Complete Your Profile</h1>
                            {profileSource && (
                                <p className="text-sm text-purple-600 dark:text-purple-400 font-medium mt-1">
                                    ✓ Verified {profileSource === 'farcaster' ? 'Farcaster' : 'Base'} profile imported
                                </p>
                            )}
                        </div>

                        {error && <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-xl text-sm border border-red-100">{error}</div>}

                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider ml-1">Display Name</label>
                                    <input 
                                        value={formData.name} 
                                        onChange={e => setFormData({...formData, name: e.target.value})} 
                                        className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-2xl p-4 text-gray-800 dark:text-white focus:ring-2 focus:ring-purple-500 transition-all" 
                                        placeholder="Full Name" required 
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider ml-1">Birth Year</label>
                                    <input 
                                        type="number" value={formData.birthYear} 
                                        onChange={e => setFormData({...formData, birthYear: e.target.value})} 
                                        className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-2xl p-4 text-gray-800 dark:text-white focus:ring-2 focus:ring-purple-500" 
                                        placeholder="1995" required 
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider ml-1">Gender</label>
                                <select 
                                    value={formData.gender} 
                                    onChange={e => setFormData({...formData, gender: e.target.value})} 
                                    className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-2xl p-4 text-gray-800 dark:text-white focus:ring-2 focus:ring-purple-500 appearance-none" 
                                    required
                                >
                                    <option value="">Select Gender</option>
                                    <option value="Female">Female</option>
                                    <option value="Male">Male</option>
                                    <option value="Non-binary">Non-binary</option>
                                </select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider ml-1">About / Interests</label>
                                <textarea 
                                    value={formData.interests} 
                                    onChange={e => setFormData({...formData, interests: e.target.value})} 
                                    rows={3}
                                    className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-2xl p-4 text-gray-800 dark:text-white focus:ring-2 focus:ring-purple-500" 
                                    placeholder="Tell us what you love..." required 
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider ml-1">Email Address</label>
                                <input 
                                    type="email" value={formData.email} 
                                    onChange={e => setFormData({...formData, email: e.target.value})} 
                                    className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-2xl p-4 text-gray-800 dark:text-white focus:ring-2 focus:ring-purple-500" 
                                    placeholder="hello@example.com" required 
                                />
                            </div>

                            <button 
                                type="submit" 
                                disabled={isLoading} 
                                className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-4 rounded-2xl font-bold text-lg shadow-xl shadow-purple-500/20 hover:scale-[1.02] transition-transform active:scale-95 disabled:opacity-50"
                            >
                                {isLoading ? <Loader2 className="animate-spin mx-auto" /> : 'Confirm & Create Profile'}
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function CompleteWalletProfilePage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-purple-500 w-10 h-10" /></div>}>
            <CompleteProfileContent />
        </Suspense>
    );
}
