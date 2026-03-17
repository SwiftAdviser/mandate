# Customer Journey Maps

6 ключевых путей пользователя в Mandate.

## Онбординг

| # | CJM | Актор | Ключевой момент |
|---|-----|-------|-----------------|
| 1 | [Agent-First Onboarding](01-agent-first-onboarding.md) | Разработчик | SDK/plugin → register → claimUrl → dashboard |
| 2 | [Dashboard-First Onboarding](02-dashboard-first-onboarding.md) | Разработчик | GitHub auth → create agent → copy key → SDK |

## Операции

| # | CJM | Актор | Ключевой момент |
|---|-----|-------|-----------------|
| 3 | [Transaction Lifecycle](03-transaction-lifecycle.md) | AI-агент (код) | validate (intelligence pipeline) → sign → broadcast → confirm |
| 4 | [Approval Flow](04-approval-flow.md) | Оператор | Уведомление (Slack/TG) → review → approve/reject |
| 5 | [Policy Management](05-policy-management.md) | Оператор | Настройка лимитов, allowlist, schedule, risk scan |
| 6 | [Emergency Circuit Breaker](06-emergency-circuit-breaker.md) | Оператор / Система | Kill switch — мгновенная остановка агента |

## Resolved (from previous pain points)

- ✅ Агент не знает почему заблокировали → `declineMessage` с adversarial/constructive режимами (CJM 3)
- ✅ Multi-channel notifications → Slack + Telegram + Custom webhook (CJM 4)
- ✅ Агент не знает что ждать при approval → `waitForApproval()` в SDK (CJM 4)
- ✅ Непонятно зачем одобрять → `reason` поле — "why" intelligence layer (CJM 4)
- ✅ Нет уведомления при auto circuit breaker trip → notifications (CJM 6)

## Open (prioritized)

Критические:
- UI создания агента из дашборда (CJM 2)

Высокие:
- Empty state + onboarding checklist на Dashboard (CJM 2)
- Emergency button на overview page (CJM 6)
- Dry-run preview для политик (CJM 5)
- Mobile-friendly approve по ссылке (CJM 4)

Средние:
- Policy templates: Conservative / Standard / Permissive (CJM 5)
- Policy diff between versions (CJM 5)
- Audit log filter by approvals (CJM 4)
