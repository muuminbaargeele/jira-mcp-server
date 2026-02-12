# Data Model: Normalize Jira Issue Descriptions

**Branch**: `002-normalize-jira-descriptions`  
**Date**: 2026-02-12

## Entities

### 1. ADF Document (Input — from Jira API)

The raw JSON structure returned by the Jira REST API v3 in `fields.description`. This is the input to the normalization pipeline. Not stored by the MCP server — passed through as `descriptionRaw`.

```typescript
/** Root ADF document node */
interface AdfDocument {
  version: 1;
  type: 'doc';
  content: AdfNode[];
}

/** Any ADF node in the tree */
interface AdfNode {
  type: string;                // Node type identifier
  content?: AdfNode[];         // Child nodes (block nodes)
  text?: string;               // Text content (text nodes only)
  marks?: AdfMark[];           // Formatting marks (text nodes only)
  attrs?: Record<string, any>; // Node-specific attributes
}

/** Formatting mark on a text node */
interface AdfMark {
  type: string;                // Mark type (strong, em, strike, etc.)
  attrs?: Record<string, any>; // Mark-specific attributes (e.g., href for link)
}
```

**Supported Node Types**:

| Category | Types |
|----------|-------|
| Block (top-level) | `doc`, `paragraph`, `heading`, `bulletList`, `orderedList`, `codeBlock`, `blockquote`, `table`, `panel`, `rule`, `expand`, `mediaSingle`, `mediaGroup` |
| Block (child) | `listItem`, `tableRow`, `tableCell`, `tableHeader`, `nestedExpand`, `media` |
| Inline | `text`, `hardBreak`, `mention`, `emoji`, `date`, `status`, `inlineCard` |

**Supported Mark Types** (all stripped — text content preserved):
`strong`, `em`, `strike`, `underline`, `code`, `link`, `textColor`, `subsup`, `backgroundColor`, `border`

### 2. NormalizedIssue (Output — updated interface)

The existing `NormalizedIssue` interface is modified. The `description` field is replaced by two new fields.

```typescript
interface NormalizedIssue {
  key: string;
  summary: string;
  status: string;
  issueType?: string;
  priority?: string;
  assignee?: string;
  reporter?: string;

  // REMOVED: description?: string;
  descriptionText: string;            // NEW: normalized plain text (always a string, "" if null)
  descriptionRaw: object | null;      // NEW: original ADF JSON object (null if description was null)

  createdAt?: string;
  updatedAt?: string;
  attachments: NormalizedAttachment[];
  metadata: {
    deterministic: boolean;
    sourceUpdatedAt?: string;
  };
}
```

**Field Rules**:

| Field | Type | Nullable | Default | Description |
|-------|------|----------|---------|-------------|
| `descriptionText` | `string` | No | `""` | Plain text extracted from ADF, with secrets redacted. Always a string. |
| `descriptionRaw` | `object \| null` | Yes | `null` | Original ADF JSON object as received from Jira. Null when Jira returns no description. |

**State Transitions**: None. The normalization is stateless — it transforms input to output in a single pass with no persisted state.

### 3. RedactionPattern (Configuration)

A configurable rule used by the secret redactor to detect and replace sensitive information.

```typescript
interface RedactionPattern {
  name: string;        // Type label used in placeholder, e.g., "aws-key"
  pattern: RegExp;     // Regex to detect the secret
  replace?: (match: string) => string; // Optional custom replacement function
}
```

**Default Patterns** (8 initial rules):

| name | Description |
|------|-------------|
| `aws-key` | AWS access key IDs (`AKIA...`) |
| `aws-secret` | AWS secret access keys (40-char base64) |
| `api-token` | OpenAI, GitHub, Slack tokens |
| `bearer-token` | Bearer authorization tokens |
| `password` | Key-value password patterns |
| `private-key` | PEM private key blocks |
| `connection-string` | Database URLs with embedded credentials |
| `generic-high-entropy` | Long base64/hex strings after key-value separators |

**Validation Rules**:
- `name` must be a non-empty string containing only lowercase letters, numbers, and hyphens.
- `pattern` must be a valid RegExp.
- Patterns are applied in array order; first match wins (no double-redaction on the same text segment).

### 4. RedactionResult (Internal — returned by redactor)

The output of the secret redaction step, used internally to drive audit logging.

```typescript
interface RedactionResult {
  text: string;                              // The redacted text
  redactions: { type: string; count: number }[];  // Summary of what was redacted
  totalRedacted: number;                     // Total number of redactions applied
}
```

### 5. NormalizedIssueResponseDto (API Response — updated)

The DTO returned by the MCP controller. Updated to match the new `NormalizedIssue` interface.

```typescript
class NormalizedIssueResponseDto {
  key!: string;
  summary!: string;
  status!: string;
  issueType?: string;
  priority?: string;
  assignee?: string;
  reporter?: string;

  // REMOVED: description?: string;
  descriptionText!: string;           // NEW: always present, "" if null
  descriptionRaw?: object | null;     // NEW: original ADF or null

  createdAt?: string;
  updatedAt?: string;
  attachments!: { name: string; size: number; mimeType: string; url?: string }[];
  metadata!: { deterministic: boolean; sourceUpdatedAt?: string };
}
```

## Entity Relationships

```text
┌─────────────────┐         ┌──────────────────┐
│  Jira API       │         │  RedactionPattern │
│  (ADF Document) │         │  (Config Array)   │
└────────┬────────┘         └────────┬──────────┘
         │                           │
         │  input                    │  applied to
         ▼                           ▼
┌─────────────────────────────────────────┐
│         Normalization Pipeline          │
│  adf-parser.ts → secret-redactor.ts    │
└────────────────┬────────────────────────┘
                 │
                 │  produces
                 ▼
┌─────────────────────────────────────────┐
│          NormalizedIssue                │
│  descriptionText + descriptionRaw      │
└────────────────┬────────────────────────┘
                 │
                 │  serialized as
                 ▼
┌─────────────────────────────────────────┐
│     NormalizedIssueResponseDto          │
│  (API Response via McpController)       │
└─────────────────────────────────────────┘
```

## Database Impact

**No database changes required.** The normalization is stateless and does not persist any new data. Redaction audit events are logged via Pino (structured log output), not stored in the database.
