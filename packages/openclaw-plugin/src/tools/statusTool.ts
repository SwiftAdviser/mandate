import { getRuntimeKey } from '../keyStore.js';

const MANDATE_BASE = 'https://app.mandate.md';

export interface StatusParams {
  intentId: string;
}

export const statusTool = {
  name: 'mandate_status',
  description: 'Check the status of a Mandate intent (after mandate_validate). Returns: preflight, reserved, broadcasted, confirmed, failed, expired, approval_pending, approved.',
  parameters: {
    type: 'object',
    properties: {
      intentId: { type: 'string', description: 'The intentId returned by mandate_validate' },
    },
    required: ['intentId'],
  },
  // OpenClaw: execute(_id, params)
  async execute(
    _id: unknown,
    params?: StatusParams | unknown,
  ): Promise<{
    success: boolean;
    status?: string;
    txHash?: string;
    error?: string;
  }> {
    const p = (params && typeof params === 'object' && 'intentId' in params ? params : _id) as StatusParams;
    const runtimeKey = getRuntimeKey();

    if (!runtimeKey) {
      return { success: false, error: 'No runtimeKey. Call mandate_register first.' };
    }
    try {
      const res = await fetch(`${MANDATE_BASE}/api/intents/${p.intentId}/status`, {
        headers: { 'Authorization': `Bearer ${runtimeKey}` },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        return { success: false, error: data.error ?? `HTTP ${res.status}` };
      }
      const data = await res.json();
      return {
        success: true,
        status: data.status,
        txHash: data.txHash ?? undefined,
      };
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : 'Status check failed' };
    }
  },
};
