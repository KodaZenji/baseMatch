'use client';

import { useProfileEdit } from '@/hooks/useProfileEdit';
import FarcasterVerificationSection from './ProfileEdit/FarcasterVerificationSection';
import EmailVerificationSection from './ProfileEdit/EmailVerificationSection';
import ProfilePhotoSection from './ProfileEdit/ProfilePhotoSection';
import ProfileFormFields from './ProfileEdit/ProfileFormFields';
import DeleteAccountSection from './ProfileEdit/DeleteAccountSection';
import { ChevronLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function ProfileEdit() {
  const router = useRouter();
  const {
    address,
    isConnected,
    hasWallet,
    avatarUrl,
    newPhotoUrl,
    fileInputRef,
    formData,
    setFormData,
    notification,
    isSendingVerification,
    showDeleteConfirm,
    setShowDeleteConfirm,
    showDeleteFinalConfirm,
    setShowDeleteFinalConfirm,
    isDeleting,
    farcasterVerified,
    setFarcasterVerified,
    handlePhotoChange,
    handleSendVerification,
    handleUpdateProfile,
    handleDeleteProfile,
    handleWalletLinked,
    isPending,
    isConfirming,
    profile, // Add profile from hook
  } = useProfileEdit();

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-blue-500 to-indigo-700 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-2xl w-full relative">
        {/* Back Button - Goes to Dashboard */}
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
          <div
            className={`mb-4 p-3 rounded-lg ${
              notification.type === 'success'
                ? 'bg-green-100 text-green-700'
                : 'bg-red-100 text-red-700'
            }`}
          >
            {notification.message}
          </div>
        )}

        <form onSubmit={handleUpdateProfile} className="space-y-6 mt-6">
          {/* Profile Photo */}
          <ProfilePhotoSection
            newPhotoUrl={newPhotoUrl}
            avatarUrl={avatarUrl}
            fileInputRef={fileInputRef}
            onPhotoChange={handlePhotoChange}
            onTriggerFileInput={() => fileInputRef.current?.click()}
          />

          {/* Email Verification - Show for all users */}
          <EmailVerificationSection
            email={formData.email}
            isVerified={profile?.email && formData.email === profile.email && profile?.exists}
            isSending={isSendingVerification}
            onEmailChange={(email) =>
              setFormData((prev: typeof formData) => ({ ...prev, email }))
            }
            onSendVerification={handleSendVerification}
          />

          {/* Farcaster Verification - Only for wallet users */}
          {hasWallet && (
            <FarcasterVerificationSection
              hasWallet={hasWallet}
              farcasterVerified={farcasterVerified}
              walletAddress={address || ''}
              onVerificationComplete={() => setFarcasterVerified(true)}
            />
          )}

          {/* Profile Form Fields - BELOW verification sections */}
          <ProfileFormFields
            formData={formData}
            onChange={(field, value) =>
              setFormData((prev: typeof formData) => ({ ...prev, [field]: value }))
            }
          />

          {/* Update Profile Button - NOW BELOW FARCASTER */}
          <button
            type="submit"
            disabled={isPending || isConfirming}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-4 rounded-xl font-semibold text-lg hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {isPending || isConfirming ? (
              <span className="flex items-center justify-center">
                <svg
                  className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Updating & Verifying on Blockchain...
              </span>
            ) : (
              'Update Profile'
            )}
          </button>
        </form>

        {/* Delete Profile */}
        <div className="mt-6">
          <DeleteAccountSection
            hasWallet={hasWallet}
            profileExists={!!address}
            showDeleteConfirm={showDeleteConfirm}
            showDeleteFinalConfirm={showDeleteFinalConfirm}
            isDeleting={isDeleting}
            isPending={isPending}
            isConfirming={isConfirming}
            onShowConfirm={setShowDeleteConfirm}
            onShowFinalConfirm={setShowDeleteFinalConfirm}
            onDelete={handleDeleteProfile}
          />
        </div>
      </div>
    </div>
  );
}
