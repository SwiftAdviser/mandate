import { z } from 'incur';
import { computeIntentHash } from '@mandate.md/sdk';
import { PolicyBlockedError, RiskBlockedError, ApprovalRequiredError } from '@mandate.md/sdk';
import type { CommandDef } from './types.js';

export const validateCommand: CommandDef = {
  description: 'Policy-check a transaction (computes intentHash automatically)',
  options: z.object({
    to: z.string().describe('Recipient address (0x...)'),
    calldata: z.string().optional().describe('Transaction calldata (default: 0x)'),
    valueWei: z.string().optional().describe('Value in wei (default: 0)'),
    nonce: z.number().describe('Transaction nonce'),
    gasLimit: z.string().describe('Gas limit'),
    maxFeePerGas: z.string().describe('Max fee per gas (wei)'),
    maxPriorityFeePerGas: z.string().describe('Max priority fee per gas (wei)'),
    chainId: z.number().optional().describe('Chain ID (default from credentials)'),
    txType: z.number().optional().describe('Transaction type (default: 2)'),
    accessList: z.string().optional().describe('Access list JSON string'),
    reason: z.string().describe('Why this transaction is being sent'),
  }),
  examples: [
    {
      options: {
        to: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
        calldata: '0xa9059cbb000000000000000000000000',
        nonce: 42,
        gasLimit: '90000',
        maxFeePerGas: '1000000000',
        maxPriorityFeePerGas: '1000000000',
        reason: 'Invoice #127 from Alice',
      },
      description: 'Validate an ERC20 transfer',
    },
  ],
  async run(c: any) {
    const client = c.var.client;
    const creds = c.var.credentials;
    const opts = c.options;

    const chainId = opts.chainId ?? creds.chainId ?? 84532;
    const calldata = (opts.calldata ?? '0x') as `0x${string}`;
    const valueWei = opts.valueWei ?? '0';
    const txType = opts.txType ?? 2;
    const accessList = opts.accessList ? JSON.parse(opts.accessList) : [];

    const intentHash = computeIntentHash({
      chainId,
      nonce: opts.nonce,
      to: opts.to as `0x${string}`,
      calldata,
      valueWei,
      gasLimit: opts.gasLimit,
      maxFeePerGas: opts.maxFeePerGas,
      maxPriorityFeePerGas: opts.maxPriorityFeePerGas,
      txType,
      accessList,
    });

    try {
      const result = await client.validate({
        chainId,
        nonce: opts.nonce,
        to: opts.to as `0x${string}`,
        calldata,
        valueWei,
        gasLimit: opts.gasLimit,
        maxFeePerGas: opts.maxFeePerGas,
        maxPriorityFeePerGas: opts.maxPriorityFeePerGas,
        txType,
        accessList,
        intentHash,
        reason: opts.reason,
      });

      return {
        ok: true,
        intentId: result.intentId,
        feedback: '\u2705 Mandate: policy check passed',
        next: `Run: mandate event ${result.intentId} --tx-hash 0x...`,
      };
    } catch (err) {
      if (err instanceof PolicyBlockedError || err instanceof RiskBlockedError) {
        return {
          error: 'POLICY_BLOCKED',
          message: `\uD83D\uDEAB Mandate: blocked \u2014 ${err.message}`,
          blockReason: err.blockReason,
        };
      }
      if (err instanceof ApprovalRequiredError) {
        return {
          ok: true,
          requiresApproval: true,
          intentId: err.intentId,
          feedback: '\u23F3 Mandate: approval required \u2014 waiting for owner decision',
          next: `Run: mandate approve ${err.intentId}`,
        };
      }
      throw err;
    }
  },
};
