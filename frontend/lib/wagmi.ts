import { http, createConfig } from "wagmi";
import { base } from "wagmi/chains";
import { injected, coinbaseWallet, walletConnect } from "wagmi/connectors";

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'bbf63466212a2abc6e73f67992d3ebbb';

if (!projectId) {
    console.warn('NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID environment variable is not set.');
}

// Create custom Base Account connector
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

// Create Coinbase Wallet connector
const coinbaseConnector = coinbaseWallet({
  appName: "BaseMatch",
  preference: "all",
});

// Create WalletConnect connector
const walletConnectConnector = walletConnect({
  projectId,
  metadata: {
    name: 'BaseMatch',
    description: 'Find Your Match On-Chain',
    url: 'https://basematch.app',
    icons: ['https://ipfs.filebase.io/ipfs/Qme7TRxxfBP1offBsSsbtNhEbutbEgTmwd16EgHgPZutmw'],
  },
  showQrModal: true,
});

// Create MetaMask/generic injected connector
const injectedConnector = injected({
  shimDisconnect: true,
});

export const config = createConfig({
  chains: [base],
  connectors: [
    baseAccountConnector,    // Base Account FIRST for Base app users
    coinbaseConnector,       // Coinbase Wallet
    walletConnectConnector,  // WalletConnect (50+ wallets)
    injectedConnector,       // MetaMask and other browser wallets
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
