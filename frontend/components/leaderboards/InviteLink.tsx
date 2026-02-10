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
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
      <h3 className="text-xl font-bold mb-4">Your Invite Link</h3>
      
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
        <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
          Each invite who completes their profile boosts your check-in points
        </p>
      </div>
    </div>
  );
}
