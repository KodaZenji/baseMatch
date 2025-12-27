'use client';

import { useEffect, useRef } from 'react';
import { useAccount, useConnect } from 'wagmi';

/**
 * Auto-connects Base app users without any clicks
 * Detects Base app browser and connects automatically
 */
export function BaseAppAutoConnect() {
  const { isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const hasAttemptedConnect = useRef(false);

  useEffect(() => {
    // Don't try if already connected or already attempted
    if (isConnected || hasAttemptedConnect.current) return;

    // Check if user is in Base app browser
    const isInBaseApp = typeof window !== 'undefined' && (
      window.navigator.userAgent.toLowerCase().includes('base') ||
      window.navigator.userAgent.toLowerCase().includes('coinbase') ||
      // Check for ethereum provider which indicates Base app
      (window.ethereum && 
        (window.ethereum.isCoinbaseWallet || 
         window.ethereum.isBase))
    );

    console.log('🔍 Base App Detection:', {
      isInBaseApp,
      userAgent: window.navigator.userAgent,
      hasEthereum: !!window.ethereum,
      isCoinbaseWallet: window.ethereum?.isCoinbaseWallet,
    });

    if (isInBaseApp) {
      // Mark that we've attempted connection
      hasAttemptedConnect.current = true;

      // Find the injected connector (Base Account)
      const injectedConnector = connectors.find(
        connector => 
          connector.type === 'injected' || 
          connector.id === 'injected' ||
          connector.id === 'io.metamask' ||
          connector.name.toLowerCase().includes('injected')
      );

      console.log('🔌 Available connectors:', connectors.map(c => ({
        id: c.id,
        name: c.name,
        type: c.type
      })));

      if (injectedConnector) {
        console.log('✅ Auto-connecting to:', injectedConnector.name);
        
        // Wait a bit for everything to load, then connect
        setTimeout(() => {
          connect({ connector: injectedConnector });
        }, 500);
      } else {
        console.warn('⚠️ No injected connector found for Base app');
      }
    }
  }, [isConnected, connect, connectors]);

  // Show a subtle loading indicator while connecting
  if (!isConnected && hasAttemptedConnect.current) {
    return (
      <div className="fixed top-4 right-4 bg-blue-500 text-white px-4 py-2 rounded-lg shadow-lg text-sm animate-pulse z-50">
        🔗 Connecting to Base...
      </div>
    );
  }

  return null;
}
