export interface MandateConfig {
  /** Your mndt_live_... or mndt_test_... runtime key */
  runtimeKey: string;
  /** Base URL for Mandate API. Default: https://api.mandate.krutovoy.me */
  baseUrl?: string;
}

export interface IntentPayload {
  chainId: number;
  nonce: number;
  to: `0x${string}`;
  calldata: `0x${string}`;
  valueWei: string;
  gasLimit: string;
  maxFeePerGas: string;
  maxPriorityFeePerGas: string;
  txType?: number;
  accessList?: unknown[];
  intentHash: `0x${string}`;
}

export interface ValidateResult {
  allowed: boolean;
  intentId: string | null;
  requiresApproval: boolean;
  approvalId: string | null;
  blockReason: string | null;
  blockDetail?: string | null;
}

export interface IntentStatus {
  intentId: string;
  status: 'reserved' | 'approval_pending' | 'approved' | 'broadcasted' | 'confirmed' | 'failed' | 'expired';
  txHash: string | null;
  blockNumber: string | null;
  gasUsed: string | null;
  amountUsd: string | null;
  decodedAction: string | null;
  summary: string | null;
  blockReason: string | null;
  requiresApproval: boolean;
  approvalId: string | null;
  expiresAt: string | null;
}

export interface RegisterResult {
  agentId: string;
  runtimeKey: string;
  claimUrl: string;
  evmAddress: string;
  chainId: number;
}

export class MandateError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly blockReason?: string,
  ) {
    super(message);
    this.name = 'MandateError';
  }
}

export class CircuitBreakerError extends MandateError {
  constructor() {
    super('Circuit breaker is active. All transactions are blocked.', 403, 'circuit_breaker_active');
    this.name = 'CircuitBreakerError';
  }
}

export class PolicyBlockedError extends MandateError {
  public readonly detail?: string;
  constructor(reason: string, detail?: string) {
    super(`Transaction blocked by policy: ${reason}`, 422, reason);
    this.name = 'PolicyBlockedError';
    this.detail = detail;
  }
}

export class ApprovalRequiredError extends MandateError {
  constructor(
    public readonly intentId: string,
    public readonly approvalId: string,
  ) {
    super('Transaction requires human approval. Poll /status until approved.', 202, 'approval_required');
    this.name = 'ApprovalRequiredError';
  }
}

export class RiskBlockedError extends MandateError {
  constructor(reason: string) {
    super(`Transaction blocked by risk assessment: ${reason}`, 422, reason);
    this.name = 'RiskBlockedError';
  }
}

/** Any wallet that can send transactions. Wrap your existing wallet with this. */
export interface ExternalSigner {
  /** Send a signed transaction. Return the tx hash. */
  sendTransaction(tx: {
    to: `0x${string}`;
    data: `0x${string}`;
    value: bigint;
    gas: bigint;
    maxFeePerGas?: bigint;
    maxPriorityFeePerGas?: bigint;
    nonce?: number;
  }): Promise<`0x${string}`>;
  /** Return the wallet's address. */
  getAddress(): Promise<`0x${string}`> | `0x${string}`;
}

/** Alias for PolicyBlockedError — used by integration adapters */
export const MandateBlockedError = PolicyBlockedError;
export type MandateBlockedError = PolicyBlockedError;
