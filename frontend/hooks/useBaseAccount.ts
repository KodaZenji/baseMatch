import { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';

interface BaseAccountInfo {
  isBaseApp: boolean;
  isSmartWallet: boolean;
  provider: any;
  capabilities?: any;
}

export function useBaseAccount(): BaseAccountInfo {
  const { address } = useAccount();
  const [baseAccountInfo, setBaseAccountInfo] = useState<BaseAccountInfo>({
    isBaseApp: false,
    isSmartWallet: false,
    provider: null,
    capabilities: null,
  });

  useEffect(() => {
    const detectBaseAccount = async () => {
      if (typeof window === 'undefined') return;

      const ethereum = (window as any).ethereum;
      let isBase = false;
      let isSmartWallet = false;
      let capabilities = null;

      // DETECTION METHOD 1: Check for Base Wallet flag
      if (ethereum?.isBaseWallet === true) {
        console.log('✅ Base Wallet detected via isBaseWallet flag');
        isBase = true;
      }

      // DETECTION METHOD 2: Check for Base Account flag
      if (ethereum?.isBaseAccount === true) {
        console.log('✅ Base Account detected via isBaseAccount flag');
        isBase = true;
        isSmartWallet = true;
      }

      // DETECTION METHOD 3: Check window.coinbaseWalletExtension
      if ((window as any).coinbaseWalletExtension) {
        console.log('✅ Coinbase Wallet Extension detected');
        isBase = true;
      }

      // DETECTION METHOD 4: Check user agent
      if (/base/i.test(navigator.userAgent)) {
        console.log('✅ Base detected in user agent');
        isBase = true;
      }

      // DETECTION METHOD 5: Check hostname (for base.org or base mini-apps)
      if (
        window.location.hostname.includes('base.org') || 
        window.location.hostname.includes('base.app')
      ) {
        console.log('✅ Base detected via hostname');
        isBase = true;
      }

      // DETECTION METHOD 6: Check for EIP-5792 wallet capabilities (Base Account)
      if (ethereum?.request) {
        try {
          const walletCapabilities = await ethereum.request({
            method: 'wallet_getCapabilities',
          });
          
          if (walletCapabilities) {
            console.log('✅ Wallet capabilities detected:', walletCapabilities);
            capabilities = walletCapabilities;
            
            // Check if Base chain (8453) has paymasterService (indicator of Base Account)
            if (walletCapabilities['0x2105']?.paymasterService || 
                walletCapabilities['8453']?.paymasterService) {
              console.log('✅ Base Account detected via paymaster capability');
              isBase = true;
              isSmartWallet = true;
            }
          }
        } catch (error) {
          console.log('⚠️ Could not fetch wallet capabilities:', error);
        }
      }

      // DETECTION METHOD 7: Check provider info
      if (ethereum?.isConnected?.()) {
        try {
          const chainId = await ethereum.request({ method: 'eth_chainId' });
          console.log('🔗 Connected to chain:', chainId);
          
          // If already on Base chain, more likely to be Base App
          if (chainId === '0x2105' || chainId === '8453') {
            isBase = true;
          }
        } catch (error) {
          console.log('⚠️ Could not fetch chain ID:', error);
        }
      }

      setBaseAccountInfo({
        isBaseApp: isBase,
        isSmartWallet,
        provider: isBase ? ethereum : null,
        capabilities,
      });

      if (isBase) {
        console.log('🎉 Base Account fully detected!', {
          isSmartWallet,
          hasCapabilities: !!capabilities,
        });
      }
    };

    detectBaseAccount();
  }, [address]);

  return baseAccountInfo;
}
