'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider } from 'wagmi';
import { RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit';
import { config } from '@/lib/wagmi';
import { validateEnvironment } from '@/lib/validateEnv';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { base } from 'wagmi/chains';
import '@rainbow-me/rainbowkit/styles.css';
import { useState, useEffect } from 'react';
import { sdk } from '@farcaster/miniapp-sdk';

const queryClient = new QueryClient();

export function Providers({ children }: { children: React.ReactNode }) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);

        // Validate environment variables on startup
        const envValidation = validateEnvironment();
        if (!envValidation.isValid) {
            console.error('Critical environment variables missing. Please check your .env.local file.');
        }

        // Initialize Farcaster Mini App SDK
        const initMiniApp = async () => {
            try {
                await sdk.actions.ready();
                console.log('Farcaster Mini App SDK initialized');
                console.log('Expected network: Base Mainnet (Chain ID: 8453)');
            } catch (error) {
                console.error('Failed to initialize Mini App SDK:', error);
            }
        };

        initMiniApp();
    }, []);

    if (!mounted) {
        return null;
    }

    return (
        <ErrorBoundary>
            <WagmiProvider config={config}>
                <QueryClientProvider client={queryClient}>
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
                </QueryClientProvider>
            </WagmiProvider>
        </ErrorBoundary>
    );
}
