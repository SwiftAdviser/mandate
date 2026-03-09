import { Hash } from 'viem';

interface MandateConfig {
    /** Your mndt_live_... or mndt_test_... runtime key */
    runtimeKey: string;
    /** Base URL for Mandate API. Default: https://api.mandate.krutovoy.me */
    baseUrl?: string;
}
interface IntentPayload {
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
interface ValidateResult {
    allowed: boolean;
    intentId: string | null;
    requiresApproval: boolean;
    approvalId: string | null;
    blockReason: string | null;
}
interface IntentStatus {
    intentId: string;
    status: 'reserved' | 'approval_pending' | 'approved' | 'broadcasted' | 'confirmed' | 'failed' | 'expired';
    txHash: string | null;
    blockNumber: string | null;
    gasUsed: string | null;
    amountUsd: string | null;
    decodedAction: string | null;
    blockReason: string | null;
    requiresApproval: boolean;
    approvalId: string | null;
    expiresAt: string | null;
}
interface RegisterResult {
    agentId: string;
    runtimeKey: string;
    claimUrl: string;
    evmAddress: string;
    chainId: number;
}
declare class MandateError extends Error {
    readonly statusCode: number;
    readonly blockReason?: string | undefined;
    constructor(message: string, statusCode: number, blockReason?: string | undefined);
}
declare class CircuitBreakerError extends MandateError {
    constructor();
}
declare class PolicyBlockedError extends MandateError {
    constructor(reason: string);
}
declare class ApprovalRequiredError extends MandateError {
    readonly intentId: string;
    readonly approvalId: string;
    constructor(intentId: string, approvalId: string);
}

/**
 * MandateWallet — high-level class for agent developers.
 *
 * Works ON TOP of viem (or any compatible signer).
 * Private key stays local — never sent to Mandate API.
 *
 * Compatible with: AgentKit (as action provider), GOAT SDK, Privy server wallets, raw viem.
 *
 * @example
 * const wallet = new MandateWallet({
 *   runtimeKey: process.env.MANDATE_RUNTIME_KEY!,
 *   privateKey:  process.env.AGENT_PRIVATE_KEY! as `0x${string}`,
 *   chainId: 84532,
 * });
 * const { txHash, status } = await wallet.transfer(recipientAddress, '10000000', USDC_BASE_SEPOLIA);
 */

interface MandateWalletConfig extends MandateConfig {
    /** Agent private key — stays local, never sent to API */
    privateKey: `0x${string}`;
    chainId: number;
    /** Optional: custom RPC URL */
    rpcUrl?: string;
}
interface TransferResult {
    txHash: Hash;
    intentId: string;
    status: IntentStatus;
}
declare class MandateWallet {
    private readonly client;
    private readonly wallet;
    private readonly publicClient;
    private readonly account;
    private readonly chainId;
    constructor(config: MandateWalletConfig);
    get address(): `0x${string}`;
    /**
     * ERC20 transfer with full policy enforcement.
     * Throws PolicyBlockedError, CircuitBreakerError, or ApprovalRequiredError on rejection.
     */
    transfer(to: `0x${string}`, rawAmount: string, tokenAddress: `0x${string}`, opts?: {
        waitForConfirmation?: boolean;
    }): Promise<TransferResult>;
    /**
     * Native ETH/MATIC transfer.
     */
    sendEth(to: `0x${string}`, valueWei: string, opts?: {
        waitForConfirmation?: boolean;
    }): Promise<TransferResult>;
    /**
     * General-purpose: build, validate, sign, broadcast.
     * Steps:
     *   1. Estimate gas + nonce
     *   2. Compute intentHash
     *   3. POST /api/validate (policy check)
     *   4. Sign + broadcast locally (private key never leaves)
     *   5. POST /api/intents/{id}/events (envelope verify)
     *   6. Optionally poll for confirmation
     */
    sendTransaction(to: `0x${string}`, calldata: `0x${string}`, valueWei?: string, opts?: {
        waitForConfirmation?: boolean;
    }): Promise<TransferResult>;
    /**
     * x402 payment flow.
     * 1. Fetch the target URL (expects 402 response)
     * 2. Parse X-Payment-Required header
     * 3. Validate + sign ERC20 transfer
     * 4. Retry original request with Payment-Signature header
     */
    x402Pay(url: string, opts?: {
        headers?: Record<string, string>;
    }): Promise<Response>;
    private getDefaultUsdc;
}

/**
 * Low-level Mandate API client.
 * Use MandateWallet for a higher-level signing+broadcast flow.
 */
declare class MandateClient {
    private readonly baseUrl;
    private readonly runtimeKey;
    constructor(config: MandateConfig);
    static register(params: {
        name: string;
        evmAddress: `0x${string}`;
        chainId: number;
        defaultPolicy?: {
            spendLimitPerTxUsd?: number;
            spendLimitPerDayUsd?: number;
        };
        baseUrl?: string;
    }): Promise<RegisterResult>;
    validate(payload: IntentPayload): Promise<ValidateResult>;
    postEvent(intentId: string, txHash: `0x${string}`): Promise<void>;
    getStatus(intentId: string): Promise<IntentStatus>;
    /**
     * Poll intent status until terminal (confirmed/failed/expired).
     * Throws if timeout exceeded or if status is failed.
     */
    waitForConfirmation(intentId: string, opts?: {
        timeoutMs?: number;
        intervalMs?: number;
    }): Promise<IntentStatus>;
    private post;
    private get;
}

interface HashInput {
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
}
/**
 * Compute the Mandate intentHash.
 * Must match PolicyEngineService::computeIntentHash() on the server.
 */
declare function computeIntentHash(input: HashInput): `0x${string}`;

/**
 * @mandate/sdk
 *
 * Non-custodial policy layer for agent wallets.
 * Works on top of AgentKit, GOAT SDK, Privy, or any viem signer.
 *
 * @example
 * import { MandateWallet, MandateClient } from '@mandate/sdk';
 *
 * // High-level: handles validate → sign → broadcast → confirm
 * const wallet = new MandateWallet({
 *   runtimeKey: process.env.MANDATE_RUNTIME_KEY!,
 *   privateKey:  process.env.AGENT_PRIVATE_KEY! as `0x${string}`,
 *   chainId: 84532, // Base Sepolia
 * });
 *
 * // ERC20 transfer with policy enforcement
 * const { txHash, status } = await wallet.transfer(
 *   '0xRecipient',
 *   '5000000', // 5 USDC (6 decimals)
 *   '0x036CbD53842c5426634e7929541eC2318f3dCF7e', // USDC Base Sepolia
 * );
 *
 * // x402 payment
 * const response = await wallet.x402Pay('https://api.example.com/search');
 */

declare const USDC: {
    readonly BASE_SEPOLIA: `0x${string}`;
    readonly BASE_MAINNET: `0x${string}`;
};
declare const CHAIN_ID: {
    readonly BASE_SEPOLIA: 84532;
    readonly BASE_MAINNET: 8453;
};

export { ApprovalRequiredError, CHAIN_ID, CircuitBreakerError, type IntentPayload, type IntentStatus, MandateClient, type MandateConfig, MandateError, MandateWallet, PolicyBlockedError, type RegisterResult, USDC, type ValidateResult, computeIntentHash };
