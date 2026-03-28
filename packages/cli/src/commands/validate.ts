import { z } from 'incur';
import { computeIntentHash } from '@mandate.md/sdk';
import { PolicyBlockedError, RiskBlockedError, ApprovalRequiredError } from '@mandate.md/sdk';
import type { CommandDef } from './types.js';

export const validateCommand: CommandDef = {
  description: 'Policy-check a transaction. Default: preflight (action-based). Use --raw for legacy EVM validation.',
  options: z.object({
    raw: z.boolean().optional().describe('Use raw EVM validation (legacy)'),
    // Preflight options
    action: z.string().optional().describe('Action type (e.g. transfer, swap)'),
    amount: z.string().optional().describe('Amount (human or raw units)'),
    to: z.string().optional().describe('Recipient address (0x...)'),
    token: z.string().optional().describe('Token symbol or contract address'),
    chain: z.string().optional().describe('Chain name or ID'),
    reason: z.string().optional().describe('Why this transaction is being sent'),
    // Raw-mode options
    calldata: z.string().optional().describe('Transaction calldata (raw mode, default: 0x)'),
    valueWei: z.string().optional().describe('Value in wei (raw mode, default: 0)'),
    nonce: z.number().optional().describe('Transaction nonce (raw mode)'),
    gasLimit: z.string().optional().describe('Gas limit (raw mode)'),
    maxFeePerGas: z.string().optional().describe('Max fee per gas in wei (raw mode)'),
    maxPriorityFeePerGas: z.string().optional().describe('Max priority fee per gas in wei (raw mode)'),
    chainId: z.number().optional().describe('Chain ID (raw mode, default from credentials)'),
    txType: z.number().optional().describe('Transaction type (raw mode, default: 2)'),
    accessList: z.string().optional().describe('Access list JSON string (raw mode)'),
  }),
  examples: [
    {
      options: {
        action: 'transfer',
        amount: '10',
        to: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
        token: 'USDC',
        reason: 'Invoice #42',
      },
      description: 'Preflight validate a transfer (default)',
    },
    {
      options: {
        raw: true,
        to: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
        calldata: '0xa9059cbb000000000000000000000000',
        nonce: 42,
        gasLimit: '90000',
        maxFeePerGas: '1000000000',
        maxPriorityFeePerGas: '1000000000',
        reason: 'Invoice #127 from Alice',
      },
      description: 'Raw EVM validate (legacy)',
    },
  ],
  async run(c: any) {
    const client = c.var.client;
    const creds = c.var.credentials;
    const opts = c.options;

    if (opts.raw) {
      return runRaw(client, creds, opts);
    }
    return runPreflight(client, opts);
  },
};

async function runPreflight(client: any, opts: any) {
  // action and reason are required for preflight
  if (!opts.action) {
    return { error: 'MISSING_OPTION', message: '--action is required for preflight validation' };
  }
  if (!opts.reason) {
    return { error: 'MISSING_OPTION', message: '--reason is required for validation' };
  }

  const payload: Record<string, unknown> = {
    action: opts.action,
    reason: opts.reason,
  };
  if (opts.amount) payload.amount = opts.amount;
  if (opts.to) payload.to = opts.to;
  if (opts.token) payload.token = opts.token;
  if (opts.chain) payload.chain = opts.chain;

  try {
    const result = await client.validate(payload);

    return {
      ok: true,
      intentId: result.intentId,
      feedback: 'Mandate: policy check passed',
    };
  } catch (err) {
    return handleError(err);
  }
}

async function runRaw(client: any, creds: any, opts: any) {
  if (!opts.reason) {
    return { error: 'MISSING_OPTION', message: '--reason is required for validation' };
  }
  if (!opts.to || opts.nonce == null || !opts.gasLimit || !opts.maxFeePerGas || !opts.maxPriorityFeePerGas) {
    return { error: 'MISSING_OPTION', message: '--raw requires: --to, --nonce, --gas-limit, --max-fee-per-gas, --max-priority-fee-per-gas' };
  }

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
    const result = await client.rawValidate({
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
      feedback: 'Mandate: policy check passed',
      next: `Run: mandate event ${result.intentId} --tx-hash 0x...`,
    };
  } catch (err) {
    return handleError(err);
  }
}

function handleError(err: unknown) {
  if (err instanceof PolicyBlockedError || err instanceof RiskBlockedError) {
    return {
      error: 'POLICY_BLOCKED',
      message: `Mandate: blocked: ${err.message}`,
      blockReason: err.blockReason,
    };
  }
  if (err instanceof ApprovalRequiredError) {
    return {
      ok: true,
      requiresApproval: true,
      intentId: err.intentId,
      feedback: 'Mandate: approval required, waiting for owner decision',
      next: `Run: mandate approve ${err.intentId}`,
    };
  }
  throw err;
}
