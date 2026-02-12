'use client';

import { useState } from 'react';
import { pay } from '@base-org/account';

interface AutoCheckPurchaseProps {
  walletAddress: string;
  participant: any;
}

export function AutoCheckPurchase({ walletAddress, participant }: AutoCheckPurchaseProps) {
  const [processing, setProcessing] = useState<string | null>(null);
  

  const hasCheckedIn = participant?.check_in_streak > 0 || participant?.total_points > 0;
  
  if (!hasCheckedIn) {
    return null;
  }
  
  const TREASURY_WALLET = '0xEbF64265BDbcE2dE0dEaeD58E44409605Bf7704d';
  
  const packages = [
    { id: '7-days', duration: '7-days', label: '7 Days', price: '0.60', savings: '14% off' },
    { id: '14-days', duration: '14-days', label: '14 Days', price: '1.00', savings: '29% off' },
    { id: '28-days', duration: '28-days', label: '28 Days', price: '1.50', savings: '46% off', featured: true }
  ];
  
  async function handlePayment(duration: string, amount: string) {
    setProcessing(duration);
    
    try {
      const payment = await pay({
        amount,
        to: TREASURY_WALLET,
        testnet: false
      });
      
      const res = await fetch('/api/leaderboard/auto-check/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress,
          duration,
          transactionHash: payment.id || 'pending'
        })
      });
      
      const data = await res.json();
      
      if (data.success) {
        alert(`✅ Auto-check enabled for ${duration.replace('-', ' ')}!`);
        window.location.reload();
      } else {
        alert('Payment successful but activation failed. Contact support with ID: ' + payment.id);
      }
    } catch (error: any) {
      console.error('Payment error:', error);
      alert(`Payment failed: ${error.message || 'Unknown error'}`);
    } finally {
      setProcessing(null);
    }
  }
  
  if (participant?.auto_check_enabled && participant?.auto_check_expiry) {
    const expiryDate = new Date(participant.auto_check_expiry);
    const daysRemaining = Math.ceil((expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    
    if (daysRemaining > 0) {
      return (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg p-6">
          <h3 className="text-lg font-bold text-green-900 dark:text-green-100 mb-2">
            ⚡ Auto-Check Active
          </h3>
          <p className="text-sm text-green-700 dark:text-green-300">
            {daysRemaining} days remaining
          </p>
          <p className="text-xs text-green-600 dark:text-green-400 mt-2">
            Expires: {expiryDate.toLocaleDateString()}
          </p>
        </div>
      );
    }
  }
  
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
      <h3 className="text-xl font-bold mb-2">⚡ Never Miss a Check-In</h3>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
        Enable auto-check to automatically earn points every 12 hours.
      </p>
      
      <div className="space-y-3">
        {packages.map((pkg) => (
          <div
            key={pkg.id}
            className={`border rounded-lg p-4 transition-all ${
              pkg.featured
                ? 'border-2 border-[#0052FF] bg-gradient-to-br from-[#0052FF]/5 to-purple-500/5'
                : 'border-gray-200 dark:border-gray-700 hover:border-[#0052FF]'
            }`}
          >
            <div className="flex justify-between items-center mb-3">
              <div>
                <p className={`font-semibold ${pkg.featured ? 'text-[#0052FF]' : ''}`}>
                  {pkg.label}
                </p>
                <p className={`text-sm ${pkg.featured ? 'font-semibold text-[#0052FF]' : 'text-gray-500'}`}>
                  ${pkg.price} USDC
                </p>
              </div>
              <span className={`text-xs px-2 py-1 rounded font-bold ${
                pkg.featured ? 'bg-[#0052FF] text-white' : 'bg-gray-100 dark:bg-gray-700'
              }`}>
                {pkg.savings}
              </span>
            </div>
            
            <button
              onClick={() => handlePayment(pkg.duration, pkg.price)}
              disabled={processing === pkg.id}
              className="w-full bg-[#0052FF] hover:bg-[#0041CC] text-white font-bold py-3 px-4 rounded-lg transition-colors disabled:opacity-50"
            >
              {processing === pkg.id ? 'Processing...' : `Enable ${pkg.label}`}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
