'use client';

import { useState } from 'react';
import { BasePayButton } from '@base-org/account-ui/react'; // ← ADD /react
import type { PaymentOptions, PaymentResult } from '@base-org/account-ui/react';

interface AutoCheckPurchaseProps {
  walletAddress: string;
  participant: any;
}

export function AutoCheckPurchase({ walletAddress, participant }: AutoCheckPurchaseProps) {
  const [processing, setProcessing] = useState<string | null>(null);
  
  // Your treasury wallet (where payments go)
  const TREASURY_WALLET = process.env.NEXT_PUBLIC_TREASURY_WALLET || '';
  
  const packages = [
    {
      id: '7-days',
      duration: '7-days' as const,
      label: '7 Days',
      price: '0.60',
      savings: '14% off'
    },
    {
      id: '14-days',
      duration: '14-days' as const,
      label: '14 Days',
      price: '1.00',
      savings: '29% off'
    },
    {
      id: '28-days',
      duration: '28-days' as const,
      label: '28 Days',
      price: '1.50',
      savings: '46% off',
      featured: true
    }
  ];
  
  async function recordPurchase(duration: string, transactionHash: string) {
    try {
      const res = await fetch('/api/leaderboard/auto-check/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress,
          duration,
          transactionHash
        })
      });
      
      const data = await res.json();
      
      if (data.success) {
        alert(`✅ Auto-check enabled for ${duration.replace('-', ' ')}!\n\nYou'll never miss a check-in.`);
        window.location.reload();
      } else {
        console.error('Failed to record purchase:', data.error);
        alert('Payment successful but activation failed. Please contact support with transaction ID: ' + transactionHash);
      }
    } catch (error) {
      console.error('Record purchase error:', error);
      alert('Payment successful but activation failed. Please contact support.');
    } finally {
      setProcessing(null);
    }
  }
  
  if (participant?.auto_check_enabled) {
    const expiryDate = new Date(participant.auto_check_expiry);
    const daysRemaining = Math.ceil((expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    
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
  
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
      <h3 className="text-xl font-bold mb-2">⚡ Never Miss a Check-In</h3>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
        Enable auto-check to automatically earn points every 12 hours. Secure payments via USDC on Base.
      </p>
      
      <div className="space-y-3">
        {packages.map((pkg) => {
          const paymentOptions: PaymentOptions = {
            amount: pkg.price,
            to: TREASURY_WALLET,
            testnet: false, // MAINNET (you said it's on mainnet)
          };
          
          return (
            <div
              key={pkg.id}
              className={`border rounded-lg p-4 transition-all ${
                pkg.featured
                  ? 'border-2 border-blue-500 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-blue-500'
              }`}
            >
              <div className="flex justify-between items-center mb-3">
                <div>
                  <p className={`font-semibold ${pkg.featured ? 'text-blue-600 dark:text-blue-400' : ''}`}>
                    {pkg.label}
                  </p>
                  <p className={`text-sm ${pkg.featured ? 'font-semibold text-blue-700 dark:text-blue-300' : 'text-gray-500'}`}>
                    ${pkg.price} USDC
                  </p>
                </div>
                <span className={`text-xs px-2 py-1 rounded font-bold ${
                  pkg.featured
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700'
                }`}>
                  {pkg.savings}
                </span>
              </div>
              
              <BasePayButton
                paymentOptions={paymentOptions}
                colorScheme="light"
                onClick={() => setProcessing(pkg.id)}
                onPaymentResult={(result: PaymentResult) => {
                  if (result.success) {
                    console.log('Payment successful:', result);
                    recordPurchase(pkg.duration, result.transactionHash);
                  } else {
                    console.error('Payment failed:', result.error);
                    setProcessing(null);
                    alert(`Payment failed: ${result.error || 'Unknown error'}`);
                  }
                }}
              />
            </div>
          );
        })}
      </div>
      
      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <p className="text-xs text-gray-500 dark:text-gray-400 text-center mb-2">
           Payments go directly to BaseMatch treasury
        </p>
      
      </div>
    </div>
  );
}
