import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { baseSepolia } from 'wagmi/chains';

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;

if (!projectId) {
    console.warn('NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID environment variable is not set. WalletConnect will not work.');
}

export const config = getDefaultConfig({
    appName: 'BaseMatch',
    projectId: projectId || '',
    chains: [baseSepolia],
    ssr: true,
});