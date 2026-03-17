import { McpAgent } from "@cloudflare/agents/mcp";
import { searchHandler } from "./handlers/search.js";
import { executeHandler } from "./handlers/execute.js";

export interface Env {
  MANDATE_API_URL: string;
  MANDATE_RUNTIME_KEY: string;
}

export class MandateMCP extends McpAgent<Env> {
  async init() {
    this.server.tool(
      "search",
      "Look up Mandate schema, policies, supported fields, and example payloads. Use this before calling execute to understand the correct format.",
      { query: { type: "string", description: "What to look up: 'validate schema', 'register schema', 'policy fields', 'examples'" } },
      (args) => searchHandler(args.query),
    );

    this.server.tool(
      "execute",
      "Call Mandate API. Actions: 'validate' (check if tx is allowed), 'register' (create new agent), 'status' (get intent status).",
      {
        action: { type: "string", enum: ["validate", "register", "status"], description: "Which API action to call" },
        params: { type: "object", description: "Parameters for the action" },
      },
      (args) => executeHandler(args.action, args.params as Record<string, unknown>, this.env),
    );

  }
}

export default MandateMCP.serve("/mcp");
