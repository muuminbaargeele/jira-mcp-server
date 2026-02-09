# Jira MCP Server

Backend-only service that lets an AI client retrieve Jira issue data through a
secure MCP endpoint. The service normalizes Jira responses, keeps output
deterministic, and records every Jira interaction for auditing.

## Key Features

- Secure OAuth client-credentials access (bearer token).
- Deterministic, normalized Jira issue output for AI use.
- Audit logging for requests, responses, and errors.
- Read-only Jira access with stable error responses.

## Tech Stack

- Node.js + TypeScript
- NestJS
- TypeORM + MySQL
- JOSE for JWT validation

## Prerequisites

- Node.js 20 LTS
- MySQL 8+
- Jira account with read-only access to target project
- OAuth client credentials (client id/secret) and JWKS URL

## Getting Started

1. Install dependencies.
2. Create a local `.env` file with the required variables.
3. Start the service in development mode.

```bash
npm install
npm run start:dev
```

## Configuration (.env)

Required variables:

- `JIRA_BASE_URL`
- `JIRA_EMAIL`
- `JIRA_API_TOKEN`
- `JIRA_TIMEOUT_MS`
- `JIRA_RETRY_COUNT`
- `JIRA_MAX_CONCURRENT`
- `JIRA_MIN_TIME_MS`
- `OAUTH_JWKS_URL`
- `OAUTH_CLIENT_ID`
- `OAUTH_CLIENT_SECRET`
- `DB_HOST`
- `DB_PORT`
- `DB_NAME`
- `DB_USER`
- `DB_PASSWORD`
- `AUDIT_RETENTION_DAYS`
- `AUDIT_RETENTION_INTERVAL_MINUTES`

Optional variables:

- `OAUTH_AUDIENCE`
- `OAUTH_ISSUER`
- `PORT`

## API

### Retrieve a Jira issue

`POST /mcp/jira/issue`

Headers:

- `Authorization: Bearer <access_token>`

Body:

```json
{
  "key": "ABC-123"
}
```

Notes:

- The response is a normalized issue payload.
- Errors are stable and do not expose Jira credentials.

## Scripts

- `npm run build` - compile TypeScript into `dist/`
- `npm run start` - run compiled output
- `npm run start:dev` - run with ts-node
- `npm run lint` - lint TypeScript
- `npm run format` - format source files

## Project Notes

- Migrations run automatically on startup to create audit tables if missing.
- This project is backend-only and has no UI.
