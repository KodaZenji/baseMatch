import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { base } from 'wagmi/chains';
import { http } from 'wagmi';

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'bbf63466212a2abc6e73f67992d3ebbb';

if (!projectId) {
    console.warn('NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID environment variable is not set.');
}

// Hardcoded Alchemy RPC URL (required for client-side wagmi)
// This is safe to expose as it's rate-limited and app-specific
const alchemyRpcUrl = 'https://base-mainnet.g.alchemy.com/v2/eij573azum6O085qLp7TD';

// Use getDefaultConfig - it automatically includes all wallets
export const config = getDefaultConfig({
  appName: 'BaseMatch',
  projectId: projectId,
  chains: [base],
  transports: {
    [base.id]: http(alchemyRpcUrl, {
      batch: {
        batchSize: 1024, // Larger batch size
        wait: 50, // Wait 50ms to batch requests together
      },
      fetchOptions: {
        cache: 'no-store',
      },
      retryCount: 5, // Increased from 3 for better reliability
      retryDelay: 150, // Add retry delay
      timeout: 15_000, // Increased timeout for slower networks
    }),
  },
  ssr: true,
});

// getDefaultConfig automatically includes:
// - Injected wallets (MetaMask, Base Account in Base app)
// - Coinbase Wallet  
// - WalletConnect
// - Rainbow, Trust, Ledger, and 50+ more wallets
