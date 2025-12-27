import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { base } from 'wagmi/chains';
import { http } from 'wagmi';

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'bbf63466212a2abc6e73f67992d3ebbb';

if (!projectId) {
    console.warn('NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID environment variable is not set. WalletConnect will not work.');
}

export const config = getDefaultConfig({
    appName: 'BaseMatch',
    projectId: projectId,
    chains: [base],
    transports: {
        [base.id]: http('https://base-mainnet.g.alchemy.com/v2/eij573azum6O085qLp7TD', {
            batch: true,
            fetchOptions: {
                cache: 'no-store',
            },
            retryCount: 3,
            timeout: 10_000,
        }),
    },
    ssr: true,
});
