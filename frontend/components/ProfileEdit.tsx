'use client';

import { useProfileEdit } from '@/hooks/useProfileEdit';
import FarcasterVerificationSection from './ProfileEdit/FarcasterVerificationSection';
import EmailVerificationSection from './ProfileEdit/EmailVerificationSection';
import ProfilePhotoSection from './ProfileEdit/ProfilePhotoSection';
import ProfileFormFields from './ProfileEdit/ProfileFormFields';
import DeleteAccountSection from './ProfileEdit/DeleteAccountSection';

export default function ProfileEdit() {
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
  } = useProfileEdit();

  return (
    <div className="max-w-xl mx-auto p-6 space-y-6">
      {notification && (
        <div
          className={`p-3 rounded-lg ${
            notification.type === 'success'
              ? 'bg-green-50 border border-green-200 text-green-700'
              : 'bg-red-50 border border-red-200 text-red-700'
          }`}
        >
          {notification.message}
        </div>
      )}

      {/* Profile Photo */}
      <ProfilePhotoSection
        newPhotoUrl={newPhotoUrl}
        avatarUrl={avatarUrl}
        fileInputRef={fileInputRef}
        onPhotoChange={handlePhotoChange}
        onTriggerFileInput={() => fileInputRef.current?.click()}
      />

      {/* Profile Form */}
      <form onSubmit={handleUpdateProfile} className="space-y-4">
        <ProfileFormFields
          formData={formData}
          onChange={(field, value) =>
            setFormData((prev: typeof formData) => ({ ...prev, [field]: value }))
          }
        />
        <button
          type="submit"
          className="w-full bg-purple-600 text-white py-2 rounded-lg hover:bg-purple-700 text-sm font-medium"
        >
          Update Profile
        </button>
      </form>

      {/* Email Verification */}
      {!hasWallet && (
        <EmailVerificationSection
          email={formData.email}
          isVerified={false} // optional: connect to blockchain verification state
          isSending={isSendingVerification}
          onEmailChange={(email) =>
            setFormData((prev: typeof formData) => ({ ...prev, email }))
          }
          onSendVerification={handleSendVerification}
        />
      )}

      {/* Farcaster Verification */}
      {hasWallet && (
        <FarcasterVerificationSection
          hasWallet={hasWallet}
          farcasterVerified={farcasterVerified}
          walletAddress={address || ''}
          onVerificationComplete={() => setFarcasterVerified(true)}
        />
      )}

      {/* Delete Profile */}
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
  );
}
