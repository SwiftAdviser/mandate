import { z } from 'incur';
import { updateCredentials } from '../credentials.js';
import type { CommandDef } from './types.js';

export const activateCommand: CommandDef = {
  description: 'Set wallet address after registration',
  args: z.object({
    address: z.string().describe('Wallet address (EVM 0x..., Solana base58, or TON)'),
  }),
  examples: [
    { args: { address: '0x1234567890abcdef1234567890abcdef12345678' }, description: 'Set EVM wallet address' },
    { args: { address: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU' }, description: 'Set Solana wallet address' },
  ],
  async run(c: any) {
    const { address } = c.args;

    const res = await fetch(`${c.var.credentials.baseUrl ?? 'https://app.mandate.md'}/api/activate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${c.var.credentials.runtimeKey}`,
      },
      body: JSON.stringify({ walletAddress: address }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return c.error({ code: 'ACTIVATE_FAILED', message: data.message ?? 'Activation failed' });
    }

    const data = await res.json();
    updateCredentials({ walletAddress: data.walletAddress, evmAddress: data.evmAddress });

    return {
      activated: true,
      walletAddress: data.walletAddress,
      onboardingUrl: data.onboardingUrl,
      next: 'Run: mandate validate (start validating transactions)',
    };
  },
};
