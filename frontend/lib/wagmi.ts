import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { baseSepolia } from 'wagmi/chains';
import { createPublicClient, http } from 'viem';

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;

if (!projectId) {
    console.warn('NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID environment variable is not set. WalletConnect will not work.');
}

// Use singleton pattern to prevent re-initialization in development mode
let wagmiConfig: ReturnType<typeof getDefaultConfig> | null = null;

export const getConfig = () => {
    if (!wagmiConfig) {
        wagmiConfig = getDefaultConfig({
            appName: 'BaseMatch',
            projectId: projectId || '',
            chains: [baseSepolia],
            ssr: true,
        });
    }
    return wagmiConfig;
};

export const config = getConfig();

// Export a public client for server-side contract reads
export const getPublicClient = () => {
    return createPublicClient({
        chain: baseSepolia,
        transport: http(),
    });
};