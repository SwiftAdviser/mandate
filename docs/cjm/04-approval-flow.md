# CJM 4: Approval Flow

> Транзакция требует ручного одобрения. Человек получает уведомление, принимает решение.

## Персона

**Оператор** — владелец агента. Получает уведомление о high-value транзакции, должен быстро решить: approve или reject. Может быть на телефоне.

## Триггеры approval

- `require_approval_above_usd` — сумма выше порога (например $500)
- `require_approval_selectors` — вызов определённой функции контракта
- Aegis risk scan вернул `HIGH` — принудительный approval
- Reputation score агента низкий — unknown/unregistered agent (EIP-8004)
- Reason scanner `require_approval` — подозрительный reason текст

## Путь

```
[1. Агент вызывает validate()]
      ↓ PolicyEngine: requiresApproval = true
[2. Intent → status: approval_pending]
      ↓ ApprovalQueue создан, TTL 1 час
[3. Уведомление оператору]
      ↓ Slack / Telegram / Custom webhook (SendApprovalNotification job)
[4. Оператор видит уведомление]
      ↓ переходит в дашборд
[5. Approvals page] → карточка с деталями
      ↓ видит: agent, action, amount, to, risk level, reason, time left
[6. Решение: Approve / Reject]
      ↓ POST /api/approvals/{id}/decide
[7a. Approved] → intent status → approved → агент может broadcast
[7b. Rejected] → intent status → failed → агент получает ошибку

Агент-сторона:
[A. SDK throws ApprovalRequiredError]
      ↓
[B. waitForApproval(intentId)] → polling /status каждые 5s, TTL 1h
      ↓
[C. status=approved → продолжает sign + broadcast]
    status=failed → throws MandateError ("rejected")
    status=expired → throws MandateError ("expired")

Альтернативный путь:
[X. Таймаут] → approval expires → intent → expired → quota released
```

## Этапы и точки контакта

| # | Этап | Канал | Действие | Эмоция | Метрика |
|---|------|-------|----------|--------|---------|
| 1 | Триггер | API (автоматически) | PolicyEngine решает что нужен approval | — | % approvals from total intents |
| 2 | Создание | API | ApprovalQueue entry + intent state | — | — |
| 3 | Уведомление | Slack / Telegram / Webhook | Карточка: agent, amount, action, reason, risk, approve/reject links | Тревога | Notification delivery time |
| 4 | Реакция | Телефон / Desktop | Оператор видит push/сообщение | Срочность | Time to see notification |
| 5 | Обзор | Dashboard /approvals | Полная карточка: calldata, reason, risk details, time left | Анализ | Time on approval page |
| 6 | Решение | Dashboard button | Approve / Reject + optional note | Ответственность | Decision time (notification → click) |
| 7 | Результат | API → SDK | Агент продолжает или получает ошибку | Облегчение | Approval rate (approved vs rejected) |

## Pain Points

| Проблема | Где | Серьёзность | Статус |
|----------|-----|-------------|--------|
| ~~Оператор не видит уведомление вовремя~~ | ~~Этап 3→4~~ | ~~Критическая~~ | ✅ Решено: Slack + Telegram + Custom webhook |
| ~~Агент не знает что ждать~~ | ~~Этап 2→7~~ | ~~Средняя~~ | ✅ Решено: `waitForApproval()` в SDK |
| ~~Непонятно зачем одобрять~~ | ~~Этап 5~~ | ~~Высокая~~ | ✅ Решено: `reason` поле — "зачем агент это делает" |
| Нет mobile-friendly approve | Этап 6 | Высокая | Approve/reject по ссылке из уведомления |
| 1 час TTL может быть мало | Этап X | Средняя | Настраиваемый TTL в политике |
| Нет истории решений | После 7 | Средняя | Audit log с фильтром по approvals |

## Notification Channels

| Канал | Статус | Формат | Настройка |
|-------|--------|--------|-----------|
| Slack webhook | ✅ Реализован | Block Kit с деталями | Dashboard → Notifications |
| Telegram bot | ✅ Реализован | Markdown + inline links | @mandatemd_bot + chat_id |
| Custom webhook | ✅ Реализован | JSON payload + HMAC signature | Dashboard → Notifications |
| Email | ❌ Не реализован | — | — |
| Push (mobile) | ❌ Не реализован | — | — |

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
- Notifications setup: `resources/js/pages/Notifications.tsx`
- Notifications service: `app/Services/ApprovalNotificationService.php`
- Notification job: `app/Jobs/SendApprovalNotification.php`
- Webhook API: `app/Http/Controllers/Api/AgentWebhookController.php`
- Telegram webhook: `app/Http/Controllers/Api/TelegramWebhookController.php`
- SDK polling: `packages/sdk/src/MandateClient.ts` → `waitForApproval()`
