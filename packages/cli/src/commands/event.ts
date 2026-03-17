import { z } from 'incur';
import type { CommandDef } from './types.js';

export const eventCommand: CommandDef = {
  description: 'Post txHash after signing and broadcasting',
  args: z.object({
    intentId: z.string().describe('Intent ID from validate'),
  }),
  options: z.object({
    txHash: z.string().describe('Transaction hash (0x...)'),
  }),
  examples: [
    { args: { intentId: 'uuid-1' }, options: { txHash: '0xabc123' }, description: 'Post transaction hash' },
  ],
  async run(c: any) {
    const client = c.var.client;
    await client.postEvent(c.args.intentId, c.options.txHash as `0x${string}`);

    return {
      posted: true,
      intentId: c.args.intentId,
      next: `Run: mandate status ${c.args.intentId}`,
    };
  },
};
