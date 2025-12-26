import { Address } from 'viem';

export function buildRegistrationTypedData(params: {
  address: Address;
  nonce: string;
  issuedAt: number;
}) {
  return {
    domain: {
      name: 'BaseMatch',
      version: '1',
      chainId: 8453, // Base Mainnet
    },
    primaryType: 'Registration',
    types: {
      Registration: [
        { name: 'address', type: 'address' },
        { name: 'nonce', type: 'string' },
        { name: 'issuedAt', type: 'uint256' },
      ],
    },
    message: {
      address: params.address,
      nonce: params.nonce,
      issuedAt: BigInt(params.issuedAt),
    },
  } as const;
}
