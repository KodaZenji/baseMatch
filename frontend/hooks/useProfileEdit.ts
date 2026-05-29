import { useState, useEffect, useRef } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { useRouter } from 'next/navigation';
import { PROFILE_NFT_ABI, CONTRACTS } from '@/lib/contracts';
import { generateAvatar } from '@/lib/avatarUtils';
import { handleProfileTextUpdate } from '@/lib/profileMinting';
import { useProfile } from '@/hooks/useProfile';

interface UseProfileEditReturn {
    address: string | undefined;
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
    setFormData: React.Dispatch<React.SetStateAction<any>>;
    newPhotoUrl: string;
    notification: { message: string; type: 'success' | 'error' } | null;
    isSendingVerification: boolean;
    showDeleteConfirm: boolean;
    setShowDeleteConfirm: React.Dispatch<React.SetStateAction<boolean>>;
    showDeleteFinalConfirm: boolean;
    setShowDeleteFinalConfirm: React.Dispatch<React.SetStateAction<boolean>>;
    isDeleting: boolean;
    farcasterVerified: boolean;
    setFarcasterVerified: React.Dispatch<React.SetStateAction<boolean>>;
    fileInputRef: React.RefObject<HTMLInputElement>;
    isPending: boolean;
    isConfirming: boolean;
    isFullyVerified: boolean;
    handlePhotoChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    handleSendVerification: () => void;
    handleUpdateProfile: (e: React.FormEvent) => void;
    handleDeleteProfile: () => void;
    handleWalletLinked: () => void;
    isCheckingFarcaster: boolean;
    farcasterProfile: any;
    showFarcasterOptions: boolean;
    setShowFarcasterOptions: React.Dispatch<React.SetStateAction<boolean>>;
    handleCheckFarcaster: () => void;
    handleVerifyFarcaster: () => void;
}

export function useProfileEdit(): Omit<
    UseProfileEditReturn,
    'isCheckingFarcaster' | 'farcasterProfile' | 'showFarcasterOptions' | 'setShowFarcasterOptions' | 'handleCheckFarcaster' | 'handleVerifyFarcaster'
> & {
    farcasterVerified: boolean;
    setFarcasterVerified: React.Dispatch<React.SetStateAction<boolean>>;
} {
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
    const [newPhotoUrl, setNewPhotoUrl] = useState('');
    const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const [isSendingVerification, setIsSendingVerification] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [showDeleteFinalConfirm, setShowDeleteFinalConfirm] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [farcasterVerified, setFarcasterVerified] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null) as React.RefObject<HTMLInputElement>;
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
                            if (data.profile.walletAddress) setHasWallet(true);
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
        if (address) setAvatarUrl(generateAvatar(address));
    }, [address]);

    // Populate form with merged profile data
    useEffect(() => {
        if (!address || hasLoadedProfile.current) return;

        const fetchMergedProfile = async () => {
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
                    if (mergedProfile.email) setUserEmail(mergedProfile.email);
                    if (mergedProfile.farcaster_verified) setFarcasterVerified(true);
                    hasLoadedProfile.current = true;
                }
            } catch (error) {
                console.error('Error fetching merged profile:', error);
            }
        };

        fetchMergedProfile();
    }, [address]);

    // ── Transaction success handling ─────────────────────────────────────────
    useEffect(() => {
        const handleTransactionSuccess = async () => {
            if (isSuccess && !hasShownSuccessRef.current) {
                hasShownSuccessRef.current = true;

                if (isDeleting) {
                    showNotification('✅ Profile deleted successfully!', 'success');
                    localStorage.clear();
                    // Use router.push instead of window.location.href to avoid full reload
                    setTimeout(() => router.push('/'), 2000);
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

                    // ✅ FIX: stay on edit page — don't navigate away
                    // User may still be reviewing their changes.
                    // refreshProfile() re-fetches fresh data so form reflects new values.
                    // 'profile-updated' event tells Dashboard to re-render when user goes back.
                    refreshProfile();
                    window.dispatchEvent(new CustomEvent('profile-updated'));
                }
            }
        };
        handleTransactionSuccess();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isSuccess, isDeleting, formData, newPhotoUrl]);

    const showNotification = (message: string, type: 'success' | 'error') => {
        setNotification({ message, type });
        setTimeout(() => setNotification(null), 3000);
    };

    // Photo upload handler
    const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 3 * 1024 * 1024) return showNotification('Image must be smaller than 3MB', 'error');
        if (!file.type.startsWith('image/')) return showNotification('Please upload a valid image file', 'error');

        try {
            const form = new FormData();
            form.append('file', file);

            const response = await fetch('/api/upload-image', { method: 'POST', body: form });
            if (!response.ok) throw new Error('Failed to upload image');

            const data = await response.json();
            if (data.url) {
                setNewPhotoUrl(data.url);
                showNotification('Image uploaded successfully', 'success');
            }
        } catch (error) {
            showNotification(error instanceof Error ? error.message : 'Failed to upload image', 'error');
        }
    };

    // Email verification
    const handleSendVerification = async () => {
        if (!formData.email || !formData.email.includes('@'))
            return showNotification('Please enter a valid email address', 'error');

        setIsSendingVerification(true);
        try {
            const response = await fetch('/api/register-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: formData.email, walletAddress: address }),
            });
            const result = await response.json();
            if (response.ok && result.success) {
                showNotification('Verification code sent! Check your inbox.', 'success');
                localStorage.setItem('emailForRegistration', formData.email);
                setTimeout(() => (window.location.href = '/verify-email'), 2000);
            } else showNotification(result.error || 'Failed to send verification code', 'error');
        } catch {
            showNotification('Failed to send verification code', 'error');
        } finally {
            setIsSendingVerification(false);
        }
    };

    // Update profile handler
    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        hasShownSuccessRef.current = false;
        hasSyncedRef.current = false;

        if (!formData.name || !formData.birthYear || !formData.gender || !formData.interests)
            return showNotification('Please fill in all required fields', 'error');

        const birthYear = parseInt(formData.birthYear);
        const currentYear = new Date().getFullYear();
        if (isNaN(birthYear) || currentYear - birthYear < 18 || currentYear - birthYear > 120)
            return showNotification('Please enter a valid birth year', 'error');

        // Email-only users (no wallet)
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
                    // Stay on edit page — just dispatch event so Dashboard refreshes when user goes back
                    window.dispatchEvent(new CustomEvent('profile-updated'));
                    refreshProfile();
                } else {
                    showNotification(result.error || 'Failed to update profile', 'error');
                }
            } catch {
                showNotification('Failed to update profile', 'error');
            }
            return;
        }

        if (!profile?.exists) return showNotification('Profile does not exist', 'error');

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
            if (imageChanged && fileInputRef.current?.files?.[0]) newImageFile = fileInputRef.current.files[0];

            const updateData = await handleProfileTextUpdate(profile.tokenId.toString(), {
                name: formData.name,
                birthYear,
                gender: formData.gender,
                interests: formData.interests,
                photoUrl: newPhotoUrl || formData.photoUrl || '',
                email: formData.email,
            }, newImageFile);

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
        } catch {
            showNotification('Failed to update profile', 'error');
        }
    };

    // Delete profile
    const handleDeleteProfile = async () => {
        if (!profile?.exists) return showNotification('Profile does not exist', 'error');

        setIsDeleting(true);
        try {
            writeContract({
                address: CONTRACTS.PROFILE_NFT as `0x${string}`,
                abi: PROFILE_NFT_ABI,
                functionName: 'deleteProfile',
                args: [],
            });
        } catch {
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
                body: JSON.stringify({ walletAddress: address, ...profileData }),
            });
            if (!response.ok) console.error('Failed to sync profile');
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
        setFarcasterVerified,
        fileInputRef,
        isPending,
        isConfirming,
        isFullyVerified,
        handlePhotoChange,
        handleSendVerification,
        handleUpdateProfile,
        handleDeleteProfile,
        handleWalletLinked,
    };
}
