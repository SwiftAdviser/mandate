// ACP (Agent Commerce Protocol) types — mirrors claw-api.virtuals.io responses

export type JobPhase =
  | 'REQUEST'
  | 'NEGOTIATION'
  | 'TRANSACTION'
  | 'EVALUATION'
  | 'COMPLETED'
  | 'REJECTED'
  | 'EXPIRED';

export interface PriceV2 {
  type: 'fixed' | 'percentage';
  value: number;
}

export interface JobOffering {
  id: number;
  name: string;
  description: string;
  price: number;
  priceV2: PriceV2;
  requiredFunds: boolean;
  slaMinutes: number;
  requirement: Record<string, unknown>;
  deliverable: Record<string, unknown> | string;
}

export interface AgentInfo {
  name: string;
  description: string;
  walletAddress: string;
  tokenAddress: string | null;
  jobs: JobOffering[];
}

export interface PaymentBudget {
  amount: number;
  symbol: string;
  usdValue: number;
  tokenAddress?: string;
}

export interface PaymentRequestData {
  memoContent?: string;
  budget: PaymentBudget;
  transfer?: PaymentBudget;
}

export interface MemoEntry {
  nextPhase: string;
  content: string;
  createdAt: string;
  status: string;
}

export interface AcpJob {
  jobId: number;
  phase: JobPhase;
  providerName: string | null;
  providerWalletAddress: string | null;
  clientName: string | null;
  clientWalletAddress: string | null;
  paymentRequestData: PaymentRequestData | null;
  deliverable: string | null;
  memoHistory: MemoEntry[];
  expiry: number | null;
}

export interface CreateJobResult {
  jobId: number;
}

export interface AcpConfig {
  /** LITE_AGENT_API_KEY from ACP dashboard */
  acpApiKey: string;
  /** Optional: ACP_BUILDER_CODE */
  builderCode?: string;
  /** ACP API base URL. Default: https://claw-api.virtuals.io */
  acpApiUrl?: string;
}

export interface MandateAcpConfig extends AcpConfig {
  /** Mandate runtime key (mndt_live_... or mndt_test_...) */
  mandateRuntimeKey: string;
  /** Mandate API base URL. Default: https://api.mandate.krutovoy.me */
  mandateApiUrl?: string;
}

/** Result of a policy-enforced job payment */
export interface JobPayResult {
  jobId: number;
  accepted: boolean;
  blocked: boolean;
  blockReason?: string;
  requiresApproval?: boolean;
}

/** Result of createAndPay: creates job + handles NEGOTIATION automatically */
export interface CreateAndPayResult {
  jobId: number;
  accepted: boolean;
  blocked: boolean;
  blockReason?: string;
  /** Final job status after payment */
  phase: JobPhase;
}
