# Create Claude Code Plugins

> Source: https://code.claude.com/docs/llms.txt (full docs index)

Plugins extend Claude Code with skills, agents, hooks, and MCP servers. They can be shared across projects and teams via marketplaces.

## When to Use Plugins vs Standalone

| Approach | Skill names | Best for |
|---|---|---|
| **Standalone** (`.claude/` directory) | `/hello` | Personal workflows, project-specific, quick experiments |
| **Plugins** (`.claude-plugin/plugin.json`) | `/plugin-name:hello` | Sharing with teammates, community distribution, reusable across projects |

## Plugin Structure

```
my-plugin/
├── .claude-plugin/
│   └── plugin.json        # manifest (name, description, version, author)
├── commands/              # slash commands (Markdown files)
├── agents/                # custom agent definitions
├── skills/                # agent skills (folders with SKILL.md)
├── hooks/
│   └── hooks.json         # event handlers
├── .mcp.json              # MCP server configs
├── .lsp.json              # LSP server configs
└── settings.json          # default settings (e.g. {"agent": "security-reviewer"})
```

IMPORTANT: commands/, agents/, skills/, hooks/ go at the plugin ROOT, NOT inside .claude-plugin/.

## Quickstart

### 1. Create plugin directory and manifest

```bash
mkdir -p my-plugin/.claude-plugin
```

Create `my-plugin/.claude-plugin/plugin.json`:

```json
{
  "name": "my-plugin",
  "description": "A greeting plugin to learn the basics",
  "version": "1.0.0",
  "author": {
    "name": "Your Name"
  }
}
```

| Field | Purpose |
|---|---|
| `name` | Unique identifier and skill namespace prefix |
| `description` | Shown in the plugin manager |
| `version` | Semantic versioning for releases |
| `author` | Optional. Attribution. |

### 2. Add a skill

```bash
mkdir -p my-plugin/skills/hello
```

Create `my-plugin/skills/hello/SKILL.md`:

```markdown
---
description: Greet the user with a friendly message
disable-model-invocation: true
---

Greet the user warmly and ask how you can help them today.
```

### 3. Test locally

```bash
claude --plugin-dir ./my-plugin
```

Then invoke:

```
/my-plugin:hello
```

Run `/reload-plugins` to pick up changes without restarting.

### 4. Add skill arguments

Use `$ARGUMENTS` placeholder for user input:

```markdown
---
description: Greet the user with a personalized message
---

Greet the user named "$ARGUMENTS" warmly and ask how you can help them today.
```

Usage: `/my-plugin:hello Alex`

## Skills (skills/)

Each skill is a folder containing a `SKILL.md` file with frontmatter:

```yaml
---
name: code-review
description: Reviews code for best practices and potential issues. Use when reviewing code, checking PRs, or analyzing code quality.
---

When reviewing code, check for:
1. Code organization and structure
2. Error handling
3. Security concerns
4. Test coverage
```

## Hooks (hooks/hooks.json)

Hook input arrives as JSON on stdin. Use `jq` to extract fields:

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Write|Edit",
        "hooks": [{ "type": "command", "command": "jq -r '.tool_input.file_path' | xargs npm run lint:fix" }]
      }
    ]
  }
}
```

## LSP Servers (.lsp.json)

```json
{
  "go": {
    "command": "gopls",
    "args": ["serve"],
    "extensionToLanguage": {
      ".go": "go"
    }
  }
}
```

Users must have the language server binary installed.

## Default Settings (settings.json)

Only the `agent` key is supported. Activates a plugin's custom agent as the main thread:

```json
{
  "agent": "security-reviewer"
}
```

## Converting Standalone to Plugin

1. Create plugin structure with `.claude-plugin/plugin.json`
2. Copy files: `cp -r .claude/commands my-plugin/`, same for agents/, skills/
3. Move hooks from `settings.json` into `hooks/hooks.json`
4. Test with `claude --plugin-dir ./my-plugin`

| Standalone (`.claude/`) | Plugin |
|---|---|
| Only available in one project | Shareable via marketplaces |
| Files in `.claude/commands/` | Files in `plugin-name/commands/` |
| Hooks in `settings.json` | Hooks in `hooks/hooks.json` |
| Must manually copy | Install with `/plugin install` |

## Distribution

- Load multiple plugins: `claude --plugin-dir ./plugin-one --plugin-dir ./plugin-two`
- Submit to official marketplace: `claude.ai/settings/plugins/submit` or `platform.claude.com/plugins/submit`
- Create team marketplaces for internal distribution

## Key Commands

| Command | Purpose |
|---|---|
| `claude --plugin-dir ./my-plugin` | Test plugin locally |
| `/reload-plugins` | Reload after changes |
| `/plugin install` | Install from marketplace |
| `/plugin-name:skill-name` | Invoke plugin skill |
| `/help` | See all loaded skills |

## Debugging

1. Check structure: directories at plugin root, not inside `.claude-plugin/`
2. Test components individually
3. Verify with `/reload-plugins` after changes
