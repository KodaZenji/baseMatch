import { http, createConfig } from "wagmi";
import { base } from "wagmi/chains";
import { coinbaseWallet, walletConnect, injected } from "wagmi/connectors";

// Get WalletConnect Project ID from environment variables
const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'bbf63466212a2abc6e73f67992d3ebbb';

export const config = createConfig({
  chains: [base],
  connectors: [
    // Injected wallets (MetaMask, Rainbow, etc. browser extensions)
    injected({
      target: 'metaMask',
      shimDisconnect: true,
    }),
    
    // Coinbase Wallet
    coinbaseWallet({
      appName: "BaseMatch",
      preference: "all",
    }),
    
    // WalletConnect - for mobile wallet connections
    walletConnect({
      projectId,
      metadata: {
        name: 'BaseMatch',
        description: 'Find Your Match On-Chain',
        url: 'https://basematch.app',
        icons: ['https://ipfs.filebase.io/ipfs/Qme7TRxxfBP1offBsSsbtNhEbutbEgTmwd16EgHgPZutmw'],
      },
      showQrModal: true,
    }),
  ],
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
  batch: {
    multicall: {
      wait: 16,
    },
  },
  pollingInterval: 4_000,
});
