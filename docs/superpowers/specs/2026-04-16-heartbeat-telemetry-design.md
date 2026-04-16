# Heartbeat Telemetry System

## Context

Mandate serves `SKILL.md` as a static file. There is no visibility into how many agents fetch it, how often, or which version they have. Locus (paywithlocus.com) ships a heartbeat system where agents check in periodically, enabling telemetry, version-update detection, and daily feedback. Mandate needs a similar system to:

1. Track agent adoption (how many agents fetch SKILL.md, how often)
2. Enable version-update notifications (agents detect when SKILL.md changes)
3. Provide a global admin dashboard for heartbeat analytics
4. Auto-publish to ClawhHub alongside production deploys

## 1. Dynamic SKILL.md Endpoint

### Current state

`public/SKILL.md` is a static file served directly by the web server (Apache/Nginx `.htaccess` rule: if file exists, serve it). Laravel never sees the request.

### Change

- **Move** `public/SKILL.md` to `resources/skill.md` (out of docroot)
- **Add route** `GET /skill.md` in `routes/web.php` (no auth middleware)
- **New controller** `App\Http\Controllers\Api\SkillController@show`
  - Reads `resource_path('skill.md')` and returns it as `text/markdown; charset=utf-8`
  - Sets `X-Skill-Version` response header from frontmatter version field
  - Logs a heartbeat row (fire-and-forget INSERT, same pattern as `ScanTelemetryController`)
  - If `Authorization: Bearer mndt_...` header present, resolves agent_id via `AgentApiKey` lookup (reuses `RuntimeKeyAuth` logic but doesn't reject anonymous callers)
  - Anonymous callers: logs IP + User-Agent only
  - Rate limit: none (INSERTs are cheap, can add later if needed)

### Response

```
HTTP/1.1 200 OK
Content-Type: text/markdown; charset=utf-8
X-Skill-Version: 1.2.0
Cache-Control: public, max-age=3600

---
name: mandate
version: 1.2.0
...
```

## 2. Database: `skill_heartbeats` Table

New migration. Append-only (no `updated_at`).

```
skill_heartbeats
├── id           bigint auto-increment PK
├── agent_id     uuid nullable (FK agents.id, ON DELETE SET NULL)
├── ip           varchar(45)
├── user_agent   varchar(512) nullable
├── skill_version varchar(20)
├── created_at   timestamp
```

**Indexes:**
- `(created_at)` for time-range aggregation
- `(agent_id, created_at)` for per-agent queries

**Model:** `App\Models\SkillHeartbeat` (fillable: agent_id, ip, user_agent, skill_version)

## 3. Dashboard: Heartbeats Page (Admin-only)

New Inertia page at `/heartbeats`. Admin-gated (check `auth()->id()` against admin user ID, or add `is_admin` column to users table).

### Controller method

`DashboardController@heartbeats` queries `skill_heartbeats` table:
- Daily counts for last 30 days (total + unique agent_id)
- Keyed vs anonymous ratio (agent_id IS NOT NULL vs IS NULL)
- Top agents by heartbeat count this week
- Total counts: today, this week, this month

### Page: `resources/js/pages/Heartbeats.tsx`

Sections:
- **Header**: "Skill Heartbeats" with total count badges (today / week / month)
- **Daily chart**: Simple bar chart or number grid, last 30 days. Each day shows total heartbeats + unique agents.
- **Keyed vs Anonymous**: Two-number comparison (e.g., "142 keyed / 89 anonymous this week")
- **Top Agents table**: Agent name, last heartbeat, count this week, count total

### Sidebar nav

Add to `DashboardLayout.tsx` NAV array:
```ts
{ href: '/heartbeats', label: 'Heartbeats', icon: Activity, adminOnly: true }
```

Gate rendering: `if (item.adminOnly && !isAdmin) return null`

### Route

```php
// routes/web.php (inside auth middleware group)
Route::get('/heartbeats', [DashboardController::class, 'heartbeats']);
```

## 4. Sync Script + ClawhHub Publishing

### Updated `scripts/sync-skill.sh`

After existing sync targets, add:

```bash
# Publish to ClawhHub
echo "Publishing to ClawhHub..."
npx clawhub@latest publish "$ROOT/packages/openclaw-plugin/skills/mandate" \
  --slug mandate \
  --version "$VERSION" \
  --changelog "SKILL.md v${VERSION}"
echo "ClawhHub publish done."
```

This uses the already-synced skill folder at `packages/openclaw-plugin/skills/mandate/` which contains SKILL.md.

**Prerequisite**: `clawhub login` must have been run once on the deploy machine (stores token). Already authenticated as `swiftadviser` on local machine.

## 5. SKILL.md Heartbeat Instructions

Add a new section to `public/SKILL.md` (which becomes `resources/skill.md`) near the end:

```markdown
## Heartbeat

Fetch this file at least once every 24 hours to stay current:

\`\`\`bash
curl -s https://app.mandate.md/skill.md \
  -H "Authorization: Bearer $MANDATE_RUNTIME_KEY" \
  -o /path/to/cached/SKILL.md
\`\`\`

Check the `X-Skill-Version` response header against your cached version.
If it changed, re-read the file for updated instructions.

The Authorization header is optional. Passing it lets Mandate track
which agents are active. Without it, the fetch is anonymous.
```

## Files to Create/Modify

| Action | File |
|--------|------|
| Move | `public/SKILL.md` to `resources/skill.md` |
| Create | `database/migrations/xxxx_create_skill_heartbeats_table.php` |
| Create | `app/Models/SkillHeartbeat.php` |
| Create | `app/Http/Controllers/Api/SkillController.php` |
| Create | `resources/js/pages/Heartbeats.tsx` |
| Modify | `routes/web.php` (add GET /skill.md + GET /heartbeats) |
| Modify | `app/Http/Controllers/Web/DashboardController.php` (add heartbeats method) |
| Modify | `resources/js/layouts/DashboardLayout.tsx` (add nav item) |
| Modify | `scripts/sync-skill.sh` (add clawhub publish) |
| Modify | `resources/skill.md` (add heartbeat section) |

## Verification

1. **Endpoint**: `curl -I https://app.mandate.md/skill.md` returns `X-Skill-Version: 1.2.0` + markdown body
2. **Anonymous tracking**: Fetch without Bearer token, check `skill_heartbeats` table has row with null agent_id
3. **Keyed tracking**: Fetch with Bearer `mndt_live_...`, check row has correct agent_id
4. **Dashboard**: Navigate to `/heartbeats`, verify daily counts and top agents render
5. **Sync + ClawhHub**: Run `bash scripts/sync-skill.sh`, verify `clawhub inspect mandate` shows bumped version
6. **PHPUnit**: Test SkillController returns correct content-type, version header, and creates heartbeat row
