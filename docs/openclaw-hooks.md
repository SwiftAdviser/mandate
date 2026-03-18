# OpenClaw Hooks

> Source: https://docs.openclaw.ai/automation/hooks

OpenClaw's hooks are an event-driven automation system. Hooks are small TypeScript scripts that run inside the Gateway when agent events fire, like `/new`, `/reset`, `/stop`, or lifecycle events.

## Hooks vs Webhooks

- **Hooks** (this page): run inside the Gateway when agent events fire (synchronous)
- **Webhooks**: external HTTP triggers for integrating with other systems

## Discovery Mechanism

Hooks are automatically discovered from three directories (in precedence order):

1. **Workspace hooks** (`<workspace>/hooks/`) - project-specific
2. **Managed hooks** (`~/.openclaw/hooks/`) - shared across workspaces
3. **Bundled hooks** (`<openclaw>/dist/hooks/bundled/`) - shipped with OpenClaw

Each hook requires a directory containing:
- `HOOK.md` - metadata and documentation (YAML frontmatter)
- `handler.ts` - implementation as async TypeScript function

## Event Types

| Category | Events |
|---|---|
| Command events | `command:new`, `command:reset`, `command:stop` |
| Session events | Compaction lifecycle (before/after) |
| Agent events | Bootstrap operations |
| Gateway events | Startup sequence |
| Message events | Received, transcribed, preprocessed, sent |

## Bundled Hooks

OpenClaw ships with four pre-built hooks:

| Hook | Description |
|---|---|
| `session-memory` | Saves session context to workspace when `/new` is issued |
| `bootstrap-extra-files` | Injects additional workspace files during bootstrap |
| `command-logger` | Logs all command events to `~/.openclaw/logs/commands.log` |
| `boot-md` | Runs `BOOT.md` instructions at gateway startup |

## Creating Custom Hooks

### 1. Choose location

- Workspace-specific: `<workspace>/hooks/my-hook/`
- Shared: `~/.openclaw/hooks/my-hook/`

### 2. Create HOOK.md

```markdown
---
name: my-hook
description: What this hook does
events:
  - command:new
  - command:reset
enabled: true
---

Documentation about this hook.
```

### 3. Implement handler.ts

Handlers export async functions receiving event objects:

```typescript
export default async function handler(event: HookEvent) {
  // event contains: type, action, sessionKey, timestamp, context-specific data

  if (event.type === 'command' && event.action === 'new') {
    // Handle /new command
  }

  // Can push messages back to users
  event.pushMessage?.('Hook executed successfully');
}
```

### 4. Enable via CLI

```bash
openclaw hooks enable my-hook
```

## CLI Management

| Command | Description |
|---|---|
| `openclaw hooks list` | Display all available hooks |
| `openclaw hooks enable <name>` | Activate a hook |
| `openclaw hooks disable <name>` | Deactivate a hook |
| `openclaw hooks info <name>` | Show detailed information |
| `openclaw hooks check` | Verify eligibility status |

## Configuration

The discovery-based system uses configuration entries specifying enabled/disabled status per hook. Legacy format (module paths) still works but migration to discovery is recommended.

## Installation Methods

- **Local**: create in workspace or managed hooks directory
- **npm packages**: install "hook packs" from npm
- **Plugins**: bundled within plugins with proper TypeScript export signatures

## Best Practices

- Keep handlers lightweight and fast
- Filter events early (check event type/action at top of handler)
- Handle errors gracefully: don't throw exceptions that would interrupt other handlers
- Use the discovery mechanism rather than legacy module paths
