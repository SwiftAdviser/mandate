import { MandateClient } from '@mandate.md/sdk';

export interface StatusParams {
  intentId: string;
}

export const statusTool = {
  name: 'mandate_status',
  description: 'Check the status of a Mandate intent (after mandate_validate). Returns: reserved, broadcasted, confirmed, failed, expired, approval_pending, approved.',
  parameters: {
    type: 'object',
    properties: {
      intentId: { type: 'string', description: 'The intentId returned by mandate_validate' },
    },
    required: ['intentId'],
  },
  async execute(
    params: StatusParams,
    context?: { runtimeKey?: string },
  ): Promise<{
    success: boolean;
    status?: string;
    txHash?: string;
    error?: string;
  }> {
    const runtimeKey = context?.runtimeKey ?? '';
    if (!runtimeKey) {
      return { success: false, error: 'No runtimeKey. Call mandate_register first.' };
    }
    try {
      const client = new MandateClient({ runtimeKey });
      const result = await client.getStatus(params.intentId);
      return {
        success: true,
        status: result.status,
        txHash: result.txHash ?? undefined,
      };
    } catch (err: any) {
      return { success: false, error: err.message ?? 'Status check failed' };
    }
  },
};
