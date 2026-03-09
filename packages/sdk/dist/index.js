var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);

// src/MandateWallet.ts
import {
  createPublicClient,
  createWalletClient,
  http,
  encodeFunctionData
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia, base } from "viem/chains";

// src/types.ts
var MandateError = class extends Error {
  constructor(message, statusCode, blockReason) {
    super(message);
    this.statusCode = statusCode;
    this.blockReason = blockReason;
    this.name = "MandateError";
  }
};
var CircuitBreakerError = class extends MandateError {
  constructor() {
    super("Circuit breaker is active. All transactions are blocked.", 403, "circuit_breaker_active");
    this.name = "CircuitBreakerError";
  }
};
var PolicyBlockedError = class extends MandateError {
  constructor(reason) {
    super(`Transaction blocked by policy: ${reason}`, 422, reason);
    this.name = "PolicyBlockedError";
  }
};
var ApprovalRequiredError = class extends MandateError {
  constructor(intentId, approvalId) {
    super("Transaction requires human approval. Poll /status until approved.", 202, "approval_required");
    this.intentId = intentId;
    this.approvalId = approvalId;
    this.name = "ApprovalRequiredError";
  }
};

// src/MandateClient.ts
var DEFAULT_BASE = "https://api.mandate.krutovoy.me";
var MandateClient = class {
  constructor(config) {
    __publicField(this, "baseUrl");
    __publicField(this, "runtimeKey");
    this.runtimeKey = config.runtimeKey;
    this.baseUrl = (config.baseUrl ?? DEFAULT_BASE).replace(/\/$/, "");
  }
  // ── Registration (no auth) ────────────────────────────────────────────
  static async register(params) {
    const base2 = (params.baseUrl ?? DEFAULT_BASE).replace(/\/$/, "");
    const res = await fetch(`${base2}/api/agents/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new MandateError(err.message ?? "Registration failed", res.status);
    }
    return res.json();
  }
  // ── Validation ────────────────────────────────────────────────────────
  async validate(payload) {
    const res = await this.post("/api/validate", payload);
    if (res.status === 403) throw new CircuitBreakerError();
    if (res.status === 422) {
      const data2 = await res.json();
      throw new PolicyBlockedError(data2.blockReason ?? "unknown");
    }
    if (!res.ok) {
      const data2 = await res.json().catch(() => ({}));
      throw new MandateError(data2.error ?? "Validation failed", res.status);
    }
    const data = await res.json();
    if (data.requiresApproval && data.intentId && data.approvalId) {
      throw new ApprovalRequiredError(data.intentId, data.approvalId);
    }
    return data;
  }
  // ── Post event (after broadcast) ─────────────────────────────────────
  async postEvent(intentId, txHash) {
    const res = await this.post(`/api/intents/${intentId}/events`, { txHash });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new MandateError(data.error ?? "Event post failed", res.status);
    }
  }
  // ── Status polling ────────────────────────────────────────────────────
  async getStatus(intentId) {
    const res = await this.get(`/api/intents/${intentId}/status`);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new MandateError(data.error ?? "Status fetch failed", res.status);
    }
    return res.json();
  }
  /**
   * Poll intent status until terminal (confirmed/failed/expired).
   * Throws if timeout exceeded or if status is failed.
   */
  async waitForConfirmation(intentId, opts = {}) {
    const timeout = opts.timeoutMs ?? 5 * 60 * 1e3;
    const interval = opts.intervalMs ?? 3e3;
    const deadline = Date.now() + timeout;
    while (Date.now() < deadline) {
      const status = await this.getStatus(intentId);
      if (status.status === "confirmed") return status;
      if (status.status === "failed") throw new MandateError(`Intent failed: ${status.blockReason ?? "unknown"}`, 422, status.blockReason ?? "failed");
      if (status.status === "expired") throw new MandateError("Intent expired before confirmation", 408, "expired");
      await sleep(interval);
    }
    throw new MandateError("Timeout waiting for confirmation", 408, "timeout");
  }
  // ── Helpers ───────────────────────────────────────────────────────────
  async post(path, body) {
    return fetch(`${this.baseUrl}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${this.runtimeKey}`
      },
      body: JSON.stringify(body)
    });
  }
  async get(path) {
    return fetch(`${this.baseUrl}${path}`, {
      headers: { "Authorization": `Bearer ${this.runtimeKey}` }
    });
  }
};
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// src/intentHash.ts
import { keccak256 } from "viem";
function computeIntentHash(input) {
  const packed = [
    String(input.chainId),
    String(input.nonce),
    input.to.toLowerCase(),
    (input.calldata ?? "0x").toLowerCase(),
    input.valueWei ?? "0",
    input.gasLimit,
    input.maxFeePerGas,
    input.maxPriorityFeePerGas,
    String(input.txType ?? 2),
    JSON.stringify(input.accessList ?? [])
  ].join("|");
  const bytes = new TextEncoder().encode(packed);
  return keccak256(bytes);
}

// src/MandateWallet.ts
var ERC20_ABI = [
  {
    name: "transfer",
    type: "function",
    inputs: [{ name: "to", type: "address" }, { name: "amount", type: "uint256" }],
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable"
  }
];
var CHAINS = {
  84532: baseSepolia,
  8453: base
};
var DEFAULT_RPC = {
  84532: "https://sepolia.base.org",
  8453: "https://mainnet.base.org"
};
var MandateWallet = class {
  constructor(config) {
    __publicField(this, "client");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    __publicField(this, "wallet");
    __publicField(this, "publicClient");
    __publicField(this, "account");
    __publicField(this, "chainId");
    this.client = new MandateClient(config);
    this.account = privateKeyToAccount(config.privateKey);
    this.chainId = config.chainId;
    const chain = CHAINS[config.chainId];
    const rpcUrl = config.rpcUrl ?? DEFAULT_RPC[config.chainId] ?? "https://sepolia.base.org";
    this.wallet = createWalletClient({
      account: this.account,
      chain,
      transport: http(rpcUrl)
    });
    this.publicClient = createPublicClient({
      chain,
      transport: http(rpcUrl)
    });
  }
  get address() {
    return this.account.address;
  }
  /**
   * ERC20 transfer with full policy enforcement.
   * Throws PolicyBlockedError, CircuitBreakerError, or ApprovalRequiredError on rejection.
   */
  async transfer(to, rawAmount, tokenAddress, opts = {}) {
    const calldata = encodeFunctionData({
      abi: ERC20_ABI,
      functionName: "transfer",
      args: [to, BigInt(rawAmount)]
    });
    return this.sendTransaction(tokenAddress, calldata, "0", opts);
  }
  /**
   * Native ETH/MATIC transfer.
   */
  async sendEth(to, valueWei, opts = {}) {
    return this.sendTransaction(to, "0x", valueWei, opts);
  }
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
  async sendTransaction(to, calldata, valueWei = "0", opts = {}) {
    const [nonce, feeData] = await Promise.all([
      this.publicClient.getTransactionCount({ address: this.account.address }),
      this.publicClient.estimateFeesPerGas()
    ]);
    const maxFeePerGas = feeData.maxFeePerGas?.toString() ?? "1000000000";
    const maxPriorityFeePerGas = feeData.maxPriorityFeePerGas?.toString() ?? "1000000000";
    let gasLimit = "100000";
    try {
      const estimated = await this.publicClient.estimateGas({
        account: this.account.address,
        to,
        data: calldata === "0x" ? void 0 : calldata,
        value: BigInt(valueWei)
      });
      gasLimit = (estimated * 12n / 10n).toString();
    } catch {
    }
    const intentHash = computeIntentHash({
      chainId: this.chainId,
      nonce,
      to,
      calldata,
      valueWei,
      gasLimit,
      maxFeePerGas,
      maxPriorityFeePerGas,
      txType: 2,
      accessList: []
    });
    const validation = await this.client.validate({
      chainId: this.chainId,
      nonce,
      to,
      calldata,
      valueWei,
      gasLimit,
      maxFeePerGas,
      maxPriorityFeePerGas,
      txType: 2,
      accessList: [],
      intentHash
    });
    const intentId = validation.intentId;
    const txHash = await this.wallet.sendTransaction({
      account: this.account,
      to,
      data: calldata === "0x" ? void 0 : calldata,
      value: BigInt(valueWei),
      gas: BigInt(gasLimit),
      maxFeePerGas: BigInt(maxFeePerGas),
      maxPriorityFeePerGas: BigInt(maxPriorityFeePerGas),
      nonce
    });
    await this.client.postEvent(intentId, txHash);
    const status = opts.waitForConfirmation !== false ? await this.client.waitForConfirmation(intentId) : await this.client.getStatus(intentId);
    return { txHash, intentId, status };
  }
  /**
   * x402 payment flow.
   * 1. Fetch the target URL (expects 402 response)
   * 2. Parse X-Payment-Required header
   * 3. Validate + sign ERC20 transfer
   * 4. Retry original request with Payment-Signature header
   */
  async x402Pay(url, opts = {}) {
    const probe = await fetch(url, { headers: opts.headers });
    if (probe.status !== 402) {
      return probe;
    }
    const paymentHeader = probe.headers.get("X-Payment-Required") ?? probe.headers.get("X-Payment-Info");
    if (!paymentHeader) throw new Error("402 response missing X-Payment-Required header");
    const payment = JSON.parse(paymentHeader);
    const tokenAddress = payment.tokenAddress ?? this.getDefaultUsdc(payment.chainId);
    const { txHash } = await this.transfer(
      payment.paymentAddress,
      payment.amount,
      tokenAddress
    );
    return fetch(url, {
      headers: {
        ...opts.headers,
        "Payment-Signature": txHash,
        "X-Payment-TxHash": txHash
      }
    });
  }
  getDefaultUsdc(chainId) {
    const USDC2 = {
      84532: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
      8453: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"
    };
    return USDC2[chainId] ?? USDC2[84532];
  }
};

// src/index.ts
var USDC = {
  BASE_SEPOLIA: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
  BASE_MAINNET: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"
};
var CHAIN_ID = {
  BASE_SEPOLIA: 84532,
  BASE_MAINNET: 8453
};
export {
  ApprovalRequiredError,
  CHAIN_ID,
  CircuitBreakerError,
  MandateClient,
  MandateError,
  MandateWallet,
  PolicyBlockedError,
  USDC,
  computeIntentHash
};
