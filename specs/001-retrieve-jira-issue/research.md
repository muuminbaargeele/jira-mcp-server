# Research Findings: Jira Issue Retrieval Service

## Decision 1: Jira read-only access pattern

**Decision**: Use Jira REST API in read-only mode; only issue retrieval by key.
**Rationale**: Matches spec requirement for read-only behavior and reduces risk.
**Alternatives considered**: Full CRUD access (rejected due to scope).

## Decision 2: Deterministic normalization rules

**Decision**: Normalize Jira issue fields in a stable order and omit volatile
metadata (e.g., transient links) from the AI payload.
**Rationale**: Ensures repeatable outputs for the same input.
**Alternatives considered**: Return raw Jira JSON (rejected for inconsistency).

## Decision 3: Audit logging scope

**Decision**: Log each Jira request with timestamps, latency, outcome, request
summary, response summary, and error details; redact secrets.
**Rationale**: Meets observability and audit requirements without leaks.
**Alternatives considered**: Log only errors (rejected due to audit needs).

## Decision 4: Timeouts and retries

**Decision**: Use strict per-request timeouts and limited retries for Jira
calls; return stable errors on timeout.
**Rationale**: Enforces reliability and predictable behavior.
**Alternatives considered**: Unlimited retries (rejected for unpredictability).

## Decision 5: Secret handling and client access

**Decision**: Keep Jira credentials server-side only; authenticate AI client via
OAuth client credentials (server-to-server).
**Rationale**: Prevents credential leakage and aligns with spec clarifications.
**Alternatives considered**: Shared API keys (rejected due to weaker controls).

## Decision 6: Audit retention

**Decision**: Retain audit logs for 90 days.
**Rationale**: Matches clarification and balances audit value vs storage cost.
**Alternatives considered**: 30 days, 1 year, 7 years.
