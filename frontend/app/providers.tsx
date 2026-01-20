'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider } from 'wagmi';
import { RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit';
import { OnchainKitProvider } from '@coinbase/onchainkit';
import { config } from '@/lib/wagmi';
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
        // Version 0.2.1 Handshake
        const isInMiniApp = await sdk.isInMiniApp();
        if (isInMiniApp) {
          // Unlocks the UI and clears the splash screen
          await sdk.actions.ready();
          console.log('✅ BaseMatch Mini App SDK Handshake Complete (v0.2.1)');
        }
      } catch (error) {
        console.error('❌ SDK Initialization Failed:', error);
      }
    };
    init();
  }, []);

  if (!mounted) return null;

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <OnchainKitProvider chain={base}>
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
