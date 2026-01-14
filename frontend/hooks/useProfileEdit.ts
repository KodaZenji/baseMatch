import { useState, useEffect, useRef } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { PROFILE_NFT_ABI, CONTRACTS } from '@/lib/contracts';
import { generateAvatar } from '@/lib/avatarUtils';
import { handleProfileTextUpdate } from '@/lib/profileMinting';
import { useProfile } from '@/hooks/useProfile';

interface UseProfileEditReturn {
    // State
    address: `0x${string}` | undefined;
    isConnected: boolean;
    profile: any;
    profileLoading: boolean;
    userEmail: string;
    hasWallet: boolean;
    avatarUrl: string;
    formData: {
        name: string;
        birthYear: string;
        gender: string;
        interests: string;
        photoUrl: string;
        email: string;
    };
    setFormData: React.Dispatch<React.SetStateAction<{
        name: string;
        birthYear: string;
        gender: string;
        interests: string;
        photoUrl: string;
        email: string;
    }>>;
    newPhotoUrl: string;
    notification: { message: string; type: 'success' | 'error' } | null;
    isSendingVerification: boolean;
    showDeleteConfirm: boolean;
    setShowDeleteConfirm: React.Dispatch<React.SetStateAction<boolean>>;
    showDeleteFinalConfirm: boolean;
    setShowDeleteFinalConfirm: React.Dispatch<React.SetStateAction<boolean>>;
    isDeleting: boolean;
    farcasterVerified: boolean;
    isCheckingFarcaster: boolean;
    farcasterProfile: any;
    showFarcasterOptions: boolean;
    setShowFarcasterOptions: React.Dispatch<React.SetStateAction<boolean>>;
    fileInputRef: React.RefObject<HTMLInputElement>;
    isPending: boolean;
    isConfirming: boolean;
    isFullyVerified: boolean | undefined;

    // Handlers
    handlePhotoChange: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
    handleSendVerification: () => Promise<void>;
    handleCheckFarcaster: () => Promise<void>;
    handleVerifyFarcaster: (usePhoto: boolean) => Promise<void>;
    handleUpdateProfile: (e: React.FormEvent) => Promise<void>;
    handleDeleteProfile: () => Promise<void>;
    handleWalletLinked: () => void;
}

export function useProfileEdit(): UseProfileEditReturn {
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
    const [newPhotoUrl, setNewPhotoUrl] = useState('');
    const [notification, setNotification] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
    const [isSendingVerification, setIsSendingVerification] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [showDeleteFinalConfirm, setShowDeleteFinalConfirm] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [farcasterVerified, setFarcasterVerified] = useState(false);
    const [isCheckingFarcaster, setIsCheckingFarcaster] = useState(false);
    const [farcasterProfile, setFarcasterProfile] = useState<any>(null);
    const [showFarcasterOptions, setShowFarcasterOptions] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const hasShownSuccessRef = useRef(false);
    const hasLoadedProfile = useRef(false);
    const hasSyncedRef = useRef(false);

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

    // Populate form with merged profile data
    useEffect(() => {
        const fetchMergedProfile = async () => {
            if (!address || hasLoadedProfile.current) return;

            try {
                const response = await fetch(`/api/profile/edit?address=${address}`);
                if (response.ok) {
                    const mergedProfile = await response.json();
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
                    hasLoadedProfile.current = true;
                }
            } catch (error) {
                console.error('Error fetching merged profile:', error);
            }
        };

        if (address && isConnected) {
            fetchMergedProfile();
        }
    }, [address, isConnected]);

    // Fetch Farcaster status
    useEffect(() => {
        const fetchFarcasterStatus = async () => {
            if (!address) return;

            try {
                const response = await fetch(`/api/profile/edit?address=${address}`);
                if (response.ok) {
                    const data = await response.json();
                    setFarcasterVerified(data.farcaster_verified || false);
                }
            } catch (error) {
                console.error('Error fetching Farcaster status:', error);
            }
        };

        if (address && isConnected) {
            fetchFarcasterStatus();
        }
    }, [address, isConnected]);

    // Handle transaction success
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
                    const photoToSync = newPhotoUrl || formData.photoUrl;
                    await syncProfileToDatabase({
                        name: formData.name,
                        birthYear: parseInt(formData.birthYear),
                        gender: formData.gender,
                        interests: formData.interests,
                        photoUrl: photoToSync,
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
    }, [isSuccess, isDeleting, formData, newPhotoUrl]);

    const showNotification = (message: string, type: 'success' | 'error') => {
        setNotification({ message, type });
        setTimeout(() => setNotification(null), 3000);
    };

    const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

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
            showNotification('Failed to send verification code', 'error');
        } finally {
            setIsSendingVerification(false);
        }
    };

    const handleCheckFarcaster = async () => {
        setIsCheckingFarcaster(true);
        setFarcasterProfile(null);
        setShowFarcasterOptions(false);

        try {
            const response = await fetch('/api/check-farcaster', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ address }),
            });

            const data = await response.json();
            if (data.exists && data.profile) {
                setFarcasterProfile(data.profile);
                setShowFarcasterOptions(true);
            } else {
                showNotification('No Farcaster account linked to this wallet yet.', 'error');
            }
        } catch (error) {
            showNotification('Failed to check Farcaster', 'error');
        } finally {
            setIsCheckingFarcaster(false);
        }
    };

    const handleVerifyFarcaster = async (usePhoto: boolean) => {
        try {
            const response = await fetch('/api/verify-farcaster', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ address, updatePhoto: usePhoto }),
            });

            const data = await response.json();
            if (data.verified) {
                setFarcasterVerified(true);
                showNotification(data.message, 'success');
                setTimeout(() => {
                    refreshProfile();
                    window.location.reload();
                }, 2000);
            } else {
                showNotification('Verification failed', 'error');
            }
        } catch (error) {
            showNotification('Failed to verify Farcaster', 'error');
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
            showNotification('Please enter a valid birth year', 'error');
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
                showNotification('Failed to update profile', 'error');
            }
            return;
        }

        if (!profile?.exists) {
            showNotification('Profile does not exist', 'error');
            return;
        }

        try {
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

            if (!dbResponse.ok) throw new Error('Failed to update database');

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

            writeContract({
                address: CONTRACTS.PROFILE_NFT as `0x${string}`,
                abi: PROFILE_NFT_ABI,
                functionName: 'updateProfile',
                args: [
                    updateData.contractArgs[0],
                    BigInt(updateData.contractArgs[1]),
                    updateData.contractArgs[2],
                    updateData.contractArgs[3],
                    updateData.contractArgs[4],
                    updateData.contractArgs[5],
                ] as const,
            });
        } catch (error) {
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
            showNotification('Failed to delete profile', 'error');
            setIsDeleting(false);
            setShowDeleteConfirm(false);
            setShowDeleteFinalConfirm(false);
        }
    };

    const syncProfileToDatabase = async (profileData: any) => {
        if (hasSyncedRef.current) return;
        hasSyncedRef.current = true;

        try {
            const response = await fetch('/api/profile/sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    walletAddress: address,
                    ...profileData,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                console.error('Failed to sync profile:', errorData);
            }
        } catch (error) {
            console.error('Error syncing profile:', error);
        }
    };

    const handleWalletLinked = () => {
        setHasWallet(true);
        showNotification('Wallet linked!', 'success');
        refreshProfile();
    };

    const isFullyVerified = profile?.email && formData.email === profile.email && profile?.exists;

    return {
        // State
        address,
        isConnected,
        profile,
        profileLoading,
        userEmail,
        hasWallet,
        avatarUrl,
        formData,
        setFormData,
        newPhotoUrl,
        notification,
        isSendingVerification,
        showDeleteConfirm,
        setShowDeleteConfirm,
        showDeleteFinalConfirm,
        setShowDeleteFinalConfirm,
        isDeleting,
        farcasterVerified,
        isCheckingFarcaster,
        farcasterProfile,
        showFarcasterOptions,
        setShowFarcasterOptions,
        fileInputRef,
        isPending,
        isConfirming,
        isFullyVerified,

        // Handlers
        handlePhotoChange,
        handleSendVerification,
        handleCheckFarcaster,
        handleVerifyFarcaster,
        handleUpdateProfile,
        handleDeleteProfile,
        handleWalletLinked,
    };
}
