# CJM 4: Approval Flow

> Транзакция требует ручного одобрения. Человек получает уведомление, принимает решение.

## Персона

**Оператор** — владелец агента. Получает уведомление о high-value транзакции, должен быстро решить: approve или reject. Может быть на телефоне.

## Триггеры approval

- `require_approval_above_usd` — сумма выше порога (например $500)
- `require_approval_selectors` — вызов определённой функции контракта
- Aegis risk scan вернул `HIGH` — принудительный approval
- Reputation score агента низкий — unknown/unregistered agent

## Путь

```
[1. Агент вызывает validate()]
      ↓ PolicyEngine: requiresApproval = true
[2. Intent → status: approval_pending]
      ↓ ApprovalQueue создан, TTL 1 час
[3. Уведомление оператору]
      ↓ Slack / Telegram / webhook (SendApprovalNotification job)
[4. Оператор видит уведомление]
      ↓ переходит в дашборд
[5. Approvals page] → карточка с деталями
      ↓ видит: agent, action, amount, to, risk level, time left
[6. Решение: Approve / Reject]
      ↓ POST /api/approvals/{id}/decide
[7a. Approved] → intent status → approved → агент может broadcast
[7b. Rejected] → intent status → failed → агент получает ошибку

Альтернативный путь:
[X. Таймаут] → approval expires → intent → expired → quota released
```

## Этапы и точки контакта

| # | Этап | Канал | Действие | Эмоция | Метрика |
|---|------|-------|----------|--------|---------|
| 1 | Триггер | API (автоматически) | PolicyEngine решает что нужен approval | — | % approvals from total intents |
| 2 | Создание | API | ApprovalQueue entry + intent state | — | — |
| 3 | Уведомление | Slack / Telegram / Webhook | Карточка: agent, amount, action, risk, approve/reject links | Тревога | Notification delivery time |
| 4 | Реакция | Телефон / Desktop | Оператор видит push/сообщение | Срочность | Time to see notification |
| 5 | Обзор | Dashboard /approvals | Полная карточка: calldata, risk details, time left | Анализ | Time on approval page |
| 6 | Решение | Dashboard button | Approve / Reject + optional note | Ответственность | Decision time (notification → click) |
| 7 | Результат | API → SDK | Агент продолжает или получает ошибку | Облегчение | Approval rate (approved vs rejected) |

## Pain Points

| Проблема | Где | Серьёзность | Идея решения |
|----------|-----|-------------|--------------|
| Оператор не видит уведомление вовремя | Этап 3→4 | Критическая | Multi-channel: Slack + Telegram + Push. Escalation при неответе |
| Непонятно зачем одобрять | Этап 5 | Высокая | Контекст в карточке: "Этот агент хочет X потому что Y" |
| Нет mobile-friendly approve | Этап 6 | Высокая | Approve/reject по ссылке из уведомления (без открытия дашборда) |
| 1 час TTL может быть мало | Этап X | Средняя | Настраиваемый TTL в политике |
| Нет истории решений | После 7 | Средняя | Audit log с фильтром по approvals |
| Агент не знает что ждать | Этап 2→7 | Средняя | SDK: `waitForApproval()` с polling или WebSocket |

## Notification Channels (текущее состояние)

| Канал | Статус | Формат |
|-------|--------|--------|
| Slack webhook | ✅ Реализован | Block Kit с кнопками |
| Telegram bot | ✅ Реализован | Markdown с inline links |
| Custom webhook | ✅ Реализован | JSON payload + HMAC signature |
| Email | ❌ Не реализован | — |
| Push (mobile) | ❌ Не реализован | — |

## Ключевые метрики

```
Avg decision time:     ?s  (target: <60s)
Approval rate:         ?%
Timeout rate:          ?%  (target: <5%)
False positive rate:   ?%  (approvals that should have been auto-allowed)
```

## Файлы в кодовой базе

- PolicyEngine trigger: `app/Services/PolicyEngineService.php`
- ApprovalQueue model: `app/Models/ApprovalQueue.php`
- Decide: `app/Http/Controllers/Api/ApprovalController.php`
- Dashboard: `resources/js/pages/Approvals.tsx`
- Notifications: `app/Services/ApprovalNotificationService.php`, `app/Jobs/SendApprovalNotification.php`
- SDK polling: `packages/sdk/src/MandateClient.ts` → `waitForApproval()`
