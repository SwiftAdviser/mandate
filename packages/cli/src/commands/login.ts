import { z } from 'incur';
import { MandateClient } from '@mandate.md/sdk';
import { saveCredentials } from '../credentials.js';
import type { CommandDef } from './types.js';

export const loginCommand: CommandDef = {
  description: 'Register a new agent and store credentials',
  options: z.object({
    name: z.string().describe('Agent name'),
    address: z.string().optional().describe('EVM address (0x...)'),
    perTxLimit: z.number().optional().describe('Per-transaction USD limit'),
    dailyLimit: z.number().optional().describe('Daily USD limit'),
    baseUrl: z.string().optional().describe('Mandate API base URL'),
    chainId: z.number().optional().describe('Chain ID (default: 84532)'),
  }),
  alias: { perTxLimit: 'p', dailyLimit: 'd' },
  examples: [
    { options: { name: 'MyAgent', address: '0x1234567890abcdef1234567890abcdef12345678' }, description: 'Register with address' },
    { options: { name: 'MyAgent' }, description: 'Register without address (set later via activate)' },
  ],
  async run(c: any) {
    const { name, address, perTxLimit, dailyLimit, baseUrl, chainId } = c.options;

    const defaultPolicy: Record<string, number> = {};
    if (perTxLimit !== undefined) defaultPolicy.spendLimitPerTxUsd = perTxLimit;
    if (dailyLimit !== undefined) defaultPolicy.spendLimitPerDayUsd = dailyLimit;

    const result = await MandateClient.register({
      name,
      evmAddress: (address ?? '0x0000000000000000000000000000000000000000') as `0x${string}`,
      chainId: chainId ?? 84532,
      defaultPolicy: Object.keys(defaultPolicy).length ? defaultPolicy : undefined,
      baseUrl,
    });

    saveCredentials({
      runtimeKey: result.runtimeKey,
      agentId: result.agentId,
      claimUrl: result.claimUrl,
      evmAddress: result.evmAddress,
      chainId: result.chainId,
      baseUrl,
    });

    const masked = result.runtimeKey.slice(0, 14) + '...' + result.runtimeKey.slice(-3);

    return {
      agentId: result.agentId,
      runtimeKey: masked,
      claimUrl: result.claimUrl,
      evmAddress: result.evmAddress || undefined,
      next: 'Run: mandate whoami (verify) or mandate validate (first tx)',
    };
  },
};
