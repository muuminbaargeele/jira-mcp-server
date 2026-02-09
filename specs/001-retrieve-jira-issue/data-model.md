# Data Model: Jira Issue Retrieval Service

## Overview

Only audit and monitoring data are persisted. Jira issue payloads are retrieved
on demand and normalized for response; they are not stored as source of truth.

## Entities

### JiraInteractionLog

**Purpose**: Immutable audit record for every Jira request.

**Fields**:
- `id`: unique identifier
- `timestamp`: request start time (UTC)
- `jiraKey`: requested issue key
- `requestId`: correlation id for tracing
- `clientId`: AI client identifier (OAuth client id)
- `outcome`: success | error | timeout
- `httpStatus`: response status (if available)
- `latencyMs`: end-to-end latency
- `responseSummary`: stable summary of returned data (no secrets)
- `errorCode`: normalized error code (if any)
- `errorMessage`: safe, non-secret error message
- `payloadHash`: hash of normalized response (for determinism checks)

**Notes**:
- Secrets and raw tokens are never stored.
- Response summaries must exclude sensitive fields.

## Non-Persisted Domain Objects

### JiraIssue

Authoritative issue data retrieved from Jira per request.

### NormalizedIssue

Deterministic, AI-ready representation of JiraIssue with:
- Standard fields (key, summary, status, type, priority, assignee, reporter)
- Timestamps (created, updated)
- Description (sanitized)
- Attachments metadata (name, size, mime type, url if allowed)
