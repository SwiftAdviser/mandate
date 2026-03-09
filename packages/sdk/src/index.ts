/**
 * @mandate/sdk
 *
 * Non-custodial policy layer for agent wallets.
 * Works on top of AgentKit, GOAT SDK, Privy, or any viem signer.
 *
 * @example
 * import { MandateWallet, MandateClient } from '@mandate/sdk';
 *
 * // High-level: handles validate → sign → broadcast → confirm
 * const wallet = new MandateWallet({
 *   runtimeKey: process.env.MANDATE_RUNTIME_KEY!,
 *   privateKey:  process.env.AGENT_PRIVATE_KEY! as `0x${string}`,
 *   chainId: 84532, // Base Sepolia
 * });
 *
 * // ERC20 transfer with policy enforcement
 * const { txHash, status } = await wallet.transfer(
 *   '0xRecipient',
 *   '5000000', // 5 USDC (6 decimals)
 *   '0x036CbD53842c5426634e7929541eC2318f3dCF7e', // USDC Base Sepolia
 * );
 *
 * // x402 payment
 * const response = await wallet.x402Pay('https://api.example.com/search');
 */

export { MandateWallet }    from './MandateWallet.js';
export { MandateClient }    from './MandateClient.js';
export { computeIntentHash } from './intentHash.js';
export {
  MandateError,
  CircuitBreakerError,
  PolicyBlockedError,
  ApprovalRequiredError,
} from './types.js';
export type {
  MandateConfig,
  IntentPayload,
  ValidateResult,
  IntentStatus,
  RegisterResult,
} from './types.js';

// Convenience constants
export const USDC = {
  BASE_SEPOLIA: '0x036CbD53842c5426634e7929541eC2318f3dCF7e' as `0x${string}`,
  BASE_MAINNET: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' as `0x${string}`,
} as const;

export const CHAIN_ID = {
  BASE_SEPOLIA: 84532,
  BASE_MAINNET: 8453,
} as const;
