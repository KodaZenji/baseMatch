import { http, createConfig } from "wagmi";
import { base } from "wagmi/chains";
import { coinbaseWallet } from "wagmi/connectors";

export const config = createConfig({
  chains: [base],
  connectors: [
    coinbaseWallet({
      appName: "BaseMatch",
      preference: "all",
    }),
  ],
  transports: {
    [base.id]: http('https://base-mainnet.g.alchemy.com/v2/eij573azum6O085qLp7TD', {
      batch: true, // Batches multiple requests together
      fetchOptions: {
        cache: 'no-store', // Always get fresh data
      },
      retryCount: 3, // Retry failed requests
      timeout: 10_000, // 10 second timeout
    }),
  },
  // Enable these for max performance
  batch: {
    multicall: {
      wait: 16, // Batch calls every 16ms (1 frame at 60fps)
    },
  },
  pollingInterval: 4_000, // Check for updates every 4 seconds
});
