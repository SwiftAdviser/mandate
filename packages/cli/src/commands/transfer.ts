import { z } from 'incur';
import { encodeFunctionData, parseAbi } from 'viem';
import { computeIntentHash } from '@mandate.md/sdk';
import { PolicyBlockedError, RiskBlockedError, ApprovalRequiredError } from '@mandate.md/sdk';
import type { CommandDef } from './types.js';

const erc20Abi = parseAbi(['function transfer(address to, uint256 amount) returns (bool)']);

export const transferCommand: CommandDef = {
  description: 'ERC20 transfer. Default: preflight validation. Use --raw for legacy EVM calldata encoding + raw validation.',
  options: z.object({
    to: z.string().describe('Recipient address (0x...)'),
    amount: z.string().describe('Amount in raw token units'),
    token: z.string().describe('Token symbol or contract address (0x...)'),
    reason: z.string().describe('Why this transfer is being sent'),
    raw: z.boolean().optional().describe('Use raw EVM validation (legacy)'),
    chain: z.string().optional().describe('Chain name or ID (preflight mode)'),
    // Raw-mode options
    chainId: z.number().optional().describe('Chain ID (raw mode, default from credentials)'),
    nonce: z.number().optional().describe('Transaction nonce (raw mode)'),
    gasLimit: z.string().optional().describe('Gas limit (raw mode, default: 65000)'),
    maxFeePerGas: z.string().optional().describe('Max fee per gas in wei (raw mode)'),
    maxPriorityFeePerGas: z.string().optional().describe('Max priority fee per gas in wei (raw mode)'),
  }),
  examples: [
    {
      options: {
        to: '0xAlice',
        amount: '10000000',
        token: 'USDC',
        reason: 'Invoice #127',
      },
      description: 'Preflight transfer (default)',
    },
    {
      options: {
        raw: true,
        to: '0xAlice',
        amount: '10000000',
        token: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
        reason: 'Invoice #127',
        nonce: 42,
        maxFeePerGas: '1000000000',
        maxPriorityFeePerGas: '1000000000',
      },
      description: 'Raw EVM transfer (legacy)',
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
  const payload: Record<string, unknown> = {
    action: 'transfer',
    amount: opts.amount,
    to: opts.to,
    token: opts.token,
    reason: opts.reason,
  };
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
  if (!opts.nonce && opts.nonce !== 0) {
    return { error: 'MISSING_OPTION', message: '--raw requires --nonce' };
  }
  if (!opts.maxFeePerGas || !opts.maxPriorityFeePerGas) {
    return { error: 'MISSING_OPTION', message: '--raw requires --max-fee-per-gas and --max-priority-fee-per-gas' };
  }

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
    const result = await client.rawValidate({
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
      feedback: 'Mandate: policy check passed',
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
