# Feature Specification: Normalize Jira Issue Descriptions

**Feature Branch**: `002-normalize-jira-descriptions`  
**Created**: 2026-02-12  
**Status**: Draft  
**Input**: User description: "Add a new MCP capability to normalize Jira issue descriptions. The MCP server currently returns the raw Atlassian Document Format (ADF) in the description field. This format is not AI-friendly and contains formatting metadata, historical marks, and sensitive information. The new feature should parse the ADF description, extract readable plain text, remove formatting marks, redact credentials or secrets, and return a new field called descriptionText while preserving the original raw description as descriptionRaw temporarily for backward compatibility."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - AI Consumer Receives Clean Plain Text Description (Priority: P1)

An AI consumer (such as a coding assistant or automation agent) queries a Jira issue through the MCP server. Instead of receiving a complex, deeply nested ADF JSON structure full of formatting metadata, the consumer receives a clean, human-readable plain text version of the issue description in the `descriptionText` field. This makes it easy for the AI to understand the issue context without additional parsing.

**Why this priority**: This is the core value of the feature. Without readable plain text extraction, the AI consumer cannot meaningfully use the description. Every other capability builds on top of this.

**Independent Test**: Can be fully tested by fetching any Jira issue with a non-empty description and verifying that `descriptionText` contains readable plain text that preserves the logical content (paragraphs, lists, headings) without any ADF JSON structure or formatting metadata.

**Acceptance Scenarios**:

1. **Given** a Jira issue has an ADF description with paragraphs and inline text, **When** the issue is retrieved via the MCP server, **Then** `descriptionText` contains the full text content with paragraphs separated by newlines.
2. **Given** a Jira issue has an ADF description with bullet lists, ordered lists, and headings, **When** the issue is retrieved, **Then** `descriptionText` represents lists and headings in a readable plain text format (e.g., `- item` for bullets, `1. item` for ordered lists, heading text on its own line).
3. **Given** a Jira issue has an ADF description containing code blocks, **When** the issue is retrieved, **Then** `descriptionText` preserves the code content in a readable format (e.g., indented or fenced).
4. **Given** a Jira issue has an empty or null description, **When** the issue is retrieved, **Then** `descriptionText` is an empty string (`""`).

---

### User Story 2 - Formatting Marks Are Stripped for Consistency (Priority: P2)

An AI consumer retrieves a Jira issue. The original ADF description contains various formatting marks such as bold, italic, strikethrough, underline, text color, and link decorations. The `descriptionText` field contains only the plain text content with all formatting marks removed, ensuring the output is clean, consistent, and free of visual noise.

**Why this priority**: Formatting marks add noise and inconsistency for AI consumers. Removing them produces stable, predictable output. This directly supports the "deterministic and stable" requirement.

**Independent Test**: Can be tested by creating or using a Jira issue with rich formatting (bold, italic, strikethrough, colored text, links) and verifying that `descriptionText` contains only the underlying text without any formatting indicators.

**Acceptance Scenarios**:

1. **Given** a Jira issue description contains text marked as bold, italic, and strikethrough, **When** the issue is retrieved, **Then** `descriptionText` contains only the underlying text without any formatting markers.
2. **Given** a Jira issue description contains hyperlinks, **When** the issue is retrieved, **Then** `descriptionText` includes the link text but not the URL metadata (unless the URL itself is the visible text).
3. **Given** a Jira issue description contains text with color marks or highlight marks, **When** the issue is retrieved, **Then** `descriptionText` strips the color/highlight metadata and preserves only the text.

---

### User Story 3 - Sensitive Information Is Redacted (Priority: P2)

An AI consumer retrieves a Jira issue. The description contains credentials, API keys, tokens, passwords, or other secrets (for example, pasted configuration snippets). The `descriptionText` field has these sensitive values redacted and replaced with a placeholder like `[REDACTED]`, preventing accidental exposure of secrets to AI models or downstream systems.

**Why this priority**: Redacting secrets is a security requirement that protects users from accidental credential leakage through AI-assisted workflows. It shares P2 with formatting removal because both are essential for production readiness.

**Independent Test**: Can be tested by using a Jira issue whose description contains known patterns of credentials (API keys, passwords, tokens, connection strings) and verifying that `descriptionText` replaces them with `[REDACTED]`.

**Acceptance Scenarios**:

1. **Given** a Jira issue description contains an AWS access key pattern (e.g., `AKIA...`), **When** the issue is retrieved, **Then** `descriptionText` replaces the key value with `[REDACTED:aws-key]`.
2. **Given** a Jira issue description contains a generic API token (e.g., `sk-...`, `ghp_...`), **When** the issue is retrieved, **Then** the token is replaced with `[REDACTED:api-token]`.
3. **Given** a Jira issue description contains a password field (e.g., `password=secret123`), **When** the issue is retrieved, **Then** the password value is replaced with `[REDACTED:password]` (e.g., `password=[REDACTED:password]`).
4. **Given** a Jira issue description contains a connection string with embedded credentials, **When** the issue is retrieved, **Then** the credential portions are redacted with the appropriate typed placeholder while the non-sensitive parts of the connection string remain intact.
5. **Given** a Jira issue description contains no recognizable secrets, **When** the issue is retrieved, **Then** `descriptionText` is unchanged (no false positives that remove legitimate content).

---

### User Story 4 - Migration from `description` to New Fields (Priority: P3)

An existing consumer of the MCP server previously relied on the `description` field for raw ADF data. After this feature is deployed, the `description` field is removed and replaced by two new fields: `descriptionText` (normalized plain text) and `descriptionRaw` (original ADF JSON). Consumers must update their integration to use the new field names. The `descriptionRaw` field is temporary and will be removed in a future version.

**Why this priority**: This is a partially breaking change. Existing consumers need to update their field references from `description` to `descriptionRaw`. However, the data itself is preserved — only the field name changes.

**Independent Test**: Can be tested by fetching any Jira issue and verifying that (a) the response no longer contains a `description` field, (b) `descriptionRaw` contains the exact same ADF JSON that `description` previously returned, and (c) `descriptionText` contains the normalized plain text.

**Acceptance Scenarios**:

1. **Given** a Jira issue has a non-empty ADF description, **When** the issue is retrieved, **Then** the response contains `descriptionText` (normalized) and `descriptionRaw` (original ADF) but does NOT contain the old `description` field.
2. **Given** a consumer previously relied on the `description` field, **When** migrating to the new response format, **Then** `descriptionRaw` contains the exact same data the old `description` field contained.
3. **Given** a Jira issue has a null description, **When** the issue is retrieved, **Then** `descriptionText` is `""` and `descriptionRaw` is `null`.

---

### Edge Cases

- What happens when the ADF structure is malformed or contains unexpected node types? The system should gracefully skip unknown nodes and still produce output from known parts.
- What happens when the description contains only formatting marks with no text content (e.g., an empty bold node)? `descriptionText` should be an empty string.
- What happens when the description is extremely long (e.g., thousands of ADF nodes)? The system should handle it without timeout or memory issues, processing linearly.
- What happens when a redaction pattern partially matches legitimate content (e.g., a code snippet that looks like a key)? The system should err on the side of caution and redact, since false negatives (leaked secrets) are worse than false positives (over-redacted text).
- What happens when the description contains mentions (@user), emojis, or media attachments in ADF? Mentions should render as the display name, emojis as their text representation, and media references as a placeholder like `[attachment]`.

## Clarifications

### Session 2026-02-12

- Q: What happens to the existing `description` field in the response? → A: Option C — Rename `description` to `descriptionRaw` (containing the original ADF JSON) and add `descriptionText` (containing normalized plain text). The old `description` field is removed. This is a partially breaking change.
- Q: Should the redaction placeholder include the type of secret detected? → A: Yes — use typed placeholders in the format `[REDACTED:type]` (e.g., `[REDACTED:aws-key]`, `[REDACTED:password]`, `[REDACTED:bearer-token]`) to give AI consumers context about what was removed.
- Q: Should redaction events be logged for security auditing? → A: Yes — log redaction events with the issue key, secret type, and count of redactions. Never log the actual secret value.
- Q: Are unit tests required for this feature? → A: No — no unit testing is needed. The normalization logic should be written as pure functions (making it testable by design), but writing test files is explicitly out of scope.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST parse Atlassian Document Format (ADF) JSON structures and extract all text content from supported node types (paragraph, heading, bulletList, orderedList, codeBlock, blockquote, table, listItem, mediaSingle, mention, emoji, hardBreak, rule).
- **FR-002**: System MUST produce a plain text representation that preserves the logical structure of the original content (paragraphs as double newlines, list items as prefixed lines, headings as distinct lines, code blocks as indented or fenced blocks).
- **FR-003**: System MUST strip all ADF formatting marks including but not limited to: `strong`, `em`, `strike`, `underline`, `code`, `textColor`, `subsup`, and `link`.
- **FR-004**: System MUST detect and redact common credential and secret patterns, replacing matched values with a typed placeholder in the format `[REDACTED:type]` where `type` identifies the category of secret (e.g., `aws-key`, `password`, `api-token`, `bearer-token`).
- **FR-005**: The redaction MUST cover at minimum: AWS access keys (`AKIA...`), generic API tokens (`sk-...`, `ghp_...`, `xoxb-...`), passwords in key-value format (`password=...`, `secret=...`, `token=...`), Bearer tokens, and base64-encoded credentials in URLs or connection strings.
- **FR-006**: System MUST return the normalized text in a new response field called `descriptionText`.
- **FR-007**: System MUST rename the existing `description` field to `descriptionRaw`, containing the original raw ADF JSON. The old `description` field MUST be removed from the response (partially breaking change).
- **FR-008**: When the original description is `null` or missing, `descriptionText` MUST be an empty string (`""`) and `descriptionRaw` MUST be `null`.
- **FR-009**: The normalization output MUST be deterministic — the same ADF input MUST always produce the exact same `descriptionText` output.
- **FR-010**: System MUST gracefully handle malformed or unrecognized ADF nodes by skipping them without failing.
- **FR-011**: When one or more secrets are redacted from a description, the system MUST log a redaction audit event containing the issue key, the type(s) of secret detected, and the count of redactions. The actual secret value MUST never be included in the log.

### Non-Functional Requirements

- **NFR-001**: The normalization process MUST complete within a predictable time proportional to the size of the input (no worse than linear complexity).
- **NFR-002**: Errors during normalization MUST be logged with the issue key and error details, and MUST NOT cause the entire issue retrieval to fail — instead, `descriptionText` should fall back to an empty string with a warning.
- **NFR-003**: The redaction patterns MUST be configurable so new patterns can be added without changing core logic.
- **NFR-004**: Scope MUST remain backend-only (server-side normalization within the MCP server).
- **NFR-005**: Redaction audit logs MUST be structured, non-blocking, and follow the same logging patterns used by the existing audit module.

### Key Entities

- **ADF Document**: The raw Atlassian Document Format JSON structure containing nested nodes, marks, and attributes that represents a Jira issue description.
- **Normalized Description**: The plain text output (`descriptionText`) produced by parsing ADF, stripping marks, and redacting secrets. Deterministic and stable for a given input.
- **Redaction Pattern**: A configurable rule that defines how to detect and replace sensitive information (credentials, tokens, secrets) within text content. Each pattern has a `type` label (e.g., `aws-key`, `password`) used in the typed placeholder `[REDACTED:type]`.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of Jira issues retrieved through the MCP server include both `descriptionText` and `descriptionRaw` fields in the response.
- **SC-002**: For any given Jira issue, calling the retrieval multiple times always returns the identical `descriptionText` value (determinism).
- **SC-003**: AI consumers can understand issue context from `descriptionText` alone, without needing to parse or interpret ADF structures.
- **SC-004**: All known credential patterns (AWS keys, API tokens, passwords in key-value pairs, Bearer tokens) are redacted with zero false negatives in test scenarios.
- **SC-005**: `descriptionRaw` provides an exact copy of what was previously available as `description`. Consumers migrating from the old field name find their data intact under the new name.

## Assumptions

- The MCP server already retrieves Jira issues and returns the raw ADF in the `description` field. This feature adds processing on top of that existing retrieval.
- The ADF structure follows the standard Atlassian Document Format specification. Non-standard extensions by Jira plugins will be handled as "unrecognized nodes" (gracefully skipped).
- Redaction is pattern-based (regex), not AI-based. This means it relies on known patterns and may not catch novel or obfuscated credential formats.
- The `descriptionRaw` field is temporary and will be deprecated in a future version. A deprecation notice should be included in documentation.
- Performance overhead of normalization is acceptable for typical Jira descriptions (usually under 50KB of ADF JSON).
