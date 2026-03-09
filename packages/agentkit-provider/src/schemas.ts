import { z } from 'zod';

export const TransferSchema = z.object({
  to: z.string().describe('Recipient EVM address (0x...)'),
  amount: z.string().describe('Token amount in smallest unit (e.g., "1000000" for 1 USDC with 6 decimals)'),
  tokenAddress: z.string().describe('ERC20 token contract address (0x...)'),
  waitForConfirmation: z.boolean().optional().describe('Whether to wait for on-chain confirmation (default: true)'),
});

export const X402PaySchema = z.object({
  url: z.string().url().describe('URL of the x402-gated resource to pay for'),
  headers: z.record(z.string()).optional().describe('Optional extra request headers'),
});

export const GetPolicySchema = z.object({});

export const GetQuotaSchema = z.object({});

export type TransferInput = z.infer<typeof TransferSchema>;
export type X402PayInput = z.infer<typeof X402PaySchema>;
