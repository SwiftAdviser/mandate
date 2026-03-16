# Feature Brainstorm — всё подряд

*Дата: 2026-03-12. Статус: сырые идеи, без приоритетов.*

---

## Текущее ядро (уже есть)

- `POST /validate` — policy check перед подписью
- `POST /intents/{id}/events` — envelope verify после broadcast
- Spend limits (per-tx / daily / monthly USD)
- Allowlist адресов
- Circuit breaker
- Approval queue (human-in-the-loop)
- Quota tracking

---

## Блок 1: Умный validate()

Расширение существующего `/validate` — дополнительные проверки в том же API вызове.

### 1.1 Honeypot detection
Агент хочет купить токен → Web3 Antivirus API проверяет → honeypot = blocked.
*Инструмент уже есть: web3antivirus.io API + aegis402.com*

### 1.2 Agent reputation scoring (ERC-8004)
Агент взаимодействует с другим агентом/контрактом → Mandate проверяет его ERC-8004 репутацию → низкий скор = флаг или блок.
*Инструмент уже есть: 8004scan.io API*

### 1.3 Counterparty scoring
Любой адрес получателя → проверка: OFAC sanctions list, known drainer addresses, mixer/tornado cash, fresh wallet (< 7 дней).

### 1.4 Contract verification check
Перед взаимодействием с контрактом → проверить верифицирован ли он на Etherscan/Sourcify. Неверифицированный контракт = флаг.

### 1.5 Gas anomaly protection
Если gas в транзакции в 5x выше обычного → блок или флаг. Защита от MEV / front-run manipulation.

### 1.6 Slippage protection для свапов
Если агент делает swap → проверить ожидаемый slippage. Выше порога = блок.

### 1.7 Velocity limits
Максимум N транзакций в час/день — независимо от суммы. Защита от зацикленных агентов.

### 1.8 Time-based rules
Не исполнять транзакции между 02:00–06:00 UTC. Настраиваемые временные окна.

---

## Блок 2: Behavioral Intelligence

Агент как субъект во времени, не только в моменте.

### 2.1 Behavioral drift detection
Hash chain поведения агента: каждые N транзакций создаётся снапшот паттерна (типы транзакций, адреса, суммы). Если хэш меняется резко — детект + алёрт.
*Запрос из первого артефакта: чел из EIP-8004 чата ищет именно это.*

### 2.2 Anomaly scoring per transaction
ML модель на истории агента: "насколько эта транзакция похожа на предыдущие 200?" Аномальная = требует approval.

### 2.3 Intent classification
Автоматически определять тип действия агента (transfer / swap / stake / approve / mint) и применять разные политики к разным типам.

### 2.4 New recipient detection
Агент впервые отправляет на адрес → автоматический флаг + опциональный approval. Старые адреса = меньше трения.

---

## Блок 3: On-chain Intelligence

Данные которые есть только у нас.

### 3.1 Unprotected agent scanner
Находить агентов в проде (по USDC flows + 8004scan) у которых нет Mandate. Персональный аутрич: "ваш агент двигает деньги без защиты".

### 3.2 Agent activity dashboard
Публичный или приватный дашборд: все агенты зарегистрированные в ERC-8004, их активность, объём транзакций, репутация.

### 3.3 Market intelligence
Агрегированная статистика: сколько агентов в проде, какие цепочки, средние суммы транзакций. Positioning tool.

---

## Блок 4: ERC-8183 Policy Hook

Mandate как reference implementation стандарта.

### 4.1 beforeAction() hook
Стандартизированный интерфейс: любой ERC-8183 совместимый контракт подключает Mandate как policy hook.

### 4.2 afterAction() hook
Envelope verify + reputation update в ERC-8004 после каждой завершённой транзакции.

### 4.3 Hook marketplace
Готовые policy hooks: "DeFi trader", "payment agent", "insurance broker". Установка в один клик.

---

## Блок 5: Key Custody (опционально)

Ответ на CTO objection: "server-side можно обойти".

### 5.1 TEE key custody (опциональный tier)
Опциональный режим: ключ хранится в TEE Mandate, не у разработчика. Ключ физически не может подписать без прохождения policy check.
*Делает Mandate конкурентом Turnkey — осторожно.*

### 5.2 MPC signing
Distributed key: разработчик держит 1 из 2 шардов, Mandate держит второй. Подпись требует обоих.

---

## Блок 6: Dashboard & UX

### 6.1 Policy Builder UI
Визуальный конструктор политик без кода. Drag-and-drop правила.

### 6.2 Transaction simulation
Перед validate — симуляция транзакции (tenderly/anvil). Показать что произойдёт до исполнения.

### 6.3 Multi-agent management
Одна компания → 50 агентов → общий дашборд, групповые политики, сравнение активности.

### 6.4 Team approval flows
Большая транзакция → нужно одобрение 2 из 3 людей в команде. Multi-sig для approval.

### 6.5 Audit report export
PDF/CSV отчёт по всем транзакциям агента за период. Нужно для инвесторов, аудиторов, регуляторов.

---

## Блок 7: Интеграции

### 7.1 EthSkills skill
Mandate как официальный skill в ethskills.com/mandate/ — встроенная дистрибуция через Austin Griffith.

### 7.2 21st component
React компонент "MandateProvider" в registry 21st.dev — 1.4M разработчиков.

### 7.3 Privy/Turnkey partnership
Официальная интеграция: "Mandate + Privy = complete agent security stack".

### 7.4 More framework plugins
Расширить пакеты: LangGraph, AutoGen, CrewAI, Autogen Studio.

---

## Блок 8: Бизнес-модель идеи

### 8.1 Per-validation pricing
Платишь за каждый validate() вызов. Чем больше агентов — тем больше платишь.

### 8.2 Insurance product
"Если Mandate пропустил дрейн — мы покрываем до $X". Страховка на policy layer.
*Требует: партнёрство со страховщиком или резервный фонд.*

### 8.3 Enterprise tier
Unlimited validations + custom policies + SLA + dedicated support + audit reports.

### 8.4 White-label для wallet providers
Privy/0xGasless встраивают Mandate policy engine под своим брендом.

---

## Приоритеты (первая интуиция)

**Сделать сейчас** (быстро, высокий impact):
- Honeypot detection (Web3 Antivirus API уже есть)
- Agent reputation scoring (8004scan уже есть)
- Counterparty OFAC/blacklist check

**Сделать в следующем спринте**:
- Behavioral drift detection (это уникальная дифференциация)
- Unprotected agent scanner (это GTM инструмент)
- ERC-8183 hook interface

**Обсудить позже**:
- TEE key custody (меняет позиционирование)
- Insurance product (требует капитал)
- 21st component (требует партнёрство)
