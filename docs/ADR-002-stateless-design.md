# ADR-002: Stateless design

Status: Superseded by ADR-007

Each operation receives all required data and returns calculated output. No invocation relies on temporary memory as persistence.

This constraint applied to the first delivery only. The current platform persists operational state and event intent as described in [ADR-007](ADR-007-persistence-and-olap.md).
