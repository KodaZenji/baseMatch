'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider } from 'wagmi';
import { RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit';
import { OnchainKitProvider } from '@coinbase/onchainkit';
import { config } from '@/lib/wagmi'; // Ensure this uses 'base' chain
import { base } from 'wagmi/chains';
import { useState, useEffect } from 'react';
import { sdk } from '@farcaster/miniapp-sdk';

import '@rainbow-me/rainbowkit/styles.css';
import '@coinbase/onchainkit/styles.css'; 

const queryClient = new QueryClient();

export function Providers({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    
    const init = async () => {
      try {
        // 🛡️ Step 1: Detect if we are in the Base/Farcaster environment
        const isInMiniApp = await sdk.isInMiniApp();
        
        if (isInMiniApp) {
          // 🛡️ Step 2: Signal "Ready" to the Base App. 
          // If this isn't called, the app will hang on the splash screen 
          // and ignore all user interactions.
          await sdk.actions.ready();
          console.log('✅ Farcaster Mini App SDK Initialized');
        } else {
          console.log('ℹ️ Not running in a Mini App environment');
        }
      } catch (error) {
        console.error('❌ SDK Handshake Error:', error);
      }
    };

    init();
  }, []);

  // Prevent hydration errors by not rendering until mounted
  if (!mounted) return null;

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <OnchainKitProvider 
          chain={base} 
          apiKey={process.env.NEXT_PUBLIC_ONCHAINKIT_API_KEY}
        >
          <RainbowKitProvider 
            initialChain={base} 
            theme={darkTheme({
              accentColor: '#FF1493',
              accentColorForeground: 'white',
              borderRadius: 'large',
            })}
          >
            {children}
          </RainbowKitProvider>
        </OnchainKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
