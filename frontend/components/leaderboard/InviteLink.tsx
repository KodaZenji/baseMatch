'use client';

import { useState } from 'react';
import { Copy, Check } from 'lucide-react';

interface InviteLinkProps {
  participant: any;
}

export function InviteLink({ participant }: InviteLinkProps) {
  const [copied, setCopied] = useState(false);
  
  if (!participant || !participant.referral_code) {
    return (
      <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-6 border border-gray-300 dark:border-gray-700">
        <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
          Loading your referral code...
        </p>
      </div>
    );
  }
  
  const referralCode = participant.referral_code;
  const inviteCount = participant.invite_count || 0;
  const needsInvite = inviteCount < 1;
  
  async function copyCode() {
    try {
      await navigator.clipboard.writeText(referralCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      alert('Failed to copy code');
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
            Share your code to unlock check-ins!
          </p>
        </div>
      )}
      
      <h3 className="text-xl font-bold mb-2">
        {needsInvite ? '🎯 Your Invite Code' : 'Your Referral Code'}
      </h3>
      
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
        {needsInvite 
          ? 'Share this code with a friend to unlock daily check-ins'
          : 'Keep inviting to boost your check-in points!'
        }
      </p>
      
      {/* Referral Code Display - BASE COLORS */}
      <div className="bg-gradient-to-br from-[#0052FF]/10 to-[#5B8DEE]/10 dark:from-[#0052FF]/20 dark:to-[#5B8DEE]/20 rounded-lg p-4 mb-4 border-2 border-[#0052FF]/30 dark:border-[#0052FF]/50">
        <p className="text-xs text-gray-600 dark:text-gray-400 mb-1 text-center">Your Code:</p>
        <p className="text-3xl font-bold text-center tracking-widest text-[#0052FF] dark:text-[#5B8DEE] font-mono select-all">
          {referralCode}
        </p>
      </div>
      
      {/* Copy Button - BASE BLUE */}
      <button
        onClick={copyCode}
        className="w-full flex items-center justify-center gap-2 bg-[#0052FF] hover:bg-[#0041CC] text-white font-bold py-3 px-4 rounded-lg transition-colors mb-4 shadow-lg shadow-[#0052FF]/20"
      >
        {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
        {copied ? 'Copied!' : 'Copy Code'}
      </button>
      
      {/* Instructions */}
      <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 mb-4">
        <p className="text-xs text-gray-700 dark:text-gray-300 font-semibold mb-2">
          📝 How your friend joins:
        </p>
        <ol className="text-xs text-gray-600 dark:text-gray-400 space-y-1 list-decimal list-inside">
          <li>Tell them to visit <span className="font-bold">basematch.app</span></li>
          <li>Go to the <span className="font-bold">Race</span> tab</li>
          <li>Enter your code: <span className="font-mono font-bold bg-[#0052FF]/10 dark:bg-[#0052FF]/20 text-[#0052FF] dark:text-[#5B8DEE] px-1 rounded">{referralCode}</span></li>
        </ol>
      </div>
      
      {/* Stats */}
      <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600 dark:text-gray-400">
            People you've invited:
          </span>
          <span className={`font-bold text-lg ${
            needsInvite ? 'text-yellow-600 dark:text-yellow-400' : 'text-[#0052FF] dark:text-[#5B8DEE]'
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
