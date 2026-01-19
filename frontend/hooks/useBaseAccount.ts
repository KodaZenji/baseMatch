import { useEffect, useState } from 'react';
import { useAccount, useConnectorClient } from 'wagmi';

interface BaseAccountInfo {
  isBaseApp: boolean;
  isSmartWallet: boolean;
  provider: any;
  capabilities?: any;
}

export function useBaseAccount(): BaseAccountInfo {
  const { address, connector } = useAccount();
  const { data: connectorClient } = useConnectorClient();
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

      // METHOD 1: Check Coinbase Smart Wallet connector
      if (connector) {
        const connectorId = connector.id?.toLowerCase() || '';
        const connectorName = connector.name?.toLowerCase() || '';
        
        if (connectorId.includes('coinbasewallet') || 
            connectorId.includes('coinbase') ||
            connectorName.includes('coinbase smart wallet') ||
            connectorName.includes('smart wallet')) {
          console.log('✅ Coinbase Smart Wallet detected via connector');
          isBase = true;
          isSmartWallet = true;
        }
      }

      // METHOD 2: Check for Coinbase Wallet flags
      if (ethereum?.isCoinbaseWallet === true) {
        console.log('✅ Coinbase Wallet detected via isCoinbaseWallet flag');
        isBase = true;
      }

      // METHOD 3: Check window.coinbaseWalletExtension
      if ((window as any).coinbaseWalletExtension) {
        console.log('✅ Coinbase Wallet Extension detected');
        isBase = true;
      }

      // METHOD 4: EIP-5792 Wallet Capabilities (Smart Wallet detection)
      if (ethereum?.request) {
        try {
          const walletCapabilities = await ethereum.request({
            method: 'wallet_getCapabilities',
            params: [address],
          });
          
          if (walletCapabilities) {
            console.log('✅ Wallet capabilities detected:', walletCapabilities);
            capabilities = walletCapabilities;
            
            // Check Base mainnet (8453) or testnet (84532) for paymaster capabilities
            const baseMainnet = walletCapabilities['0x2105'] || walletCapabilities['8453'];
            const baseTestnet = walletCapabilities['0x14a34'] || walletCapabilities['84532'];
            
            if (baseMainnet?.paymasterService || baseTestnet?.paymasterService) {
              console.log('✅ Smart Wallet detected via EIP-5792 paymaster capability');
              isBase = true;
              isSmartWallet = true;
            }

            // Check for atomicBatch capability (ERC-4337 indicator)
            if (baseMainnet?.atomicBatch?.supported || baseTestnet?.atomicBatch?.supported) {
              console.log('✅ Smart Wallet detected via atomicBatch capability');
              isSmartWallet = true;
            }
          }
        } catch (error) {
          console.log('⚠️ Could not fetch wallet capabilities:', error);
        }
      }

      // METHOD 5: Check for Base app environment
      if (/base/i.test(navigator.userAgent) || 
          window.location.hostname.includes('base.org') ||
          window.location.hostname.includes('wallet.coinbase.com')) {
        console.log('✅ Base environment detected');
        isBase = true;
      }

      // METHOD 6: Check current chain
      if (ethereum?.request) {
        try {
          const chainId = await ethereum.request({ method: 'eth_chainId' });
          const chainIdNum = parseInt(chainId, 16);
          
          // Base mainnet (8453) or Base Sepolia (84532)
          if (chainIdNum === 8453 || chainIdNum === 84532) {
            console.log('🔗 Connected to Base chain:', chainIdNum);
            isBase = true;
          }
        } catch (error) {
          console.log('⚠️ Could not fetch chain ID:', error);
        }
      }

      // METHOD 7: Check for Smart Wallet via connector client
      if (connectorClient && isBase) {
        try {
          // Check if the account is a contract (Smart Wallet)
          const code = await connectorClient.getBytecode({ address: address as `0x${string}` });
          if (code && code !== '0x') {
            console.log('✅ Smart Wallet detected via bytecode check');
            isSmartWallet = true;
          }
        } catch (error) {
          console.log('⚠️ Could not check bytecode:', error);
        }
      }

      setBaseAccountInfo({
        isBaseApp: isBase,
        isSmartWallet,
        provider: isBase ? ethereum : null,
        capabilities,
      });

      if (isBase) {
        console.log('🎉 Base Account detection complete:', {
          isSmartWallet,
          hasCapabilities: !!capabilities,
          hasBatchSupport: capabilities?.['8453']?.atomicBatch?.supported || 
                          capabilities?.['0x2105']?.atomicBatch?.supported,
          hasPaymaster: capabilities?.['8453']?.paymasterService || 
                       capabilities?.['0x2105']?.paymasterService,
        });
      }
    };

    if (address) {
      detectBaseAccount();
    }
  }, [address, connector, connectorClient]);

  return baseAccountInfo;
}
