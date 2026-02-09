# Quickstart: Jira Issue Retrieval Service

## Purpose

Run the backend service locally with safe configuration and deterministic
responses for validation.

## Prerequisites

- Node.js 20 LTS
- MySQL 8+
- Jira account with read-only access to target project
- OAuth client credentials for AI client access

## Configuration (local)

Set environment values using a local `.env` file (never commit secrets):
- `JIRA_BASE_URL`
- `JIRA_EMAIL`
- `JIRA_API_TOKEN`
- `JIRA_TIMEOUT_MS`
- `JIRA_RETRY_COUNT`
- `JIRA_MAX_CONCURRENT`
- `JIRA_MIN_TIME_MS`
- `OAUTH_JWKS_URL`
- `OAUTH_AUDIENCE` (optional)
- `OAUTH_ISSUER` (optional)
- `OAUTH_CLIENT_ID`
- `OAUTH_CLIENT_SECRET`
- `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`
- `AUDIT_RETENTION_DAYS`
- `AUDIT_RETENTION_INTERVAL_MINUTES`
- `PORT` (optional)

## Local Run (outline)

1. Install dependencies.
2. Configure environment variables.
3. Start the service in development mode.
4. Migrations run automatically on start to create audit tables if missing.
5. Call the MCP issue retrieval endpoint with a valid Jira key.
6. Verify the normalized response is deterministic and audit logs are recorded.

## Validation Checklist

- Jira calls are read-only.
- Each request creates an audit log entry.
- Errors are clear and stable.
- No Jira credentials are returned to the client.

**Validation run**: Checklist verified by code review only (no runtime test).
