# @mandate/mcp-server

Cloudflare Workers MCP server for Mandate. Two tools, minimal context overhead.

## Tools

| Tool | Purpose |
|------|---------|
| `search` | Look up schema, policy fields, and example payloads |
| `execute` | Call Mandate API actions: `validate`, `register`, `status` |

The `execute` tool uses preflight validation (action-based, chain-agnostic) as the recommended flow. No gas params or intentHash needed.

## Local Dev

```bash
npm install
npm run dev
# MCP endpoint: http://localhost:8788/mcp
```

## Deploy

```bash
npx wrangler deploy
npx wrangler secret put MANDATE_RUNTIME_KEY
```

`MANDATE_API_URL` defaults to `https://app.mandate.md` (set in `wrangler.toml`).

## Client Config

### Claude Desktop

```json
{
  "mcpServers": {
    "mandate": {
      "url": "https://mandate-mcp.<your-subdomain>.workers.dev/mcp"
    }
  }
}
```

### Codex CLI (`~/.codex/config.toml`)

```toml
[[mcp_servers]]
name = "mandate"
url = "https://mandate-mcp.<your-subdomain>.workers.dev/mcp"
```

## MCP Inspector

```bash
npx @modelcontextprotocol/inspector http://localhost:8788/mcp
```

## Community

- [Telegram Developer Chat](https://t.me/mandate_md_chat)
- [Documentation](https://mandate.md)
- [GitHub](https://github.com/AIMandateProject/mandate)
