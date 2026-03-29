import type { Env } from "../index.js";

type ActionResult = { content: Array<{ type: string; text: string }> };

export async function executeHandler(
  action: string,
  params: Record<string, unknown>,
  env: Env,
): Promise<ActionResult> {
  const base = (env.MANDATE_API_URL ?? 'https://app.mandate.md').replace(/\/$/, '');
  const key = env.MANDATE_RUNTIME_KEY ?? '';

  try {
    let url: string;
    let method: string;
    let needsAuth = true;

    switch (action) {
      case 'validate':
        url = `${base}/api/validate`;
        method = 'POST';
        break;
      case 'preflight':
        url = `${base}/api/validate/preflight`;
        method = 'POST';
        break;
      case 'register':
        url = `${base}/api/agents/register`;
        method = 'POST';
        needsAuth = false;
        break;
      case 'status': {
        const intentId = params.intentId as string;
        if (!intentId) return text('Error: intentId is required for status action');
        url = `${base}/api/intents/${intentId}/status`;
        method = 'GET';
        break;
      }
      default:
        return text(`Unknown action: ${action}. Supported: validate, register, status`);
    }

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (needsAuth && key) headers['Authorization'] = `Bearer ${key}`;

    const res = await fetch(url, {
      method,
      headers,
      body: method !== 'GET' ? JSON.stringify(params) : undefined,
    });

    const data = await res.json();
    return text(JSON.stringify(data, null, 2));
  } catch (err) {
    return text(`Error calling Mandate API: ${String(err)}`);
  }
}

function text(t: string): ActionResult {
  return { content: [{ type: 'text', text: t }] };
}
