import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { base } from 'wagmi/chains';
import { http } from 'wagmi';
import { injected } from 'wagmi/connectors';

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'bbf63466212a2abc6e73f67992d3ebbb';

if (!projectId) {
    console.warn('NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID environment variable is not set.');
}

// Create custom Base Account injected connector for Base app users
const baseAccountConnector = injected({
  shimDisconnect: true,
  target() {
    return {
      id: 'base',
      name: 'Base Account',
      provider: typeof window !== 'undefined' ? window.ethereum : undefined,
    };
  },
});

// Use getDefaultConfig but override connectors to add Base Account first
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

// Add Base Account connector to the beginning of the connectors list
// This ensures it shows up first and gets priority for auto-connect
if (typeof window !== 'undefined') {
  const originalConnectors = config.connectors;
  config.connectors = [baseAccountConnector, ...originalConnectors];
}
