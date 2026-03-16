# CJM 2: Dashboard-First Onboarding

> Разработчик сначала заходит в дашборд, создаёт агента из UI, потом подключает SDK.

## Персона

Разработчик, который хочет сначала понять продукт через UI, настроить всё, а потом интегрировать. Или менеджер/тимлид, который настраивает инфраструктуру для команды.

## Путь

```
[1. Лендинг] → mandate.krutovoy.me
      ↓
[2. "Sign in with GitHub"]
      ↓
[3. Dashboard] → пустой, нет агентов
      ↓
[4. "Create Agent"] → форма: name, evmAddress, chainId
      ↓ POST /api/agents/create — получает runtimeKey
[5. Копирует runtimeKey]
      ↓
[6. Настраивает Policy] → перед тем как агент начнёт работать
      ↓
[7. Вставляет runtimeKey в env агента]
      ↓
[8. Агент работает] → транзакции видны в дашборде
```

## Этапы и точки контакта

| # | Этап | Канал | Действие | Эмоция | Метрика |
|---|------|-------|----------|--------|---------|
| 1 | Лендинг | Браузер | Читает value prop, смотрит "how it works" | Интерес | Landing → login conversion |
| 2 | Auth | GitHub OAuth | Один клик | Ожидание | OAuth completion rate |
| 3 | Пустой дашборд | Браузер | Видит empty state. Что дальше? | Растерянность | Bounce rate on empty dashboard |
| 4 | Создание агента | Браузер → API | Заполняет форму, получает runtimeKey | Удовлетворение | Agent creation rate |
| 5 | Копирование ключа | Браузер | Copy-to-clipboard. Один шанс увидеть ключ | Тревога ("а если потеряю?") | — |
| 6 | Настройка политики | PolicyBuilder | Лимиты, allowlist, schedule | Контроль | Policies configured before first tx |
| 7 | Интеграция | IDE / Terminal | Добавляет `MANDATE_RUNTIME_KEY` в .env | Рутина | Time to first validate call |
| 8 | Первая транзакция | Dashboard | Видит intent в AuditLog — "работает!" | Aha moment | Time to first intent |

## Pain Points

| Проблема | Где | Серьёзность | Идея решения |
|----------|-----|-------------|--------------|
| Пустой дашборд без CTA | Этап 3 | Высокая | Empty state с "Create your first agent" + quick start guide |
| runtimeKey показывается один раз | Этап 5 | Высокая | Возможность пересоздать ключ; показывать до закрытия модала |
| Нет формы создания агента в UI | Этап 4 | Критическая | **Сейчас нет UI** — только API endpoint. Нужна страница/модал |
| Не знает какой evmAddress вставить | Этап 4 | Средняя | Подсказка: "This is your agent's wallet address" |
| Не понимает зачем chainId | Этап 4 | Низкая | Dropdown с поддерживаемыми сетями |

## Ключевые конверсии

```
landing → GitHub sign in          — ?%
sign in → create agent            — ?%
create agent → first validate     — ?%  (← TTI, ключевая метрика)
first validate → policy configured — ?%
```

## Файлы в кодовой базе

- API: `app/Http/Controllers/Api/AgentRegistrationController.php` → `create()`
- Dashboard: `resources/js/pages/Dashboard.tsx` (нужен empty state + create agent UI)
- PolicyBuilder: `resources/js/pages/PolicyBuilder.tsx`
- Auth: `app/Http/Controllers/Auth/GitHubController.php`

## TODO

- [ ] UI для создания агента в дашборде (модал или страница /agents/new)
- [ ] Empty state на Dashboard с onboarding flow
- [ ] Показывать runtimeKey в модале с copy button + warning "store safely"
