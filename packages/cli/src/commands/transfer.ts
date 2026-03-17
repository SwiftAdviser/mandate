import { z } from 'incur';
import { encodeFunctionData, parseAbi } from 'viem';
import { computeIntentHash } from '@mandate.md/sdk';
import { PolicyBlockedError, RiskBlockedError, ApprovalRequiredError } from '@mandate.md/sdk';
import type { CommandDef } from './types.js';

const erc20Abi = parseAbi(['function transfer(address to, uint256 amount) returns (bool)']);

export const transferCommand: CommandDef = {
  description: 'ERC20 transfer with automatic calldata encoding and validation',
  options: z.object({
    to: z.string().describe('Recipient address (0x...)'),
    amount: z.string().describe('Amount in raw token units'),
    token: z.string().describe('ERC20 token contract address (0x...)'),
    reason: z.string().describe('Why this transfer is being sent'),
    chainId: z.number().optional().describe('Chain ID (default from credentials)'),
    nonce: z.number().describe('Transaction nonce'),
    gasLimit: z.string().optional().describe('Gas limit (default: 65000)'),
    maxFeePerGas: z.string().describe('Max fee per gas (wei)'),
    maxPriorityFeePerGas: z.string().describe('Max priority fee per gas (wei)'),
  }),
  examples: [
    {
      options: {
        to: '0xAlice',
        amount: '10000000',
        token: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
        reason: 'Invoice #127',
        nonce: 42,
        maxFeePerGas: '1000000000',
        maxPriorityFeePerGas: '1000000000',
      },
      description: 'Transfer 10 USDC',
    },
  ],
  async run(c: any) {
    const client = c.var.client;
    const creds = c.var.credentials;
    const opts = c.options;

    const chainId = opts.chainId ?? creds.chainId ?? 84532;
    const gasLimit = opts.gasLimit ?? '65000';

    const calldata = encodeFunctionData({
      abi: erc20Abi,
      functionName: 'transfer',
      args: [opts.to as `0x${string}`, BigInt(opts.amount)],
    });

    const intentHash = computeIntentHash({
      chainId,
      nonce: opts.nonce,
      to: opts.token as `0x${string}`,
      calldata,
      valueWei: '0',
      gasLimit,
      maxFeePerGas: opts.maxFeePerGas,
      maxPriorityFeePerGas: opts.maxPriorityFeePerGas,
    });

    try {
      const result = await client.validate({
        chainId,
        nonce: opts.nonce,
        to: opts.token as `0x${string}`,
        calldata,
        valueWei: '0',
        gasLimit,
        maxFeePerGas: opts.maxFeePerGas,
        maxPriorityFeePerGas: opts.maxPriorityFeePerGas,
        intentHash,
        reason: opts.reason,
      });

      return {
        ok: true,
        intentId: result.intentId,
        feedback: '\u2705 Mandate: policy check passed',
        unsignedTx: {
          to: opts.token,
          calldata,
          value: '0',
          gasLimit,
          maxFeePerGas: opts.maxFeePerGas,
          maxPriorityFeePerGas: opts.maxPriorityFeePerGas,
          nonce: opts.nonce,
          chainId,
        },
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
