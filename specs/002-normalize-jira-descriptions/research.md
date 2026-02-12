# Research: Normalize Jira Issue Descriptions

**Branch**: `002-normalize-jira-descriptions`  
**Date**: 2026-02-12

## 1. ADF Parsing Approach

### Decision
Build a custom recursive tree walker (pure function) that traverses the ADF JSON structure and emits plain text. No external ADF parsing libraries.

### Rationale
- The ADF structure is a simple recursive tree of nodes with `type`, `content`, `attrs`, `marks`, and `text` fields. A recursive descent function handles this in ~100-150 lines of code.
- External libraries like `@atlaskit/adf-utils` or `@atlaskit/renderer` are heavyweight, designed for rendering to React/HTML, and pull in large dependency trees inappropriate for a backend server.
- A custom parser gives full control over the output format, makes it easy to add new node types, and keeps the dependency footprint at zero.
- Determinism is guaranteed since the walker processes nodes in document order with no randomness or external state.

### Alternatives Considered
| Alternative | Why Rejected |
|-------------|-------------|
| `@atlaskit/adf-utils` | Designed for Atlassian frontend; large dependency tree; does not produce clean plain text natively. |
| `@atlaskit/renderer` | Renders to React/HTML, not plain text; massive dependency chain; overkill for text extraction. |
| Third-party `adf-to-md` converters | Produce Markdown (not plain text); inconsistent quality; limited maintenance. |
| `JSON.stringify` + regex strip | Fragile; cannot preserve logical structure (lists, headings); not deterministic for complex docs. |

## 2. ADF Node Types to Support

### Decision
Support the following node types based on the official Atlassian Document Format specification:

**Block Nodes (top-level)**:
`doc`, `paragraph`, `heading`, `bulletList`, `orderedList`, `codeBlock`, `blockquote`, `table`, `panel`, `rule`, `expand`, `mediaSingle`, `mediaGroup`

**Block Nodes (child)**:
`listItem`, `tableRow`, `tableCell`, `tableHeader`, `nestedExpand`, `media`

**Inline Nodes**:
`text`, `hardBreak`, `mention`, `emoji`, `date`, `status`, `inlineCard`

**Marks (all stripped, text content preserved)**:
`strong`, `em`, `strike`, `underline`, `code`, `link`, `textColor`, `subsup`, `backgroundColor`, `border`

### Rationale
- This covers the full official ADF specification as documented at `developer.atlassian.com`.
- Unrecognized node types are gracefully skipped (FR-010) — future Atlassian additions won't break the parser.

### Alternatives Considered
| Alternative | Why Rejected |
|-------------|-------------|
| Support only `paragraph` and `text` | Too limited; would lose lists, headings, tables, code blocks. |
| Full Confluence ADF (including extensions, layouts) | Extensions and layouts are Confluence-specific and rarely appear in Jira issue descriptions. Can be added later if needed. |

## 3. Plain Text Output Format

### Decision
Use a simple, deterministic plain text format:

| ADF Node | Plain Text Representation |
|----------|--------------------------|
| `paragraph` | Text content followed by `\n\n` (double newline) |
| `heading` | Text content followed by `\n\n` |
| `bulletList` > `listItem` | `- ` prefix per item, `\n` between items |
| `orderedList` > `listItem` | `1. `, `2. `, etc. prefix per item, `\n` between items |
| `codeBlock` | Text wrapped in triple backtick fences (` ``` `) with optional language tag |
| `blockquote` | `> ` prefix per line |
| `table` | Pipe-delimited rows (`| cell | cell |`) with header separator |
| `hardBreak` | Single `\n` |
| `rule` | `---\n\n` |
| `mention` | `@displayName` |
| `emoji` | `:shortName:` (e.g., `:thumbsup:`) or fallback text |
| `date` | ISO date string from `attrs.timestamp` |
| `status` | `[STATUS_TEXT]` |
| `inlineCard` | URL from `attrs.url` or title |
| `media`/`mediaSingle` | `[attachment]` |
| `panel` | Panel content with `[PANEL_TYPE]:` prefix |
| `expand` | Expand title + content |
| Unknown nodes | Skipped silently |

### Rationale
- This format is universally readable by both humans and AI models.
- It is deterministic: the same input always produces the same output since there is no randomness or external state.
- Trailing whitespace is trimmed from the final output to ensure stability.

## 4. Secret Redaction Strategy

### Decision
Use a configurable array of regex-based redaction patterns. Each pattern has: `name` (type label), `pattern` (RegExp), and an optional `replace` function. Matched values are replaced with `[REDACTED:name]`.

### Patterns (initial set)

| Type Label | Pattern Description | Example Match |
|------------|-------------------|---------------|
| `aws-key` | AWS access key IDs: `AKIA[A-Z0-9]{16}` | `AKIAIOSFODNN7EXAMPLE` |
| `aws-secret` | AWS secret keys: 40-char base64 after key-value separator | `wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY` |
| `api-token` | OpenAI/GitHub/Slack tokens: `sk-[a-zA-Z0-9]{20,}`, `ghp_[a-zA-Z0-9]{36}`, `gho_...`, `xoxb-...`, `xoxp-...` | `sk-abcdef1234567890abcd` |
| `bearer-token` | Bearer tokens in text: `Bearer [A-Za-z0-9\-._~+/]+=*` | `Bearer eyJhbGciOiJIUzI1NiJ9...` |
| `password` | Key-value passwords: `(password\|passwd\|secret\|token\|api_key\|apikey)\s*[=:]\s*\S+` | `password=mysecret123` |
| `private-key` | PEM private keys: `-----BEGIN (RSA\|EC\|DSA\|OPENSSH)? ?PRIVATE KEY-----` through `-----END...-----` | PEM key blocks |
| `connection-string` | JDBC/MongoDB/Redis URLs with embedded credentials: `://user:pass@host` pattern | `mongodb://admin:s3cret@host:27017` |
| `generic-high-entropy` | Long base64/hex strings (>40 chars) that appear after key-value separators | `SECRET_KEY=a1b2c3d4e5f6...` (48+ chars) |

### Rationale
- Regex-based redaction is fast (O(n) per pattern), deterministic, and has zero external dependencies.
- Typed placeholders (`[REDACTED:aws-key]`) give AI consumers context about what was redacted without revealing the secret.
- The pattern array is configurable (NFR-003): new patterns can be added to the array without changing the redaction engine logic.
- Patterns are applied in order; first match wins (no double-redaction).
- The `generic-high-entropy` pattern is the broadest and applied last as a catch-all for unknown credential formats.

### Alternatives Considered
| Alternative | Why Rejected |
|-------------|-------------|
| AI-based secret detection | Non-deterministic; requires external API calls; adds latency and cost; out of scope. |
| External library (e.g., `detect-secrets`) | Python-based; no mature Node.js equivalent; adds dependency complexity. |
| No redaction | Unacceptable security risk per spec requirements. |

## 5. Redaction Audit Logging

### Decision
Use the existing Pino logger (`getLogger()`) to emit structured redaction audit events. Do NOT create new database entities for redaction logs.

### Log Format
```json
{
  "level": "warn",
  "msg": "secrets_redacted",
  "issueKey": "PROJ-123",
  "redactions": [
    { "type": "aws-key", "count": 1 },
    { "type": "password", "count": 2 }
  ],
  "totalRedacted": 3
}
```

### Rationale
- The audit module (`AuditService`) persists interaction-level records to MySQL. Redaction events are more granular (per-description) and are better suited to structured logging than database persistence.
- Pino is already used across the codebase. Using `warn` level ensures redaction events are visible in production logs.
- Log-based audit is non-blocking (NFR-006) and follows the existing pattern in the codebase.
- Security teams can search/alert on `msg: "secrets_redacted"` using standard log aggregation tools.

### Alternatives Considered
| Alternative | Why Rejected |
|-------------|-------------|
| New `RedactionAuditEntity` in MySQL | Overkill for this use case; adds schema migration and database load; redaction events don't need relational queries. |
| Extend `JiraInteractionLogEntity` | Schema change impacts existing audit flow; redaction is per-field, not per-interaction. |
| No logging | Violates FR-011 and prevents security teams from detecting secret leakage in Jira. |

