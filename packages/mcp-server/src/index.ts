import { searchHandler } from "./handlers/search.js";
import { executeHandler } from "./handlers/execute.js";

export interface Env {
  MANDATE_API_URL: string;
  MANDATE_RUNTIME_KEY: string;
}

const SERVER_INFO = {
  name: "mandate-mcp",
  version: "1.2.0",
};

const TOOLS = [
  {
    name: "search",
    description:
      "Look up Mandate schema, policies, supported fields, and example payloads. Use before calling execute.",
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description:
            "What to look up: 'validate schema', 'register schema', 'policy fields', 'examples', 'x402'",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "execute",
    description:
      "Call Mandate API. Actions: validate (policy check), register (create agent), status (intent status). Validate and preflight support x402 pay-per-call ($0.10/$0.05 USDC on Base).",
    inputSchema: {
      type: "object",
      properties: {
        action: {
          type: "string",
          description: "API action: validate, preflight, register, status",
        },
        params: { type: "object", description: "Parameters for the action" },
      },
      required: ["action", "params"],
    },
  },
  {
    name: "x402_info",
    description:
      "Get x402 payment info for Mandate API. Returns pricing, network, and how to pay for validation calls with USDC on Base.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
];

function jsonrpc(id: unknown, result: unknown) {
  return { jsonrpc: "2.0", id, result };
}

function jsonrpcError(id: unknown, code: number, message: string) {
  return { jsonrpc: "2.0", id, error: { code, message } };
}

async function handleRpc(
  method: string,
  params: Record<string, unknown>,
  id: unknown,
  env: Env,
) {
  switch (method) {
    case "initialize":
      return jsonrpc(id, {
        protocolVersion: "2024-11-05",
        capabilities: { tools: {} },
        serverInfo: SERVER_INFO,
      });

    case "notifications/initialized":
    case "initialized":
      return null; // notification, no response

    case "ping":
      return jsonrpc(id, {});

    case "tools/list":
      return jsonrpc(id, { tools: TOOLS });

    case "tools/call": {
      const toolName = params.name as string;
      const args = (params.arguments ?? {}) as Record<string, unknown>;

      if (toolName === "search") {
        return jsonrpc(id, searchHandler(args.query as string));
      }

      if (toolName === "execute") {
        const result = await executeHandler(
          args.action as string,
          (args.params ?? {}) as Record<string, unknown>,
          env,
        );
        return jsonrpc(id, result);
      }

      if (toolName === "x402_info") {
        return jsonrpc(id, {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  description:
                    "Mandate API supports x402 pay-per-call. No registration needed.",
                  protocol: "x402 v2 (HTTP 402 Payment Required)",
                  network: "Base mainnet (eip155:8453)",
                  asset: "USDC (0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913)",
                  facilitator: "Coinbase CDP",
                  pricing: {
                    "POST /api/validate": "$0.10 USDC",
                    "POST /api/validate/preflight": "$0.05 USDC",
                  },
                  flow: [
                    "1. POST to endpoint without auth, receive 402 + PAYMENT-REQUIRED header",
                    "2. Sign EIP-712 payment authorization with your wallet",
                    "3. Retry with PAYMENT-SIGNATURE header",
                    "4. Receive 200 response with validation result",
                  ],
                  client_libraries: [
                    "@x402/fetch (wrapFetchWithPayment)",
                    "@x402/evm/exact/client (registerExactEvmScheme)",
                  ],
                  docs: "https://app.mandate.md/SKILL.md",
                },
                null,
                2,
              ),
            },
          ],
        });
      }

      return jsonrpcError(id, -32602, `Unknown tool: ${toolName}`);
    }

    default:
      return jsonrpcError(id, -32601, `Method not found: ${method}`);
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const cors = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors });
    }

    // Health / discovery
    if (url.pathname === "/" || url.pathname === "/health") {
      return Response.json(
        { status: "ok", ...SERVER_INFO, x402: true },
        { headers: cors },
      );
    }

    // MCP endpoint: JSON-RPC over HTTP POST
    if (
      (url.pathname === "/mcp" || url.pathname === "/sse") &&
      request.method === "POST"
    ) {
      const body = await request.json<{
        jsonrpc: string;
        method: string;
        params?: Record<string, unknown>;
        id?: unknown;
      }>();

      const result = await handleRpc(
        body.method,
        body.params ?? {},
        body.id,
        env,
      );

      if (result === null) {
        return new Response(null, { status: 204, headers: cors });
      }

      return Response.json(result, { headers: cors });
    }

    // GET /mcp returns server info for discovery
    if (
      (url.pathname === "/mcp" || url.pathname === "/sse") &&
      request.method === "GET"
    ) {
      return Response.json(
        {
          ...SERVER_INFO,
          protocol: "MCP JSON-RPC over HTTP POST",
          tools: TOOLS.map((t) => ({ name: t.name, description: t.description })),
          x402: {
            validate: "$0.10 USDC",
            preflight: "$0.05 USDC",
            network: "Base (eip155:8453)",
          },
        },
        { headers: cors },
      );
    }

    return Response.json({ error: "Not Found" }, { status: 404, headers: cors });
  },
};
