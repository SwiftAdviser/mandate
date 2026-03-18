# OpenClaw Plugin Reference (2026-03-19)

Source: https://docs.openclaw.ai/tools/plugin

## Key Points for Mandate Plugin

### Config Access
- `register(api)` receives ONE argument: `api`
- Config is accessed via `api.config` (not a second parameter)
- Plugin config lives at `plugins.entries.<id>.config` in openclaw.json

### Plugin Registration
```typescript
export default {
  id: "my-plugin",
  register(api) {
    // api.config has the full openclaw config
    // api.runtime has core helpers (tts, subagent, etc.)
    api.registerTool({ id: "my-tool", ... });
    api.on("before_prompt_build", handler, { priority: 10 });
  },
};
```

### Config Schema
```json
{
  "configSchema": {
    "type": "object",
    "properties": {
      "apiKey": { "type": "string" }
    }
  },
  "uiHints": {
    "apiKey": { "label": "API Key", "sensitive": true }
  }
}
```

### Plugin Shapes
- plain-capability: one capability type
- hybrid-capability: multiple capability types
- hook-only: only hooks, no capabilities
- non-capability: tools/commands/services

### Trust Model
- Native plugins run in-process (full trust)
- Compatible bundles are metadata-only (safer)
- plugins.allow trusts IDs, not provenance

### Skills from Plugins
- Plugins list skills dirs in manifest
- Skills load when plugin enabled
- Gate via metadata.openclaw.requires.config

### Hooks
```typescript
api.on("before_prompt_build", (event, ctx) => {
  return { prependSystemContext: "..." };
}, { priority: 10 });
```

### Discovery Order
1. Config paths (plugins.load.paths)
2. Workspace extensions (.openclaw/extensions/)
3. Global extensions (~/.openclaw/extensions/)
4. Bundled extensions
