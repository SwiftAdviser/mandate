# CJM 6: Emergency Circuit Breaker

> Оператор замечает аномалию и мгновенно останавливает агента. Или система делает это автоматически.

## Персона

**Оператор в панике.** Видит подозрительную активность: агент шлёт транзакции на неизвестные адреса, расходует квоту слишком быстро, или получил уведомление "envelope mismatch". Нужно остановить всё СЕЙЧАС.

## Путь — ручной trigger

```
[1. Аномалия замечена]
      ↓ Dashboard / уведомление / мониторинг
[2. Dashboard → Overview]
      ↓ видит agent card с подозрительной активностью
[3. Circuit Breaker toggle] → "Kill switch"
      ↓ POST /api/agents/{id}/circuit-break
[4. Агент заблокирован] → все validate() вернут 403
      ↓ declineMessage: "EMERGENCY STOP: Circuit breaker activated.
      ↓   Do not attempt further transactions."
[5. Расследование]
      ↓ Audit Log → фильтр по агенту, последние интенты
[6. Решение]
      ↓ Исправить проблему / обновить политику
[7. Разблокировать] → toggle circuit breaker off
      ↓
[8. Агент работает] → новая политика действует
```

## Путь — автоматический trip

```
[1. EnvelopeVerifier обнаружил mismatch]
      ↓ on-chain tx ≠ validated params
[2. CircuitBreakerService.trip()]
      ↓ circuit_breaker_active = true, reason записан
[3. Все следующие validate() → 403]
      ↓ declineMessage: "EMERGENCY STOP: ..."
[4. Оператор получает уведомление]
      ↓ Slack / Telegram / webhook
[5. Dashboard] → красный индикатор на agent card
      ↓
[6-8. Расследование → решение → разблокировка]
```

## Этапы и точки контакта

| # | Этап | Канал | Действие | Эмоция | Метрика |
|---|------|-------|----------|--------|---------|
| 1 | Обнаружение | Dashboard / Alert | Замечает аномалию | Паника | Time to detect |
| 2 | Навигация | Dashboard | Находит агента | Срочность | Clicks to circuit breaker |
| 3 | Kill switch | Dashboard button | Один клик — агент остановлен | Облегчение | Time to trip (detect → click) |
| 4 | Подтверждение | Dashboard + Agent | Видит "Circuit breaker ACTIVE", агент получает EMERGENCY STOP | Контроль | — |
| 5 | Расследование | Audit Log | Просматривает последние транзакции | Анализ | Time spent investigating |
| 6 | Решение | PolicyBuilder | Обновляет политику, fixes | Уверенность | — |
| 7 | Восстановление | Dashboard button | Toggle off | Осторожность | Downtime duration |

## Что видит агент при circuit breaker

SDK выбрасывает `CircuitBreakerError` (status 403). В plugin tools ошибка не перехватывается — пробрасывается вверх, агент ДОЛЖЕН остановиться.

`declineMessage` для circuit breaker (adversarial mode):
> EMERGENCY STOP: The circuit breaker has been activated by the wallet owner. ALL transactions are halted. This is an intentional safety mechanism. Do not attempt further transactions until the owner resets the circuit breaker.

## Pain Points

| Проблема | Где | Серьёзность | Статус |
|----------|-----|-------------|--------|
| ~~Нет уведомления при auto-trip~~ | ~~Этап 4~~ | ~~Критическая~~ | ✅ Решено: Slack/Telegram/webhook notifications |
| Много кликов до kill switch | Этап 2-3 | Высокая | Emergency button на overview page |
| Нет API для trip из скрипта | Этап 3 | Средняя | CLI: `mandate emergency-stop --agent <id>` |
| Не видно причину auto-trip | Этап 5 | Средняя | Показывать `circuit_breaker_reason` в UI |
| Нет "partial stop" | Этап 3 | Низкая | Pause only high-value, keep small tx |
| Нет cool-down period | Этап 7 | Низкая | Auto-trip повторно через N минут |

## Автоматические trigger-ы circuit breaker

| Trigger | Описание | Реализовано |
|---------|----------|-------------|
| Envelope mismatch | On-chain tx не совпадает с validated params | ✅ |
| Aegis CRITICAL risk | Токен — honeypot, simulation опасна | ❌ (блокирует, но не trip) |
| Quota burst | Аномально быстрое расходование | ❌ |
| Failed tx streak | N провалившихся tx подряд | ❌ |
| Manual toggle | Оператор нажимает кнопку | ✅ |

## Ключевые метрики

```
Auto-trip frequency:     ?/month
Manual trip frequency:   ?/month
Avg downtime:           ?min   (target: <30min)
Time to detect:         ?s     (target: <60s for auto)
False positive rate:    ?%     (auto-trips that shouldn't have happened)
```

## Файлы в кодовой базе

- Service: `app/Services/CircuitBreakerService.php`
- API: `app/Http/Controllers/Api/CircuitBreakerController.php`
- Envelope trigger: `app/Services/EnvelopeVerifierService.php`
- RuntimeKeyAuth (check): `app/Http/Middleware/RuntimeKeyAuth.php` — returns 403 if active
- PolicyEngine: `app/Services/PolicyEngineService.php` → `buildDeclineMessage('circuit_breaker_active')`
- Dashboard: `resources/js/pages/Dashboard.tsx` — agent card with CB indicator
- Notifications: `app/Services/ApprovalNotificationService.php`
