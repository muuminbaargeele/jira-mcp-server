# Quickstart: Normalize Jira Issue Descriptions

**Branch**: `002-normalize-jira-descriptions`  
**Date**: 2026-02-12

## What This Feature Does

When you fetch a Jira issue through the MCP server (`POST /mcp/jira/issue`), the response now includes two new fields instead of the old `description` field:

| Field | Type | Description |
|-------|------|-------------|
| `descriptionText` | `string` | Clean plain text version of the issue description. Formatting is stripped, secrets are redacted. Always a string (empty `""` if no description). |
| `descriptionRaw` | `object \| null` | The original Atlassian Document Format (ADF) JSON, exactly as Jira returned it. Temporary — will be removed in a future version. |

The old `description` field is **removed** (breaking change).

## Before & After

### Before (old response)
```json
{
  "key": "PROJ-123",
  "summary": "Fix login bug",
  "status": "In Progress",
  "description": "{\"version\":1,\"type\":\"doc\",\"content\":[{\"type\":\"paragraph\",\"content\":[{\"type\":\"text\",\"text\":\"Users cannot log in.\",\"marks\":[{\"type\":\"strong\"}]}]}]}",
  "attachments": [],
  "metadata": { "deterministic": true }
}
```

### After (new response)
```json
{
  "key": "PROJ-123",
  "summary": "Fix login bug",
  "status": "In Progress",
  "descriptionText": "Users cannot log in.",
  "descriptionRaw": {
    "version": 1,
    "type": "doc",
    "content": [
      {
        "type": "paragraph",
        "content": [
          {
            "type": "text",
            "text": "Users cannot log in.",
            "marks": [{ "type": "strong" }]
          }
        ]
      }
    ]
  },
  "attachments": [],
  "metadata": { "deterministic": true }
}
```

Notice:
- `descriptionText` contains clean text with bold formatting stripped.
- `descriptionRaw` contains the original ADF JSON as an object (not a stringified JSON).
- The old `description` field is gone.

## Secret Redaction Example

If a Jira description contains credentials:

```json
{
  "descriptionText": "Config:\nDB_HOST=localhost\nDB_PASSWORD=[REDACTED:password]\nAWS_KEY=[REDACTED:aws-key]",
  "descriptionRaw": { "...original ADF..." }
}
```

The typed placeholder `[REDACTED:password]` tells you what kind of secret was found without revealing the actual value.

## Migration Guide

If you previously used the `description` field:

| Old Field | New Field | Notes |
|-----------|-----------|-------|
| `description` | `descriptionRaw` | Same data (ADF JSON), but now an object instead of a stringified JSON. Use this if you need the raw ADF structure. |
| `description` | `descriptionText` | Use this for human/AI-readable content. This is the recommended field for most consumers. |

## Files Changed

| File | Change |
|------|--------|
| `src/modules/jira/adf-types.ts` | **New** — TypeScript interfaces for ADF nodes and marks |
| `src/modules/jira/adf-parser.ts` | **New** — Recursive ADF tree walker that produces plain text |
| `src/modules/jira/secret-redactor.ts` | **New** — Configurable regex-based secret redaction engine |
| `src/modules/jira/normalize.ts` | **Modified** — Updated `NormalizedIssue` interface; calls ADF parser + redactor |
| `src/modules/mcp/mcp.dto.ts` | **Modified** — Updated `NormalizedIssueResponseDto` with new fields |
