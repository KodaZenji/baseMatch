'use client';

import { useState, useEffect, useRef } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { PROFILE_NFT_ABI, CONTRACTS } from '@/lib/contracts';
import { generateAvatar } from '@/lib/avatarUtils';
import { handleProfileTextUpdate } from '@/lib/profileMinting';
import { useProfile } from '@/hooks/useProfile';
import WalletConnectionSection from './WalletConnectionSection';

export default function ProfileEdit() {
    const { address, isConnected } = useAccount();
    const { profile, isLoading: profileLoading, refreshProfile } = useProfile(address);
    
    // State for user info (for email-first users without wallet)
    const [userEmail, setUserEmail] = useState('');
    const [hasWallet, setHasWallet] = useState(false);
    
    const [avatarUrl, setAvatarUrl] = useState('');
    const [formData, setFormData] = useState({
        name: '',
        age: '',
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

    const { writeContract, data: hash, isPending, isError, error } = useWriteContract();
    const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

    // Check if user registered via email first (no wallet yet)
    useEffect(() => {
        const checkUserStatus = async () => {
            // Try to get user info from localStorage or API
            const storedEmail = localStorage.getItem('userEmail');
            if (storedEmail && !isConnected) {
                setUserEmail(storedEmail);
                setHasWallet(false);
                
                // Fetch user profile data by email
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
                                age: data.profile.age ? data.profile.age.toString() : '',
                                gender: data.profile.gender || '',
                                interests: data.profile.interests || '',
                                photoUrl: data.profile.photoUrl || '',
                                email: data.profile.email || '',
                            });
                            setNewPhotoUrl(data.profile.photoUrl || '');
                        }
                    }
                } catch (error) {
                    console.error('Error fetching user profile:', error);
                }
            }
        };
        
        checkUserStatus();
    }, [isConnected]);

    // Generate avatar based on wallet address
    useEffect(() => {
        if (address) {
            setAvatarUrl(generateAvatar(address));
            setHasWallet(true);
        }
    }, [address]);

    // Populate form with existing profile data
    useEffect(() => {
        if (profile && !formData.name) {
            setFormData({
                name: profile.name || '',
                age: profile.age ? profile.age.toString() : '',
                gender: profile.gender || '',
                interests: profile.interests || '',
                photoUrl: profile.photoUrl || '',
                email: profile.email || '',
            });
            setNewPhotoUrl(profile.photoUrl || '');
            if (profile.email) {
                setUserEmail(profile.email);
            }
        }
    }, [profile]);

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
                }
            } catch (error) {
                console.error('Error uploading image:', error);
                showNotification(error instanceof Error ? error.message : 'Failed to upload image', 'error');
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
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: formData.email }),
            });

            const result = await response.json();

            if (response.ok && result.success) {
                showNotification('Verification email sent! Check your inbox.', 'success');
            } else {
                showNotification(result.error || 'Failed to send verification email', 'error');
            }
        } catch (error) {
            console.error('Error sending verification email:', error);
            showNotification('Failed to send verification email', 'error');
        } finally {
            setIsSendingVerification(false);
        }
    };

    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.name || !formData.age || !formData.gender || !formData.interests) {
            showNotification('Please fill in all required fields', 'error');
            return;
        }

        const age = parseInt(formData.age);
        if (isNaN(age) || age < 18 || age > 100) {
            showNotification('Please enter a valid age between 18 and 100', 'error');
            return;
        }

        // For email-first users without wallet, update via API
        if (!hasWallet || !isConnected) {
            try {
                const response = await fetch('/api/profile/update-by-email', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        email: userEmail,
                        name: formData.name,
                        age,
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

        // For wallet users with NFT profile
        if (!profile?.exists) {
            showNotification('Profile does not exist. Please create a profile first.', 'error');
            return;
        }

        try {
            const imageChanged = newPhotoUrl && newPhotoUrl !== formData.photoUrl;
            let newImageFile: File | undefined;

            if (imageChanged && fileInputRef.current?.files?.[0]) {
                newImageFile = fileInputRef.current.files[0];
            }

            const updateData = await handleProfileTextUpdate(
                profile.tokenId.toString(),
                {
                    name: formData.name,
                    age,
                    gender: formData.gender,
                    interests: formData.interests,
                    photoUrl: newPhotoUrl || formData.photoUrl || '',
                    email: formData.email,
                },
                newImageFile
            );

            writeContract({
                address: CONTRACTS.PROFILE_NFT as `0x${string}`,
                abi: PROFILE_NFT_ABI,
                functionName: 'updateProfile',
                args: updateData.contractArgs,
            });
        } catch (error) {
            console.error('Error updating profile:', error);
            showNotification(error instanceof Error ? error.message : 'Failed to update profile', 'error');
        }
    };

    const handleWalletLinked = () => {
        setHasWallet(true);
        showNotification('Wallet linked! You can now mint your profile NFT.', 'success');
        refreshProfile();
    };

    // Handle transaction errors
    useEffect(() => {
        if (isError && error) {
            showNotification(`Transaction error: ${error.message}`, 'error');
        }
    }, [isError, error]);

    // Handle transaction success
    useEffect(() => {
        if (isSuccess) {
            showNotification('✅ Profile updated successfully!', 'success');
            refreshProfile();
        }
    }, [isSuccess, refreshProfile]);

    if (profileLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-blue-500 to-indigo-700 flex items-center justify-center">
                <div className="text-white text-2xl">Loading profile...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-blue-500 to-indigo-700 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-2xl w-full">
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
                                <img src={newPhotoUrl} alt="Profile" className="w-32 h-32 rounded-full border-4 border-white shadow-lg object-cover" />
                            ) : avatarUrl ? (
                                <img src={avatarUrl} alt="Avatar" className="w-32 h-32 rounded-full border-4 border-white shadow-lg" />
                            ) : (
                                <div className="bg-gray-200 border-4 border-white rounded-full w-32 h-32 flex items-center justify-center shadow-lg">
                                    <span className="text-gray-500 text-4xl">👤</span>
                                </div>
                            )}
                            <button type="button" onClick={triggerFileInput} className="absolute bottom-2 right-2 bg-blue-500 text-white rounded-full p-2 shadow-lg hover:bg-blue-600">
                                ✏️
                            </button>
                        </div>
                        <input type="file" ref={fileInputRef} onChange={handlePhotoChange} accept="image/*" className="hidden" />
                        <p className="text-gray-600 text-sm">Click the pencil to upload your photo (max 3MB)</p>
                    </div>

                    {/* Wallet Connection Section - Only show if no wallet */}
                    {!hasWallet && userEmail && (
                        <WalletConnectionSection userEmail={userEmail} onWalletLinked={handleWalletLinked} />
                    )}

                    {/* Email Section */}
                    <div className="bg-blue-50 rounded-xl p-4 border-2 border-blue-200">
                        <label className="block text-sm font-medium text-gray-700 mb-2">📧 Email Address</label>
                        <input
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            className="w-full px-4 py-2 bg-white text-gray-700 rounded-lg border border-gray-300 mb-2"
                            placeholder="your@email.com"
                        />
                        <button
                            type="button"
                            onClick={handleSendVerification}
                            disabled={isSendingVerification}
                            className="w-full px-3 py-2 bg-green-400 text-white text-sm rounded-lg hover:bg-green-600 disabled:opacity-50"
                        >
                            {isSendingVerification ? 'Sending...' : '📨 Send Verification Email'}
                        </button>
                        <p className="text-xs text-gray-500 mt-2">Email is stored on blockchain. Click verify to confirm your email address.</p>
                    </div>

                    {/* Name */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Name *</label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="w-full px-4 py-3 text-gray-700 border rounded-xl"
                            required
                        />
                    </div>

                    {/* Age */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Age *</label>
                        <input
                            type="number"
                            value={formData.age}
                            onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                            className="w-full px-4 py-3 text-gray-700 border rounded-xl"
                            min="18"
                            max="100"
                            required
                        />
                    </div>

                    {/* Gender */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Gender *</label>
                        <select
                            value={formData.gender}
                            onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                            className="w-full px-4 py-3 text-gray-700 border rounded-xl"
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
                            onChange={(e) => setFormData({ ...formData, interests: e.target.value })}
                            className="w-full px-4 py-3 text-gray-700 border rounded-xl"
                            rows={3}
                            required
                        />
                    </div>

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={isPending || isConfirming}
                        className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-4 rounded-xl font-semibold hover:opacity-90 disabled:opacity-50"
                    >
                        {isPending || isConfirming ? 'Updating...' : 'Update Profile'}
                    </button>
                </form>
            </div>
        </div>
    );
}
