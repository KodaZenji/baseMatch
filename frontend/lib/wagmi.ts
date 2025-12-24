import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { baseSepolia, base } from 'wagmi/chains';

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;

if (!projectId) {
    console.warn('NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID environment variable is not set. WalletConnect will not work.');
}

// Check if we're in mainnet mode
const isMainnet = process.env.NEXT_PUBLIC_ENABLE_MAINNET === 'true';

// Use singleton pattern to prevent re-initialization in development mode
let wagmiConfig: ReturnType<typeof getDefaultConfig> | null = null;

export const getConfig = () => {
    if (!wagmiConfig) {
        wagmiConfig = getDefaultConfig({
            appName: 'BaseMatch',
            projectId: projectId || '',
            chains: isMainnet ? [base] : [baseSepolia],
            ssr: true,
        });
    }
    return wagmiConfig;
};

export const config = getConfig();