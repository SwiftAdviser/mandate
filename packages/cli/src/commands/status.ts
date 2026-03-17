import { z } from 'incur';
import type { CommandDef } from './types.js';

const CTA: Record<string, string> = {
  reserved: 'Run: mandate event <intentId> --tx-hash 0x...',
  approval_pending: 'Run: mandate approve <intentId>',
  broadcasted: 'Run: mandate status <intentId> (poll again)',
};

export const statusCommand: CommandDef = {
  description: 'Check intent state',
  args: z.object({
    intentId: z.string().describe('Intent ID'),
  }),
  examples: [
    { args: { intentId: 'uuid-1' }, description: 'Check status of an intent' },
  ],
  async run(c: any) {
    const client = c.var.client;
    const status = await client.getStatus(c.args.intentId);

    const result: Record<string, unknown> = { ...status };
    const cta = CTA[status.status];
    if (cta) result.next = cta;

    return result;
  },
};
