# CJM 5: Policy Management

> Оператор настраивает правила для агента: лимиты, белые списки, расписание.

## Персона

Владелец агента. Уже прошёл онбординг, агент работает. Хочет ужесточить или ослабить правила, добавить новый контракт в allowlist, настроить approval threshold.

## Путь

```
[1. Dashboard] → видит текущие квоты, замечает проблему
      ↓ "Квота почти исчерпана" или "Агент пытался отправить на неразрешённый адрес"
[2. Policies page] → /policies
      ↓ видит текущую политику
[3. Меняет параметры] → PolicyBuilder форма
      ↓
  ┌── Spend limits ──────────────────┐
  │ per tx: $100                     │
  │ per day: $1,000                  │
  │ per month: $10,000               │
  └──────────────────────────────────┘
  ┌── Access control ────────────────┐
  │ allowed addresses: [0x...]       │
  │ blocked selectors: [0xa9059cbb]  │
  │ require approval > $500          │
  │ require approval selectors: [..] │
  └──────────────────────────────────┘
  ┌── Schedule ──────────────────────┐
  │ days: Mon-Fri                    │
  │ hours: 9:00-17:00                │
  └──────────────────────────────────┘
      ↓
[4. Save] → POST /api/agents/{id}/policies
      ↓ Старая политика деактивируется, новая — активна
[5. Версионирование] → version +1, старая сохраняется в истории
      ↓
[6. Агент сразу работает по новым правилам]
```

## Этапы и точки контакта

| # | Этап | Канал | Действие | Эмоция | Метрика |
|---|------|-------|----------|--------|---------|
| 1 | Триггер | Dashboard overview | Видит quota bar, blocked intents, alerts | Беспокойство | Dashboard → policies nav |
| 2 | Текущая политика | PolicyBuilder page | Просматривает текущие настройки | Понимание | — |
| 3 | Редактирование | Форма | Меняет значения, переключает toggle'ы | Контроль | Fields changed per save |
| 4 | Сохранение | API call | Instant response, no downtime | Уверенность | Save success rate |
| 5 | Результат | Dashboard | Агент работает по новым правилам | Спокойствие | Blocked intents after policy change |

## Pain Points

| Проблема | Где | Серьёзность | Идея решения |
|----------|-----|-------------|--------------|
| Нет preview "что бы произошло" | Этап 3 | Высокая | Dry-run: "С этой политикой 3 из 10 последних tx были бы заблокированы" |
| Нет шаблонов политик | Этап 3 | Средняя | Presets: "Conservative", "Standard", "Permissive" |
| Нет diff между версиями | Этап 5 | Средняя | Policy history с diff view |
| Не знает что такое selector | Этап 3 | Средняя | Human-readable: "ERC20 transfer" вместо "0xa9059cbb" |
| Один агент = одна политика | Этап 3 | Низкая (пока) | Conditional policies, profiles |
| Изменения не видны на timeline | Этап 6 | Низкая | Маркер "Policy v3 applied" в audit log |
| Нет undo / rollback | Этап 4 | Средняя | "Revert to version X" button |

## Параметры политики (текущие)

| Параметр | Тип | Пример | PolicyEngine check |
|----------|-----|--------|-------------------|
| `spend_limit_per_tx_usd` | decimal | 100.00 | `per_tx_limit_exceeded` |
| `spend_limit_per_day_usd` | decimal | 1000.00 | `daily_limit_exceeded` |
| `spend_limit_per_month_usd` | decimal | 10000.00 | `monthly_limit_exceeded` |
| `allowed_addresses` | string[] | ["0x..."] | `address_not_in_allowlist` |
| `allowed_contracts` | string[] | ["0x..."] | Contract allowlist |
| `blocked_selectors` | string[] | ["0xa9059cbb"] | `blocked_selector` |
| `require_approval_selectors` | string[] | ["0x095ea7b3"] | Triggers approval |
| `require_approval_above_usd` | decimal | 500.00 | Triggers approval |
| `max_gas_limit` | string | "500000" | Gas limit check |
| `max_value_wei` | string | "1e18" | Native value check |
| `schedule` | json | {days, hours} | `outside_schedule` |
| `risk_scan_enabled` | bool | true | Aegis scan toggle |

## Файлы в кодовой базе

- Frontend: `resources/js/pages/PolicyBuilder.tsx`
- API: `app/Http/Controllers/Api/PolicyController.php` → `store()`, `index()`, `show()`
- Model: `app/Models/Policy.php`
- Engine: `app/Services/PolicyEngineService.php`
