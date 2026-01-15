'use client';

import { useRouter } from 'next/navigation';
import { useProfileEdit } from '@/hooks/useProfileEdit';
import WalletConnectionSection from './WalletConnectionSection';
import ProfilePhotoSection from './ProfileEdit/ProfilePhotoSection';
import EmailVerificationSection from './ProfileEdit/EmailVerificationSection';
import FarcasterVerificationSection from './ProfileEdit/FarcasterVerificationSection';
import ProfileFormFields from './ProfileEdit/ProfileFormFields';
import DeleteAccountSection from './ProfileEdit/DeleteAccountSection';
import { ChevronLeft, Lightbulb, Info } from 'lucide-react';

export default function ProfileEdit() {
    const router = useRouter();
    const {
        // State
        address,
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
        isPending,
        isConfirming,
        isFullyVerified,

        // Handlers
        handlePhotoChange,
        handleSendVerification,
        handleUpdateProfile,
        handleDeleteProfile,
        handleWalletLinked,
    } = useProfileEdit();

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
                {/* Back Button */}
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

                {/* Notification */}
                {notification && (
                    <div className={`mb-4 p-3 rounded-lg ${notification.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {notification.message}
                    </div>
                )}

                <form onSubmit={handleUpdateProfile} className="space-y-6">
                    {/* Profile Photo */}
                    <ProfilePhotoSection
                        newPhotoUrl={newPhotoUrl}
                        avatarUrl={avatarUrl}
                        fileInputRef={null}
                        onPhotoChange={handlePhotoChange}
                        onTriggerFileInput={() => {}}
                    />

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

                    {/* Email Verification */}
                    <EmailVerificationSection
                        email={formData.email}
                        isVerified={profile?.email === formData.email && !!profile?.email}
                        isSending={isSendingVerification}
                        onEmailChange={(email) => setFormData({ ...formData, email })}
                        onSendVerification={handleSendVerification}
                    />

                    {/* Farcaster Verification (NEW STYLE) */}
                    <FarcasterVerificationSection
                        hasWallet={hasWallet}
                        farcasterVerified={farcasterVerified}
                        walletAddress={address || ''}
                        onVerificationComplete={() => {
                            console.log('Farcaster verified!');
                        }}
                    />

                    {/* Form Fields */}
                    <ProfileFormFields
                        formData={formData}
                        onChange={(field, value) => setFormData(prev => ({ ...prev, [field]: value }))}
                    />

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

                    {/* Delete Account */}
                    <DeleteAccountSection
                        hasWallet={hasWallet}
                        profileExists={profile?.exists || false}
                        showDeleteConfirm={showDeleteConfirm}
                        showDeleteFinalConfirm={showDeleteFinalConfirm}
                        isDeleting={isDeleting}
                        isPending={isPending}
                        isConfirming={isConfirming}
                        onShowConfirm={setShowDeleteConfirm}
                        onShowFinalConfirm={setShowDeleteFinalConfirm}
                        onDelete={handleDeleteProfile}
                    />
                </form>
            </div>
        </div>
    );
}
