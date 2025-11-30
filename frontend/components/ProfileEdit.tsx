'use client';

import { useState, useEffect, useRef } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { PROFILE_NFT_ABI, CONTRACTS } from '@/lib/contracts';
import { generateAvatar } from '@/lib/avatarUtils';
import { useProfile } from '@/hooks/useProfile';

export default function ProfileEdit() {
    const { address } = useAccount();
    const { profile, isLoading: profileLoading, refreshProfile } = useProfile(address);
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

    console.log('Component render - formData:', formData);

    // Generate avatar based on wallet address
    useEffect(() => {
        if (address) {
            setAvatarUrl(generateAvatar(address));
        }
    }, [address]);

    // Populate form with existing profile data - only on initial load
    useEffect(() => {
        if (profile && !formData.name && !formData.age && !formData.gender && !formData.interests && !formData.email) {
            console.log('Initializing form with profile data:', profile);
            setFormData({
                name: profile.name || '',
                age: profile.age ? profile.age.toString() : '',
                gender: profile.gender || '',
                interests: profile.interests || '',
                photoUrl: profile.photoUrl || '',
                email: profile.email || '',
            });
            setNewPhotoUrl(profile.photoUrl || '');
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
            // Check file size (max 3MB)
            if (file.size > 3 * 1024 * 1024) {
                showNotification('Image must be smaller than 3MB', 'error');
                return;
            }

            // Check file type
            if (!file.type.startsWith('image/')) {
                showNotification('Please upload a valid image file', 'error');
                return;
            }

            try {
                // Upload to Supabase Storage
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
            const response = await fetch('/api/send-verification', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email: formData.email,
                    address: address,
                }),
            });

            const result = await response.json();

            if (response.ok && result.success) {
                showNotification(' Verification email sent! Check your inbox.', 'success');
            } else {
                showNotification(result.error || 'Failed to send verification email', 'error');
            }
        } catch (error) {
            console.error('Error sending verification email:', error);
            showNotification('Failed to send verification email. Please check your network connection.', 'error');
        } finally {
            setIsSendingVerification(false);
        }
    };

    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validate form data
        if (!formData.name || !formData.age || !formData.gender || !formData.interests) {
            showNotification('Please fill in all required fields', 'error');
            return;
        }

        const age = parseInt(formData.age);
        console.log(`Validating age: ${age} (type: ${typeof age})`);

        if (isNaN(age)) {
            showNotification('Please enter a valid age', 'error');
            return;
        }

        if (age < 18) {
            showNotification('You must be at least 18 years old', 'error');
            return;
        }

        if (age > 100) {
            showNotification('Please enter a valid age between 18 and 100', 'error');
            return;
        }

        // Check if profile exists
        if (!profile?.exists) {
            showNotification('Profile does not exist. Please create a profile first.', 'error');
            return;
        }

        try {
            // Use newPhotoUrl if it's been changed, otherwise use the existing photoUrl from formData
            const photoUrlToUse = newPhotoUrl || formData.photoUrl || '';

            writeContract({
                address: CONTRACTS.PROFILE_NFT as `0x${string}`,
                abi: PROFILE_NFT_ABI,
                functionName: 'updateProfile',
                args: [formData.name, age, formData.gender, formData.interests, photoUrlToUse, formData.email],
            });
        } catch (error) {
            console.error('Error updating profile:', error);
            showNotification('Failed to update profile', 'error');
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

    // Handle transaction errors
    useEffect(() => {
        if (isError && error) {
            console.error('Transaction error:', error);
            showNotification(`Transaction error: ${error.message}`, 'error');
        }
    }, [isError, error]);

    // Handle transaction success
    useEffect(() => {
        if (isSuccess) {
            if (isDeleting) {
                showNotification('✅ Profile deleted successfully!', 'success');
                // Clear local state
                localStorage.clear();
                setTimeout(() => {
                    window.location.href = '/';
                }, 2000);
            } else {
                showNotification('✅ Profile updated successfully!', 'success');
                refreshProfile();
                setTimeout(() => {
                    window.location.reload();
                }, 2000);
            }
        }
    }, [isSuccess, isDeleting, refreshProfile]);

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

                {/* Notification */}
                {notification && (
                    <div className={`mb-4 p-3 rounded-lg ${notification.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {notification.message}
                    </div>
                )}

                <form onSubmit={handleUpdateProfile} className="space-y-6">
                    {/* Profile Picture Section */}
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
                                    <span className="text-gray-500 text-4xl">👤</span>
                                </div>
                            )}
                            <button
                                type="button"
                                onClick={triggerFileInput}
                                className="absolute bottom-2 right-2 bg-blue-500 text-white rounded-full p-2 shadow-lg hover:bg-blue-600 transition-colors"
                            >
                                ✏️
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

                    {/* Email Section */}
                    <div className="bg-blue-50 rounded-xl p-4 border-2 border-blue-200">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            📧 Email Address
                        </label>
                        <div className="space-y-2">
                            <input
                                type="email"
                                value={formData.email}
                                onChange={(e) => {
                                    setFormData({ ...formData, email: e.target.value });
                                }}
                                className="w-full px-4 py-2 bg-white text-gray-700 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="your@email.com"
                            />

                            <button
                                type="button"
                                onClick={handleSendVerification}
                                disabled={isSendingVerification || !formData.email || !formData.email.includes('@')}
                                className="w-full px-3 py-2 bg-green-400 text-white text-sm rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                {isSendingVerification ? (
                                    <span className="flex items-center justify-center">
                                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Sending...
                                    </span>
                                ) : (
                                    '📨 Send Verification Email'
                                )}
                            </button>
                        </div>
                        <p className="text-xs text-gray-500 mt-2">
                            Email is stored on blockchain. Click verify to confirm your email address.
                        </p>
                        {formData.email !== profile?.email && formData.email && (
                            <p className="text-xs text-yellow-600 mt-1 font-medium">
                                Email will be updated when you save your profile
                            </p>
                        )}
                    </div>

                    {/* Name */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Name *
                        </label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => {
                                const newValue = e.target.value;
                                console.log('Name input change:', { newValue, prev: formData.name });
                                setFormData(prev => ({ ...prev, name: newValue }));
                            }}
                            className="w-full px-4 py-3 text-gray-700 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Your name"
                            required
                        />
                    </div>

                    {/* Age */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Age *
                        </label>
                        <input
                            type="number"
                            value={formData.age}
                            onChange={(e) => {
                                const newValue = e.target.value;
                                setFormData(prev => ({ ...prev, age: newValue }));
                            }}
                            className="w-full px-4 py-3 border text-gray-700 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="18"
                            min="18"
                            max="100"
                            required
                        />
                    </div>

                    {/* Gender */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Gender *
                        </label>
                        <select
                            value={formData.gender}
                            onChange={(e) => {
                                setFormData(prev => ({ ...prev, gender: e.target.value }));
                            }}
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
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Interests *
                        </label>
                        <textarea
                            value={formData.interests}
                            onChange={(e) => {
                                const newValue = e.target.value;
                                setFormData(prev => ({ ...prev, interests: newValue }));
                            }}
                            className="w-full px-4 py-3 text-gray-700 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Hiking, Photography, Crypto, Art"
                            rows={3}
                            required
                        />
                    </div>

                    {/* Email Display - Now always editable */}
                    <div className="bg-blue-50 rounded-xl p-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Email Address
                        </label>
                        <div className="flex items-center">
                            <input
                                type="email"
                                value={formData.email}
                                onChange={(e) => {
                                    const newValue = e.target.value;
                                    setFormData(prev => ({ ...prev, email: newValue }));
                                }}
                                className="flex-1 px-4 py-2 bg-white text-gray-700 rounded-lg border border-gray-300"
                                placeholder="your@email.com"
                            />
                            <button
                                type="button"
                                onClick={handleSendVerification}
                                disabled={isSendingVerification || !formData.email || !formData.email.includes('@')}
                                className="ml-2 px-3 py-2 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600 disabled:opacity-50"
                            >
                                {isSendingVerification ? 'Sending...' : 'Send Verification Link'}
                            </button>
                        </div>
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
                                Updating Profile...
                            </span>
                        ) : (
                            'Update Profile'
                        )}
                    </button>

                    {/* Delete Account Section */}
                    <div className="mt-8 pt-6 border-t-2 border-gray-200">
                        <div className="bg-red-50 rounded-xl p-4 border-2 border-red-200">
                            <h3 className="text-lg font-semibold text-red-800 mb-2">⚠️ Danger Zone</h3>
                            <p className="text-sm text-red-700 mb-4">
                                Deleting your account will permanently remove your profile NFT and all associated data from the blockchain. This action cannot be undone.
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
                                        <p className="text-sm font-semibold text-yellow-800 mb-2">⚠️ First Confirmation</p>
                                        <p className="text-sm text-yellow-700 mb-3">
                                            Are you sure you want to delete your account? This will:
                                        </p>
                                        <ul className="text-xs text-yellow-700 list-disc list-inside space-y-1 mb-3">
                                            <li>Burn your Profile NFT permanently</li>
                                            <li>Remove all your profile data from blockchain</li>
                                            <li>Delete your email registration</li>
                                            <li>Cannot be recovered or undone</li>
                                        </ul>
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
                                        <p className="text-sm font-bold text-red-900 mb-2">🚨 FINAL CONFIRMATION</p>
                                        <p className="text-sm text-red-800 mb-2 font-semibold">
                                            This is your last chance. Type your confirmation below:
                                        </p>
                                        <p className="text-xs text-red-700 mb-3">
                                            Once you click "Permanently Delete Account", your profile NFT will be burned and all data will be permanently removed from the blockchain.
                                        </p>
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
                                            {isDeleting ? (
                                                <span className="flex items-center justify-center">
                                                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                    </svg>
                                                    Deleting...
                                                </span>
                                            ) : (
                                                '🗑️ Permanently Delete Account'
                                            )}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}