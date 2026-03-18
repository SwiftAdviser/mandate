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
export { MandateWallet as MandateGuard } from './MandateWallet.js';
export type { MandateWalletConfig, TransferResult } from './MandateWallet.js';
export { MandateClient }    from './MandateClient.js';
export { computeIntentHash } from './intentHash.js';
export {
  MandateError,
  CircuitBreakerError,
  PolicyBlockedError,
  MandateBlockedError,
  ApprovalRequiredError,
  RiskBlockedError,
} from './types.js';
export type {
  MandateConfig,
  IntentPayload,
  ValidateResult,
  IntentStatus,
  RegisterResult,
  ExternalSigner,
} from './types.js';

// Convenience constants
export const USDC = {
  ETH_MAINNET:  '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' as `0x${string}`,
  ETH_SEPOLIA:  '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238' as `0x${string}`,
  BASE_MAINNET: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' as `0x${string}`,
  BASE_SEPOLIA: '0x036CbD53842c5426634e7929541eC2318f3dCF7e' as `0x${string}`,
} as const;

export const CHAIN_ID = {
  ETH_MAINNET:  1,
  ETH_SEPOLIA:  11155111,
  BASE_MAINNET: 8453,
  BASE_SEPOLIA: 84532,
} as const;
