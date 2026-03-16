# CTO Objection: Server-Side Policy Can Be Bypassed

**Source**: 0xGasless CTO
**Date**: 2026-03-11

## Суть возражения

> "Если policy layer на сервере — агент (или тот, кто взломал агента) может убрать и перекодить метод validate(), обойдя проверку целиком."

## Техническая суть

Mandate сейчас — это конвенция, а не криптографическое принуждение.

Текущий flow:
```
agent code → validate() → intentId → sign locally → broadcast → postEvent()
```

Что происходит если агент скомпрометирован:
```
agent code → [skip validate()] → sign locally → broadcast directly
```

Mandate никогда не узнает. Транзакция уйдёт. Circuit breaker не сработает.
Никакого on-chain enforcement нет — только конвенция что агент вызовет API.

## Векторы обхода

1. **Prompt injection** → агент переписывает свои tool-вызовы, пропускает validate()
2. **Компрометация кода агента** → злоумышленник убирает вызов MandateClient из исходника
3. **Подмена SDK** → агент использует raw viem напрямую, минуя @mandate/sdk
4. **Malicious wrapper** → агент обёрнут в proxy, который перехватывает и выполняет транзакции до Mandate-проверки

## Что это значит архитектурно

Mandate как конвенция работает пока:
- Код агента не скомпрометирован
- Агент добросовестно вызывает validate()
- Среда исполнения доверенная

Mandate НЕ работает как принуждение если агент или его среда скомпрометированы.

## Как это решается (варианты)

### A. On-chain enforcement (сильнейшая гарантия)
Smart contract принимает транзакции только с валидным intentId.
Broadcast без intentId → reverts.
Проблема: требует изменений в контрактах; не работает для нативных переводов ETH.

### B. Key custody with policy gate (TEE или MPC)
Приватный ключ хранится не у агента, а в системе (TEE/MPC), которая не подпишет без policy check.
Проблема: противоречит non-custodial принципу Mandate ("ключ никогда не покидает твою машину").

### C. Session keys с on-chain политикой (ERC-4337)
Agent держит session key с ограниченными правами (allowlist адресов, лимиты сумм).
Компрометация session key → ограниченный ущерб.
Мастер-ключ не у агента.
Проблема: требует smart account, добавляет сложность, газ.

### D. Envelope verification как детектив (текущий Mandate)
Mandate не предотвращает bypass, но детектирует его.
Если агент broadcast без postEvent() → circuit breaker по аномалии.
Если tx не соответствует validated payload → circuit breaker.
Это reactive, не proactive.

## Честная оценка

CTO прав: Mandate в текущей архитектуре — это guardrail для честного агента, не для скомпрометированного.

Позиционирование должно это учитывать:
- Mandate защищает от hallucinations, ошибок, случайных превышений лимитов
- Mandate НЕ защищает от полной компрометации среды исполнения агента
- Для полной защиты нужен on-chain enforcement или key custody layer

Это не провал продукта — это честное место в стеке.
Вопрос: достаточно ли этого для target ICP?
