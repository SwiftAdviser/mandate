---
name: mandate
description: Validates financial tool calls with Mandate before execution
events:
  - message:preprocessed
enabled: true
---

Safety net hook: intercepts financial tool calls (Locus, Bankr, Sponge, any swap/transfer/send)
and validates with Mandate API before they execute.

Fails closed: if Mandate is unreachable, the tool call is blocked.
Requires: MANDATE_RUNTIME_KEY environment variable.

Install: copy this directory to <workspace>/hooks/mandate/ or ~/.openclaw/hooks/mandate/
Enable: openclaw hooks enable mandate
