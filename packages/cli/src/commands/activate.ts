import { z } from 'incur';
import { updateCredentials } from '../credentials.js';
import type { CommandDef } from './types.js';

export const activateCommand: CommandDef = {
  description: 'Set EVM address after registration',
  args: z.object({
    address: z.string().describe('EVM address (0x...)'),
  }),
  examples: [
    { args: { address: '0x1234567890abcdef1234567890abcdef12345678' }, description: 'Set wallet address' },
  ],
  async run(c: any) {
    const { address } = c.args;
    const client = c.var.client;

    const res = await fetch(`${c.var.credentials.baseUrl ?? 'https://app.mandate.md'}/api/activate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${c.var.credentials.runtimeKey}`,
      },
      body: JSON.stringify({ evmAddress: address }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return c.error({ code: 'ACTIVATE_FAILED', message: data.message ?? 'Activation failed' });
    }

    const data = await res.json();
    updateCredentials({ evmAddress: data.evmAddress });

    return {
      activated: true,
      evmAddress: data.evmAddress,
      onboardingUrl: data.onboardingUrl,
      next: 'Run: mandate validate (start validating transactions)',
    };
  },
};
