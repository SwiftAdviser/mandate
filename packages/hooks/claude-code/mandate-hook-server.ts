import express from 'express';
import type { Request, Response } from 'express';

const app = express();
app.use(express.json());

const MANDATE_API_URL = process.env.MANDATE_API_URL ?? 'http://localhost:8000';
const MANDATE_RUNTIME_KEY = process.env.MANDATE_RUNTIME_KEY ?? '';

const PAYMENT_TOOLS = /^(Bash|mcp__.*transfer.*|mcp__.*payment.*)$/i;
const PAYMENT_KEYWORDS = /\b(transfer|pay|send|0x[0-9a-fA-F]{40})\b/i;

app.post('/hook', async (req: Request, res: Response) => {
  const { tool_name, tool_input } = req.body ?? {};

  if (!PAYMENT_TOOLS.test(tool_name ?? '')) {
    return res.json({ decision: 'approve' });
  }

  const cmdStr = JSON.stringify(tool_input ?? '');
  if (!PAYMENT_KEYWORDS.test(cmdStr)) {
    return res.json({ decision: 'approve' });
  }

  try {
    const validateRes = await fetch(`${MANDATE_API_URL}/api/validate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${MANDATE_RUNTIME_KEY}`,
      },
      body: JSON.stringify({
        chainId: 84532, to: '0x0000000000000000000000000000000000000000',
        calldata: '0x', valueWei: '0', gasLimit: '100000',
        maxFeePerGas: '1000000000', maxPriorityFeePerGas: '1000000000',
        nonce: 0, txType: 2, accessList: [],
        intentHash: '0x0000000000000000000000000000000000000000000000000000000000000000',
      }),
    });

    if (validateRes.status === 422 || validateRes.status === 403) {
      const data = await validateRes.json().catch(() => ({})) as Record<string, unknown>;
      const reason = (data.blockReason as string) ?? 'policy_blocked';
      return res.json({ decision: 'block', reason });
    }

    if (validateRes.ok) {
      const data = await validateRes.json() as Record<string, unknown>;
      if (data.allowed === false) {
        return res.json({ decision: 'block', reason: (data.blockReason as string) ?? 'policy_blocked' });
      }
    }
  } catch {
    // Network error — allow (fail open) to avoid breaking agent
  }

  return res.json({ decision: 'approve' });
});

app.listen(5402, () => {
  console.log('Mandate hook server listening on :5402');
});
