/**
 * Integration tests for openclaw-plugin + real @mandate.md/sdk.
 *
 * Mocks ONLY the network layer (global fetch). Real SDK classes, real viem
 * encodeFunctionData, real computeIntentHash all run end-to-end.
 * This catches constructor mismatches, instanceof failures, and error chain
 * breaks that unit tests with mocked SDK miss.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock fs so keyStore doesn't touch real disk
vi.mock('node:fs', () => ({
  existsSync: vi.fn().mockReturnValue(false),
  mkdirSync: vi.fn(),
  readFileSync: vi.fn().mockReturnValue(''),
  writeFileSync: vi.fn(),
}));

import { transferTool } from '../tools/transferTool.js';
import { x402Tool } from '../tools/x402Tool.js';
import { sendEthTool } from '../tools/sendEthTool.js';
import { PolicyBlockedError, CircuitBreakerError, ApprovalRequiredError } from '@mandate.md/sdk';
import mandatePlugin from '../plugin.js';

const RECIPIENT = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045';
const USDC_BASE_SEPOLIA = '0x036CbD53842c5426634e7929541eC2318f3dCF7e';

const CONTEXT = {
  runtimeKey: 'mndt_test_integration',
  privateKey: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
  chainId: 84532,
};

type ApiScenario = 'allowed' | 'blocked' | 'approval' | 'circuit_breaker';

function createFetchMock(apiScenario: ApiScenario) {
  let x402ProbeCount = 0;

  return vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input.toString();
    const body = init?.body ? JSON.parse(init.body as string) : null;

    // --- JSON-RPC calls (viem HTTP transport) ---
    if (body?.method) {
      const rpcResult = handleJsonRpc(body.method, body.params);
      return new Response(JSON.stringify({ jsonrpc: '2.0', id: body.id, result: rpcResult }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // --- Mandate API: /api/validate ---
    if (url.includes('/api/validate')) {
      return handleValidate(apiScenario);
    }

    // --- Mandate API: /api/intents/.../events ---
    if (url.match(/\/api\/intents\/[^/]+\/events/)) {
      return new Response(JSON.stringify({ status: 'broadcasted' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // --- Mandate API: /api/intents/.../status ---
    if (url.match(/\/api\/intents\/[^/]+\/status/)) {
      return new Response(JSON.stringify({
        intentId: 'intent-integ-1', status: 'confirmed', txHash: '0xabc123',
        blockNumber: '100', gasUsed: '50000', amountUsd: '10.00',
        decodedAction: 'transfer', summary: null, blockReason: null,
        requiresApproval: false, approvalId: null, expiresAt: null,
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    // --- x402 probe/final ---
    x402ProbeCount++;
    if (x402ProbeCount % 2 === 1) {
      // Probe → 402
      return new Response('Payment Required', {
        status: 402,
        headers: {
          'Content-Type': 'text/plain',
          'X-Payment-Required': JSON.stringify({
            amount: '1000000', currency: 'USDC',
            paymentAddress: RECIPIENT as `0x${string}`,
            chainId: 84532,
            tokenAddress: USDC_BASE_SEPOLIA,
          }),
        },
      });
    }
    // Final → 200
    return new Response(JSON.stringify({ data: 'paid content' }), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    });
  }) as unknown as typeof fetch;
}

function handleJsonRpc(method: string, _params: unknown[]): unknown {
  switch (method) {
    case 'eth_getTransactionCount':
      return '0x0'; // nonce 0
    case 'eth_maxPriorityFeePerGas':
      return '0x3b9aca00'; // 1 gwei
    case 'eth_gasPrice':
      return '0x3b9aca00';
    case 'eth_estimateGas':
      return '0x186a0'; // 100000
    case 'eth_getBlockByNumber':
      return { baseFeePerGas: '0x3b9aca00', number: '0x1' };
    case 'eth_sendRawTransaction':
      return '0xabc123abc123abc123abc123abc123abc123abc123abc123abc123abc123abc1';
    case 'eth_chainId':
      return '0x14a34'; // 84532
    default:
      return '0x0';
  }
}

function handleValidate(scenario: ApiScenario): Response {
  switch (scenario) {
    case 'allowed':
      return new Response(JSON.stringify({
        allowed: true, intentId: 'intent-integ-1', requiresApproval: false,
        approvalId: null, blockReason: null,
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });

    case 'blocked':
      return new Response(JSON.stringify({
        allowed: false, blockReason: 'per_tx_limit_exceeded',
        blockDetail: '$10.00 exceeds $1/tx limit',
        declineMessage: 'This transaction exceeds the per-transaction spending limit. You can split into smaller amounts.',
      }), { status: 422, headers: { 'Content-Type': 'application/json' } });

    case 'approval':
      return new Response(JSON.stringify({
        allowed: true, intentId: 'intent-integ-2', requiresApproval: true,
        approvalId: 'approval-integ-1', blockReason: null,
        approvalReason: 'Transaction amount exceeds the approval threshold set by the wallet owner. Please wait — the wallet owner has been notified and will review shortly.',
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });

    case 'circuit_breaker':
      return new Response(JSON.stringify({ error: 'Circuit breaker active' }), {
        status: 403, headers: { 'Content-Type': 'application/json' },
      });
  }
}

beforeEach(() => {
  vi.unstubAllGlobals();
});

// ── Transfer Tool ────────────────────────────────────────────────────────────

describe('integration: transfer tool + real SDK', () => {
  it('transfer allowed — end-to-end success', async () => {
    vi.stubGlobal('fetch', createFetchMock('allowed'));

    const result = await transferTool.execute(
      { to: RECIPIENT, amount: '1000000', tokenAddress: USDC_BASE_SEPOLIA },
      CONTEXT,
    );

    expect(result.success).toBe(true);
    expect(result.intentId).toBe('intent-integ-1');
    expect(result.txHash).toBeDefined();
  });

  it('transfer policy blocked — declineMessage propagates end-to-end', async () => {
    vi.stubGlobal('fetch', createFetchMock('blocked'));

    const result = await transferTool.execute(
      { to: RECIPIENT, amount: '100000000', tokenAddress: USDC_BASE_SEPOLIA },
      CONTEXT,
    );

    expect(result.success).toBe(false);
    expect(result.blocked).toBe(true);
    expect(result.reason).toBe('per_tx_limit_exceeded');
    expect(result.declineMessage).toContain('per-transaction spending limit');
  });

  it('transfer approval required — returns requiresApproval', async () => {
    vi.stubGlobal('fetch', createFetchMock('approval'));

    const result = await transferTool.execute(
      { to: RECIPIENT, amount: '5000000', tokenAddress: USDC_BASE_SEPOLIA },
      CONTEXT,
    );

    expect(result.success).toBe(false);
    expect(result.requiresApproval).toBe(true);
    expect(result.intentId).toBe('intent-integ-2');
    expect(result.approvalReason).toContain('approval threshold');
  });

  it('transfer circuit breaker — throws CircuitBreakerError (not caught by plugin)', async () => {
    vi.stubGlobal('fetch', createFetchMock('circuit_breaker'));

    await expect(
      transferTool.execute(
        { to: RECIPIENT, amount: '1000000', tokenAddress: USDC_BASE_SEPOLIA },
        CONTEXT,
      ),
    ).rejects.toThrow(CircuitBreakerError);
  });
});

// ── x402 Tool ────────────────────────────────────────────────────────────────

describe('integration: x402 tool + real SDK', () => {
  it('x402 allowed — end-to-end success', async () => {
    vi.stubGlobal('fetch', createFetchMock('allowed'));

    const result = await x402Tool.execute(
      { url: 'https://example.com/paid-resource' },
      CONTEXT,
    );

    expect(result.success).toBe(true);
    expect(result.status).toBe(200);
  });

  it('x402 blocked — returns blocked with declineMessage', async () => {
    vi.stubGlobal('fetch', createFetchMock('blocked'));

    const result = await x402Tool.execute(
      { url: 'https://example.com/paid-resource' },
      CONTEXT,
    );

    expect(result.success).toBe(false);
    expect(result.blocked).toBe(true);
    expect(result.declineMessage).toContain('per-transaction spending limit');
  });
});

// ── sendEth Tool ─────────────────────────────────────────────────────────────

describe('integration: sendEth tool + real SDK', () => {
  it('sendEth allowed — end-to-end success', async () => {
    vi.stubGlobal('fetch', createFetchMock('allowed'));

    const result = await sendEthTool.execute(
      { to: RECIPIENT, valueWei: '1000000000000000000' },
      CONTEXT,
    );

    expect(result.success).toBe(true);
    expect(result.txHash).toBeDefined();
  });

  it('sendEth blocked — returns blocked with declineMessage', async () => {
    vi.stubGlobal('fetch', createFetchMock('blocked'));

    const result = await sendEthTool.execute(
      { to: RECIPIENT, valueWei: '99999999999999999999' },
      CONTEXT,
    );

    expect(result.success).toBe(false);
    expect(result.blocked).toBe(true);
    expect(result.declineMessage).toContain('per-transaction spending limit');
  });
});

// ── register(api) + Hook Integration ─────────────────────────────────────────

describe('integration: register(api) + hook', () => {
  it('register(api) registers 3 tools (register, validate, status)', () => {
    const api = { registerTool: vi.fn(), on: vi.fn() };
    mandatePlugin.register(api);
    expect(api.registerTool).toHaveBeenCalledTimes(3);
    const names = api.registerTool.mock.calls.map((c: any[]) => c[0].name);
    expect(names).toContain('mandate_register');
    expect(names).toContain('mandate_validate');
    expect(names).toContain('mandate_status');
  });

  it('validate tool returns allowed when policy passes', async () => {
    const { setRuntimeKey } = await import('../keyStore.js');
    setRuntimeKey('mndt_test_integration');
    vi.stubGlobal('fetch', createFetchMock('allowed'));
    const api = { registerTool: vi.fn(), on: vi.fn() };
    mandatePlugin.register(api);

    const validateFn = api.registerTool.mock.calls.find((c: any[]) => c[0].name === 'mandate_validate')![0];
    const result = await validateFn.execute('call1', { action: 'transfer', reason: 'test' });
    expect(result.allowed).toBe(true);
    expect(result.instruction).toContain('Policy check passed');
  });

  it('validate tool returns blocked when policy fails', async () => {
    const { setRuntimeKey } = await import('../keyStore.js');
    setRuntimeKey('mndt_test_integration');
    vi.stubGlobal('fetch', createFetchMock('blocked'));
    const api = { registerTool: vi.fn(), on: vi.fn() };
    mandatePlugin.register(api);

    const validateFn = api.registerTool.mock.calls.find((c: any[]) => c[0].name === 'mandate_validate')![0];
    const result = await validateFn.execute('call2', { action: 'transfer', reason: 'big tx' });
    expect(result.allowed).toBe(false);
    expect(result.blocked).toBe(true);
    expect(result.instruction).toContain('BLOCKED');
  });

  it('validate tool returns blocked when Mandate unreachable (fail-closed)', async () => {
    const { setRuntimeKey } = await import('../keyStore.js');
    setRuntimeKey('mndt_test_integration');
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('fetch failed')));
    const api = { registerTool: vi.fn(), on: vi.fn() };
    mandatePlugin.register(api);

    const validateFn = api.registerTool.mock.calls.find((c: any[]) => c[0].name === 'mandate_validate')![0];
    const result = await validateFn.execute('call3', { action: 'swap', reason: 'test' });
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('mandate_unreachable');
  });

  // no_runtime_key case covered by hook.test.ts (doesn't depend on file system)
});

// ── Real SDK Class Verification ──────────────────────────────────────────────

describe('integration: real SDK class verification', () => {
  it('real PolicyBlockedError instanceof check works', () => {
    const err = new PolicyBlockedError('test', 'detail', 'decline msg');
    expect(err).toBeInstanceOf(PolicyBlockedError);
    expect(err.blockReason).toBe('test');
    expect(err.detail).toBe('detail');
    expect(err.declineMessage).toBe('decline msg');
  });

  it('real ApprovalRequiredError instanceof check works', () => {
    const err = new ApprovalRequiredError('i-1', 'a-1');
    expect(err).toBeInstanceOf(ApprovalRequiredError);
    expect(err.intentId).toBe('i-1');
  });

  it('real CircuitBreakerError instanceof check works', () => {
    const err = new CircuitBreakerError();
    expect(err).toBeInstanceOf(CircuitBreakerError);
    expect(err.statusCode).toBe(403);
  });
});
