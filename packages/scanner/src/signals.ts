import { createPublicClient, http } from 'viem';
import { base, mainnet } from 'viem/chains';
import type { ScoredAgent } from './scoring.js';

const clients = {
  base:    createPublicClient({ chain: base,    transport: http('https://mainnet.base.org') }),
  mainnet: createPublicClient({ chain: mainnet, transport: http('https://eth.llamarpc.com') }),
};

/** Detect if address is a smart contract (service) or EOA (agent wallet) */
export async function detectType(
  address: string,
  chain: 'base' | 'mainnet',
): Promise<ScoredAgent['type']> {
  try {
    const client = clients[chain];
    const code   = await client.getCode({ address: address as `0x${string}` });
    return code && code !== '0x' ? 'service_contract' : 'eoa_agent';
  } catch {
    return 'unknown';
  }
}

/** Naive framework hint based on type and registration status */
export function inferFramework(
  type:         ScoredAgent['type'],
  isRegistered: boolean,
): string {
  if (isRegistered)             return 'registered';
  if (type === 'service_contract') return 'service_contract';
  return 'unknown';
}
