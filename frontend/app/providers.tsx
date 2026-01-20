'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider } from 'wagmi';
import { RainbowKitProvider, darkTheme, lightTheme } from '@rainbow-me/rainbowkit';
import { OnchainKitProvider } from '@coinbase/onchainkit';
import { ThemeProvider } from 'next-themes';
import { config } from '@/lib/wagmi';
import { base } from 'wagmi/chains';
import { useState, useEffect } from 'react';
import { sdk } from '@farcaster/miniapp-sdk';

import '@rainbow-me/rainbowkit/styles.css';

const queryClient = new QueryClient();

function RainbowKitThemeWrapper({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <>{children}</>;
  }

  // Check current theme from HTML element
  const isDark = document.documentElement.classList.contains('dark');

  return (
    <RainbowKitProvider 
      initialChain={base} 
      theme={isDark ? darkTheme({
        accentColor: '#C11C84',
        accentColorForeground: 'white',
        borderRadius: 'large',
      }) : lightTheme({
        accentColor: '#C11C84',
        accentColorForeground: 'white',
        borderRadius: 'large',
      })}
    >
      {children}
    </RainbowKitProvider>
  );
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    
    const init = async () => {
      try {
        const isInMiniApp = await sdk.isInMiniApp();
        
        if (isInMiniApp) {
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

  if (!mounted) return null;

  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
      <WagmiProvider config={config}>
        <QueryClientProvider client={queryClient}>
          <OnchainKitProvider 
            chain={base} 
            apiKey={process.env.NEXT_PUBLIC_ONCHAINKIT_API_KEY}
          >
            <RainbowKitThemeWrapper>
              {children}
            </RainbowKitThemeWrapper>
          </OnchainKitProvider>
        </QueryClientProvider>
      </WagmiProvider>
    </ThemeProvider>
  );
}
