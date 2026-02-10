'use client';

import { useState } from 'react';
import { Share2, Copy, Check } from 'lucide-react';

interface InviteLinkProps {
  participant: any;
}

export function InviteLink({ participant }: InviteLinkProps) {
  const [copied, setCopied] = useState(false);
  
  if (!participant) return null;
  
  const inviteLink = `${window.location.origin}/race?ref=${participant.referral_code}`;
  const inviteCount = participant.invite_count || 0;
  const needsInvite = inviteCount < 1;
  
  async function copyLink() {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      alert('Failed to copy link');
    }
  }
  
  async function shareLink() {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join BaseMatch Founding Race',
          text: 'Join me in the BaseMatch founding member race! Top 100 win NFTs.',
          url: inviteLink
        });
      } catch (error) {
        // User cancelled
      }
    } else {
      copyLink();
    }
  }
  
  return (
    <div className={`rounded-lg p-6 border transition-all ${
      needsInvite 
        ? 'bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 border-2 border-yellow-400 dark:border-yellow-600' 
        : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
    }`}>
      
      {needsInvite && (
        <div className="mb-4 text-center">
          <div className="inline-flex items-center gap-2 bg-yellow-100 dark:bg-yellow-800 text-yellow-800 dark:text-yellow-100 px-3 py-1 rounded-full text-sm font-bold mb-2">
            ⚠️ Action Required
          </div>
          <p className="text-sm font-semibold text-yellow-900 dark:text-yellow-100">
            Invite 1 person to unlock check-ins!
          </p>
        </div>
      )}
      
      <h3 className="text-xl font-bold mb-2">
        {needsInvite ? '🎯 Your Invite Mission' : 'Your Invite Link'}
      </h3>
      
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
        {needsInvite 
          ? 'Share this link with a friend to unlock daily check-ins'
          : 'Keep inviting to boost your check-in points!'
        }
      </p>
      
      <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 mb-4 break-all text-sm font-mono">
        {inviteLink}
      </div>
      
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={copyLink}
          className="flex items-center justify-center gap-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 font-semibold py-2 px-4 rounded-lg transition-colors"
        >
          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          {copied ? 'Copied!' : 'Copy'}
        </button>
        
        <button
          onClick={shareLink}
          className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
        >
          <Share2 className="w-4 h-4" />
          Share
        </button>
      </div>
      
      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600 dark:text-gray-400">
            People you've invited:
          </span>
          <span className={`font-bold text-lg ${
            needsInvite ? 'text-yellow-600 dark:text-yellow-400' : 'text-blue-600 dark:text-blue-400'
          }`}>
            {inviteCount}
          </span>
        </div>
        
        {!needsInvite && (
          <p className="text-xs text-green-600 dark:text-green-400 mt-2 flex items-center gap-1">
            <span>✅</span>
            <span>Check-ins unlocked! More invites = more points per check-in</span>
          </p>
        )}
      </div>
    </div>
  );
}
