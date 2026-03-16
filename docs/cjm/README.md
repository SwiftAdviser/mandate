# Customer Journey Maps

6 ключевых путей пользователя в Mandate.

## Онбординг

| # | CJM | Актор | Ключевой момент |
|---|-----|-------|-----------------|
| 1 | [Agent-First Onboarding](01-agent-first-onboarding.md) | Разработчик | SDK → register → claimUrl → dashboard |
| 2 | [Dashboard-First Onboarding](02-dashboard-first-onboarding.md) | Разработчик | GitHub auth → create agent → copy key → SDK |

## Операции

| # | CJM | Актор | Ключевой момент |
|---|-----|-------|-----------------|
| 3 | [Transaction Lifecycle](03-transaction-lifecycle.md) | AI-агент (код) | validate → sign → broadcast → confirm |
| 4 | [Approval Flow](04-approval-flow.md) | Оператор | Уведомление → review → approve/reject |
| 5 | [Policy Management](05-policy-management.md) | Оператор | Настройка лимитов, allowlist, schedule |
| 6 | [Emergency Circuit Breaker](06-emergency-circuit-breaker.md) | Оператор / Система | Kill switch — мгновенная остановка агента |

## Приоритетные улучшения (из pain points)

Критические:
- UI создания агента из дашборда (CJM 2)
- Уведомление при автоматическом circuit breaker trip (CJM 6)
- Multi-channel notifications для approvals (CJM 4)

Высокие:
- Empty state + onboarding checklist на Dashboard (CJM 2)
- Emergency button на overview page (CJM 6)
- Dry-run preview для политик (CJM 5)
- Mobile-friendly approve по ссылке (CJM 4)
- Детальный blockReason + suggestions (CJM 3)
