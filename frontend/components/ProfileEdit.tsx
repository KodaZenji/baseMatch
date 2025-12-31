'use client';

import { useState, useEffect, useRef } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { PROFILE_NFT_ABI, CONTRACTS } from '@/lib/contracts';
import { generateAvatar } from '@/lib/avatarUtils';
import { handleProfileTextUpdate } from '@/lib/profileMinting';
import { useProfile } from '@/hooks/useProfile';
import WalletConnectionSection from './WalletConnectionSection';
import { User, Edit, Mail, Lock, AlertTriangle, Trash2, Lightbulb, Info, ChevronLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function ProfileEdit() {
    const router = useRouter();
    const { address, isConnected } = useAccount();
    const { profile, isLoading: profileLoading, refreshProfile } = useProfile(address);

    const [userEmail, setUserEmail] = useState('');
    const [hasWallet, setHasWallet] = useState(false);

    const [avatarUrl, setAvatarUrl] = useState('');
    const [formData, setFormData] = useState({
        name: '',
        birthYear: '',
        gender: '',
        interests: '',
        photoUrl: '',
        email: '',
    });
    const [isEditingPhoto, setIsEditingPhoto] = useState(false);
    const [newPhotoUrl, setNewPhotoUrl] = useState('');
    const [notification, setNotification] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
    const [isSendingVerification, setIsSendingVerification] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [showDeleteFinalConfirm, setShowDeleteFinalConfirm] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const hasShownSuccessRef = useRef(false);

    const { writeContract, data: hash, isPending, isError, error } = useWriteContract();
    const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

    // Check user status on mount
    useEffect(() => {
        const checkUserStatus = async () => {
            if (isConnected && address) {
                setHasWallet(true);
                return;
            }

            const storedEmail = localStorage.getItem('userEmail');

            if (storedEmail) {
                setUserEmail(storedEmail);
                setHasWallet(false);

                try {
                    const response = await fetch('/api/profile/get-by-email', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ email: storedEmail }),
                    });

                    if (response.ok) {
                        const data = await response.json();
                        if (data.profile) {
                            setFormData({
                                name: data.profile.name || '',
                                birthYear: data.profile.birthYear ? data.profile.birthYear.toString() : '',
                                gender: data.profile.gender || '',
                                interests: data.profile.interests || '',
                                photoUrl: data.profile.photoUrl || '',
                                email: data.profile.email || '',
                            });
                            setNewPhotoUrl(data.profile.photoUrl || '');

                            if (data.profile.walletAddress) {
                                setHasWallet(true);
                            }
                        }
                    }
                } catch (error) {
                    console.error('Error fetching user profile:', error);
                }
            }
        };

        checkUserStatus();
    }, [isConnected, address]);

    // Generate avatar
    useEffect(() => {
        if (address) {
            setAvatarUrl(generateAvatar(address));
            setHasWallet(true);
        }
    }, [address]);

    // Populate form with merged profile data (blockchain + database)
    useEffect(() => {
        const fetchMergedProfile = async () => {
            if (!address) return;

            try {
                const response = await fetch(`/api/profile/edit?address=${address}`);
                if (response.ok) {
                    const mergedProfile = await response.json();

                    if (!formData.name && !formData.birthYear && !formData.gender && !formData.interests) {
                        setFormData({
                            name: mergedProfile.name || '',
                            birthYear: mergedProfile.birthYear ? mergedProfile.birthYear.toString() : '',
                            gender: mergedProfile.gender || '',
                            interests: mergedProfile.interests || '',
                            photoUrl: mergedProfile.photoUrl || '',
                            email: mergedProfile.email || '',
                        });
                        setNewPhotoUrl(mergedProfile.photoUrl || '');
                        if (mergedProfile.email) {
                            setUserEmail(mergedProfile.email);
                        }
                    }
                }
            } catch (error) {
                console.error('Error fetching merged profile:', error);
            }
        };

        if (address && isConnected) {
            fetchMergedProfile();
        }
    }, [address, isConnected]);

    const showNotification = (message: string, type: 'success' | 'error') => {
        setNotification({ message, type });
        setTimeout(() => {
            setNotification(null);
        }, 3000);
    };

    const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 3 * 1024 * 1024) {
                showNotification('Image must be smaller than 3MB', 'error');
                return;
            }

            if (!file.type.startsWith('image/')) {
                showNotification('Please upload a valid image file', 'error');
                return;
            }

            try {
                const formData = new FormData();
                formData.append('file', file);

                const response = await fetch('/api/upload-image', {
                    method: 'POST',
                    body: formData,
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || 'Failed to upload image');
                }

                const data = await response.json();
                if (data.url) {
                    setNewPhotoUrl(data.url);
                    showNotification('Image uploaded successfully', 'success');
                } else {
                    throw new Error('No URL returned from upload');
                }
            } catch (error) {
                console.error('Error uploading image:', error);
                showNotification(error instanceof Error ? error.message : 'Failed to upload image. Please try again.', 'error');
            }
        }
    };

    const triggerFileInput = () => {
        fileInputRef.current?.click();
    };

    const handleSendVerification = async () => {
        if (!formData.email || !formData.email.includes('@')) {
            showNotification('Please enter a valid email address', 'error');
            return;
        }

        setIsSendingVerification(true);

        try {
            const response = await fetch('/api/register-email', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email: formData.email,
                    walletAddress: address,
                }),
            });

            const result = await response.json();

            if (response.ok && result.success) {
                showNotification('Verification code sent! Check your inbox.', 'success');
                localStorage.setItem('emailForRegistration', formData.email);
                setTimeout(() => {
                    window.location.href = '/verify-email';
                }, 2000);
            } else {
                showNotification(result.error || 'Failed to send verification code', 'error');
            }
        } catch (error) {
            console.error('Error sending verification code:', error);
            showNotification('Failed to send verification code. Please check your network connection.', 'error');
        } finally {
            setIsSendingVerification(false);
        }
    };

    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault();

        hasShownSuccessRef.current = false;
        hasSyncedRef.current = false;

        if (!formData.name || !formData.birthYear || !formData.gender || !formData.interests) {
            showNotification('Please fill in all required fields', 'error');
            return;
        }

        const birthYear = parseInt(formData.birthYear);

        const currentYear = new Date().getFullYear();
        const calculatedAge = currentYear - birthYear;
        if (isNaN(birthYear) || calculatedAge < 18 || calculatedAge > 120) {
            showNotification('Please enter a valid birth year corresponding to an age between 18 and 120', 'error');
            return;
        }

        if (!hasWallet || !isConnected) {
            try {
                const response = await fetch('/api/profile/update-by-email', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        email: userEmail,
                        name: formData.name,
                        birthYear,
                        gender: formData.gender,
                        interests: formData.interests,
                        photoUrl: newPhotoUrl || formData.photoUrl,
                    }),
                });

                const result = await response.json();

                if (response.ok && result.success) {
                    showNotification('Profile updated successfully!', 'success');
                } else {
                    showNotification(result.error || 'Failed to update profile', 'error');
                }
            } catch (error) {
                console.error('Error updating profile:', error);
                showNotification('Failed to update profile', 'error');
            }
            return;
        }

        if (!profile?.exists) {
            showNotification('Profile does not exist. Please create a profile first.', 'error');
            return;
        }

        try {
            console.log('Step 1: Updating database...');
            const dbResponse = await fetch('/api/profile/edit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    wallet_address: address,
                    email: formData.email,
                    name: formData.name,
                    birthYear,
                    gender: formData.gender,
                    interests: formData.interests,
                }),
            });

            if (!dbResponse.ok) {
                const errorData = await dbResponse.json();
                throw new Error(errorData.error || 'Failed to update database');
            }

            console.log('✅ Database updated successfully');

            console.log('Step 2: Updating blockchain...');
            const imageChanged = newPhotoUrl && newPhotoUrl !== formData.photoUrl;
            let newImageFile: File | undefined;

            if (imageChanged && fileInputRef.current?.files?.[0]) {
                newImageFile = fileInputRef.current.files[0];
            }

            const updateData = await handleProfileTextUpdate(
                profile.tokenId.toString(),
                {
                    name: formData.name,
                    birthYear,
                    gender: formData.gender,
                    interests: formData.interests,
                    photoUrl: newPhotoUrl || formData.photoUrl || '',
                    email: formData.email,
                },
                newImageFile
            );

            console.log('Executing blockchain transaction...');
            writeContract({
                address: CONTRACTS.PROFILE_NFT as `0x${string}`,
                abi: PROFILE_NFT_ABI,
                functionName: 'updateProfile',
                args: [
                    updateData.contractArgs[0],
                    BigInt(updateData.contractArgs[1]), // ← FIX (age → bigint)
                    updateData.contractArgs[2],
                    updateData.contractArgs[3],
                    updateData.contractArgs[4],
                    updateData.contractArgs[5],
                ] as const,
            });

        } catch (error) {
            console.error('Error updating profile:', error);
            showNotification(error instanceof Error ? error.message : 'Failed to update profile', 'error');
        }
    };

    const handleDeleteProfile = async () => {
        if (!profile?.exists) {
            showNotification('Profile does not exist', 'error');
            return;
        }

        setIsDeleting(true);

        try {
            writeContract({
                address: CONTRACTS.PROFILE_NFT as `0x${string}`,
                abi: PROFILE_NFT_ABI,
                functionName: 'deleteProfile',
                args: [],
            });
        } catch (error) {
            console.error('Error deleting profile:', error);
            showNotification('Failed to delete profile. Please try again.', 'error');
            setIsDeleting(false);
            setShowDeleteConfirm(false);
            setShowDeleteFinalConfirm(false);
        }
    };

    const hasSyncedRef = useRef(false);

    const syncProfileToDatabase = async (profileData: {
        name: string;
        birthYear: number;
        gender: string;
        interests: string;
        photoUrl: string;
        email: string;
    }) => {
        if (hasSyncedRef.current) {
            console.log('⚠️ Sync already called, skipping duplicate');
            return;
        }

        hasSyncedRef.current = true;

        try {
            console.log('Step 3: Syncing blockchain confirmation back to database...');
            console.log('📸 Photo URL being synced:', profileData.photoUrl); // ✅ Debug log

            const response = await fetch('/api/profile/sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    walletAddress: address,
                    name: profileData.name,
                    birthYear: profileData.birthYear,
                    gender: profileData.gender,
                    interests: profileData.interests,
                    photoUrl: profileData.photoUrl, // ✅ This ensures photo URL is synced
                    email: profileData.email,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                console.error('Failed to sync profile to database:', errorData);
            } else {
                const syncResult = await response.json();
                console.log('✅ Profile synced to database successfully:', syncResult);
                console.log('✅ Photo URL in DB:', syncResult.profile?.photoUrl); // ✅ Verify photo was saved
            }
        } catch (error) {
            console.error('Error syncing profile to database:', error);
        }
    };

    // ✅ ADD THIS MISSING FUNCTION
    const handleWalletLinked = () => {
        setHasWallet(true);
        showNotification('Wallet linked! You can now mint your profile NFT.', 'success');
        refreshProfile();
    };

    // ✅ UPDATED: Added newPhotoUrl to dependencies and proper photoUrl handling
    useEffect(() => {
        const handleTransactionSuccess = async () => {
            if (isSuccess && !hasShownSuccessRef.current) {
                hasShownSuccessRef.current = true;

                if (isDeleting) {
                    showNotification('✅ Profile deleted successfully!', 'success');
                    localStorage.clear();
                    setTimeout(() => {
                        window.location.href = '/';
                    }, 2000);
                } else {
                    // ✅ Make sure we're passing the correct photoUrl
                    const photoToSync = newPhotoUrl || formData.photoUrl;
                    console.log('🎯 Syncing photo URL:', photoToSync); // ✅ Debug log

                    await syncProfileToDatabase({
                        name: formData.name,
                        birthYear: parseInt(formData.birthYear),
                        gender: formData.gender,
                        interests: formData.interests,
                        photoUrl: photoToSync, // ✅ Use the most recent photo
                        email: formData.email,
                    });

                    showNotification('✅ Profile updated and verified on blockchain!', 'success');
                    refreshProfile();
                    setTimeout(() => {
                        window.location.reload();
                    }, 2000);
                }
            }
        };

        handleTransactionSuccess();
    }, [isSuccess, isDeleting, formData, newPhotoUrl]); // ✅ Added newPhotoUrl to dependencies

    const isFullyVerified = profile?.email && formData.email === profile.email && profile?.exists;

    if (profileLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-blue-500 to-indigo-700 flex items-center justify-center">
                <div className="text-white text-2xl">Loading profile...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-blue-500 to-indigo-700 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-2xl w-full relative">
                {/* Back Button - Goes to Dashboard tab */}
                <button
                    onClick={() => {
                        localStorage.setItem('activeTab', 'profile');
                        router.push('/');
                    }}
                    className="absolute top-4 left-4 p-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-full hover:shadow-lg transition-all duration-300 hover:scale-110 z-10"
                    aria-label="Back to Dashboard"
                >
                    <ChevronLeft className="w-6 h-6" />
                </button>

                <h2 className="text-3xl font-bold text-center mb-6 text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
                    Edit Your Profile
                </h2>

                {notification && (
                    <div className={`mb-4 p-3 rounded-lg ${notification.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {notification.message}
                    </div>
                )}

                <form onSubmit={handleUpdateProfile} className="space-y-6">
                    {/* Profile Picture */}
                    <div className="flex flex-col items-center">
                        <div className="relative mb-4">
                            {newPhotoUrl ? (
                                <img
                                    src={newPhotoUrl}
                                    alt="Profile"
                                    className="w-32 h-32 rounded-full border-4 border-white shadow-lg object-cover"
                                />
                            ) : avatarUrl ? (
                                <img
                                    src={avatarUrl}
                                    alt="Auto-generated avatar"
                                    className="w-32 h-32 rounded-full border-4 border-white shadow-lg"
                                />
                            ) : (
                                <div className="bg-gray-200 border-4 border-white rounded-full w-32 h-32 flex items-center justify-center shadow-lg">
                                    <User className="text-gray-500" size={64} />
                                </div>
                            )}
                            <button
                                type="button"
                                onClick={triggerFileInput}
                                className="absolute bottom-2 right-2 bg-blue-500 text-white rounded-full p-2 shadow-lg hover:bg-blue-600 transition-colors flex items-center justify-center"
                            >
                                <Edit size={20} />
                            </button>
                        </div>
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handlePhotoChange}
                            accept="image/*"
                            className="hidden"
                        />
                        <p className="text-gray-600 text-sm">Click the pencil to upload your photo (max 3MB)</p>
                    </div>

                    {/* Wallet Connection */}
                    {!hasWallet && (formData.email || userEmail) && (
                        <div>
                            <WalletConnectionSection
                                userEmail={formData.email || userEmail}
                                onWalletLinked={handleWalletLinked}
                            />
                            <p className="text-xs text-blue-600 mt-2 flex items-center gap-1">
                                <Lightbulb size={14} /> Connect your wallet to mint your profile NFT
                            </p>
                        </div>
                    )}

                    {/* Email Section */}
                    <div className="bg-blue-50 rounded-xl p-4 border-2 border-blue-200">
                        <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                            <Mail size={16} /> Email Address
                            {profile?.email && formData.email === profile.email && (
                                <span className="ml-2 text-xs bg-green-500 text-white px-2 py-1 rounded-full">
                                    ✓ Blockchain Verified
                                </span>
                            )}
                        </label>
                        <div className="space-y-2">
                            <input
                                type="email"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                className="w-full px-4 py-2 bg-white text-gray-700 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="your@email.com"
                            />
                            <button
                                type="button"
                                onClick={handleSendVerification}
                                disabled={isSendingVerification || !formData.email || !formData.email.includes('@')}
                                className="w-full px-3 py-2 bg-green-400 text-white text-sm rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                {isSendingVerification ? 'Sending...' : 'Send Verification Code'}
                            </button>
                            <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                                <Lock size={12} /> A 6-digit code will be sent to verify your email
                            </p>
                        </div>
                    </div>

                    {/* Name */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Name *</label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                            className="w-full px-4 py-3 text-gray-700 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Your name"
                            required
                        />
                    </div>

                    {/* Birth Year */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Birth Year *</label>
                        <select
                            value={formData.birthYear}
                            onChange={(e) => setFormData(prev => ({ ...prev, birthYear: e.target.value }))}
                            className="w-full px-4 py-3 border text-gray-700 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            required
                        >
                            <option value="">Select birth year</option>
                            {Array.from({ length: 105 }, (_, i) => {
                                const year = 2025 - i; // From 2025 down to 1920
                                const calculatedAge = new Date().getFullYear() - year;
                                return calculatedAge >= 18 && calculatedAge <= 120 ? (
                                    <option key={year} value={year}>
                                        {year} (age {calculatedAge})
                                    </option>
                                ) : null;
                            }).filter(Boolean)}
                        </select>
                    </div>

                    {/* Gender */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Gender *</label>
                        <select
                            value={formData.gender}
                            onChange={(e) => setFormData(prev => ({ ...prev, gender: e.target.value }))}
                            className="w-full px-4 py-3 border text-gray-700 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            required
                        >
                            <option value="">Select Gender</option>
                            <option value="Female">Female</option>
                            <option value="Male">Male</option>
                            <option value="Prefer not to say">Prefer not to say</option>
                        </select>
                    </div>

                    {/* Interests */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Interests *</label>
                        <textarea
                            value={formData.interests}
                            onChange={(e) => setFormData(prev => ({ ...prev, interests: e.target.value }))}
                            className="w-full px-4 py-3 text-gray-700 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Hiking, Photography, Crypto, Art"
                            rows={3}
                            required
                        />
                    </div>

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={isPending || isConfirming}
                        className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-4 rounded-xl font-semibold text-lg hover:opacity-90 transition-opacity disabled:opacity-50"
                    >
                        {isPending || isConfirming ? (
                            <span className="flex items-center justify-center">
                                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Updating & Verifying on Blockchain...
                            </span>
                        ) : (
                            'Update Profile'
                        )}
                    </button>

                    {/* Visibility Notice */}
                    {!isFullyVerified && (
                        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-2">
                            <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                            <p className="text-xs text-blue-800">
                                <span className="font-semibold">Visibility Notice:</span> Only profiles with both email and wallet verified appear on the discovery page.
                            </p>
                        </div>
                    )}

                    {/* Delete Account Section */}
                    {hasWallet && profile?.exists && (
                        <div className="mt-8 pt-6 border-t-2 border-gray-200">
                            <div className="bg-red-50 rounded-xl p-4 border-2 border-red-200">
                                <h3 className="text-lg font-semibold text-red-800 mb-2 flex items-center gap-2"><AlertTriangle size={20} /> Danger Zone</h3>
                                <p className="text-sm text-red-700 mb-4">
                                    Deleting your account will permanently remove your profile NFT and all associated data. This action cannot be undone.
                                </p>

                                {!showDeleteConfirm ? (
                                    <button
                                        type="button"
                                        onClick={() => setShowDeleteConfirm(true)}
                                        disabled={isPending || isConfirming || isDeleting}
                                        className="w-full bg-red-500 text-white py-3 rounded-lg font-semibold hover:bg-red-600 transition-colors disabled:opacity-50"
                                    >
                                        Delete My Account
                                    </button>
                                ) : !showDeleteFinalConfirm ? (
                                    <div className="space-y-3">
                                        <div className="bg-yellow-50 border-2 border-yellow-400 rounded-lg p-3">
                                            <p className="text-sm font-semibold text-yellow-800 mb-2 flex items-center gap-1"><AlertTriangle size={16} /> First Confirmation</p>
                                            <p className="text-sm text-yellow-700 mb-3">
                                                Are you sure? This will permanently delete everything.
                                            </p>
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setShowDeleteConfirm(false);
                                                    setShowDeleteFinalConfirm(false);
                                                }}
                                                className="flex-1 bg-gray-300 text-gray-800 py-2 rounded-lg font-semibold hover:bg-gray-400 transition-colors"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setShowDeleteFinalConfirm(true)}
                                                className="flex-1 bg-orange-500 text-white py-2 rounded-lg font-semibold hover:bg-orange-600 transition-colors"
                                            >
                                                Yes, Continue
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        <div className="bg-red-100 border-2 border-red-500 rounded-lg p-3">
                                            <p className="text-sm font-bold text-red-900 mb-2 flex items-center gap-1"><AlertTriangle size={16} className="text-red-600" /> FINAL CONFIRMATION</p>
                                            <p className="text-sm text-red-800">This is your last chance!</p>
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setShowDeleteConfirm(false);
                                                    setShowDeleteFinalConfirm(false);
                                                }}
                                                disabled={isDeleting}
                                                className="flex-1 bg-gray-300 text-gray-800 py-2 rounded-lg font-semibold hover:bg-gray-400 transition-colors disabled:opacity-50"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                type="button"
                                                onClick={handleDeleteProfile}
                                                disabled={isPending || isConfirming || isDeleting}
                                                className="flex-1 bg-red-600 text-white py-2 rounded-lg font-bold hover:bg-red-700 transition-colors disabled:opacity-50"
                                            >
                                                {isDeleting ? 'Deleting...' : <span className="flex items-center gap-2"><Trash2 size={16} /> Permanently Delete</span>}
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </form>
            </div>
        </div>
    );
}
