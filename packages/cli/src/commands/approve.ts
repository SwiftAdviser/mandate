import { z } from 'incur';
import type { CommandDef } from './types.js';

export const approveCommand: CommandDef = {
  description: 'Wait for owner approval on a pending intent',
  args: z.object({
    intentId: z.string().describe('Intent ID awaiting approval'),
  }),
  options: z.object({
    timeout: z.number().optional().describe('Timeout in seconds (default: 3600)'),
  }),
  examples: [
    { args: { intentId: 'uuid-1' }, description: 'Wait for approval' },
  ],
  async run(c: any) {
    const client = c.var.client;
    const timeoutMs = (c.options.timeout ?? 3600) * 1000;

    const status = await client.waitForApproval(c.args.intentId, {
      timeoutMs,
      onPoll: () => {},
    });

    if (status.status === 'approved' || status.status === 'confirmed') {
      return {
        status: 'approved',
        intentId: c.args.intentId,
        feedback: '\u2705 Approved \u2014 ready to broadcast',
        next: `Run: mandate event ${c.args.intentId} --tx-hash 0x...`,
      };
    }

    return {
      status: status.status,
      intentId: c.args.intentId,
      feedback: `Intent ended with status: ${status.status}`,
    };
  },
};
