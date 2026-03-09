import { keccak256, toHex, encodePacked } from 'viem';

export interface HashInput {
  chainId: number;
  nonce: number;
  to: `0x${string}`;
  calldata: `0x${string}`;
  valueWei: string;
  gasLimit: string;
  maxFeePerGas: string;
  maxPriorityFeePerGas: string;
  txType?: number;
  accessList?: unknown[];
}

/**
 * Compute the Mandate intentHash.
 * Must match PolicyEngineService::computeIntentHash() on the server.
 */
export function computeIntentHash(input: HashInput): `0x${string}` {
  const packed = [
    String(input.chainId),
    String(input.nonce),
    input.to.toLowerCase(),
    (input.calldata ?? '0x').toLowerCase(),
    input.valueWei ?? '0',
    input.gasLimit,
    input.maxFeePerGas,
    input.maxPriorityFeePerGas,
    String(input.txType ?? 2),
    JSON.stringify(input.accessList ?? []),
  ].join('|');

  // keccak256 of UTF-8 encoded canonical string
  const bytes = new TextEncoder().encode(packed);
  return keccak256(bytes as `0x${string}`);
}
