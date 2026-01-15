'use client';

import { useState } from 'react';
import { useProfileEdit } from '@/hooks/useProfileEdit';
import FarcasterVerificationSection from './ProfileEdit/FarcasterVerificationSection';

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
    showFarcasterOptions,
    farcasterProfile,
    handlePhotoChange,
    handleSendVerification,
    handleCheckFarcaster,
    handleVerifyFarcaster,
    handleUpdateProfile,
    handleDeleteProfile,
    handleWalletLinked,
  } = useProfileEdit();

  return (
    <div className="max-w-xl mx-auto p-6 space-y-6">
      {/* Notification */}
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

      {/* Avatar & Photo Upload */}
      <div className="flex items-center gap-4">
        <img
          src={newPhotoUrl || avatarUrl}
          alt="Profile Avatar"
          className="w-20 h-20 rounded-full border"
        />
        <input
          type="file"
          ref={fileInputRef}
          onChange={handlePhotoChange}
          className="hidden"
          accept="image/*"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 text-sm"
        >
          Change Photo
        </button>
      </div>

      {/* Profile Form */}
      <form onSubmit={handleUpdateProfile} className="space-y-4">
        {/* Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Name
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, name: e.target.value }))
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-sm"
          />
        </div>

        {/* Email */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Email
          </label>
          <input
            type="email"
            value={formData.email}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, email: e.target.value }))
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-sm"
          />
        </div>

        {/* Birth Year */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Birth Year
          </label>
          <input
            type="number"
            value={formData.birthYear}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, birthYear: e.target.value }))
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-sm"
          />
        </div>

        {/* Gender */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Gender
          </label>
          <input
            type="text"
            value={formData.gender}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, gender: e.target.value }))
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-sm"
          />
        </div>

        {/* Interests */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Interests
          </label>
          <input
            type="text"
            value={formData.interests}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, interests: e.target.value }))
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-sm"
          />
        </div>

        <button
          type="submit"
          className="w-full bg-purple-600 text-white py-2 rounded-lg hover:bg-purple-700 text-sm font-medium"
        >
          Update Profile
        </button>
      </form>

      {/* Email Verification */}
      {!hasWallet && (
        <button
          onClick={handleSendVerification}
          disabled={isSendingVerification}
          className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 text-sm font-medium"
        >
          {isSendingVerification ? 'Sending...' : 'Send Verification Code'}
        </button>
      )}

      {/* Farcaster Verification Section */}
      {hasWallet && (
        <FarcasterVerificationSection
          hasWallet={hasWallet}
          farcasterVerified={farcasterVerified}
          walletAddress={address || ''}
          onVerificationComplete={() => {
            console.log('Farcaster verified!');
          }}
        />
      )}

      {/* Delete Profile */}
      {hasWallet && (
        <div className="mt-4 space-y-2">
          {showDeleteConfirm ? (
            <div className="space-y-2">
              <p className="text-sm text-red-700">
                Are you sure you want to delete your profile?
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowDeleteFinalConfirm(true)}
                  className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm"
                >
                  Yes, Delete
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="bg-gray-200 px-4 py-2 rounded-lg text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm"
            >
              Delete Profile
            </button>
          )}
        </div>
      )}
    </div>
  );
}
