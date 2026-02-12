# Implementation Plan: Normalize Jira Issue Descriptions

**Branch**: `002-normalize-jira-descriptions` | **Date**: 2026-02-12 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/002-normalize-jira-descriptions/spec.md`

## Summary

The MCP server currently serializes the raw Atlassian Document Format (ADF) JSON as a string into the `description` field. AI consumers cannot easily read this format. This feature adds a normalization pipeline that:

1. Parses the ADF tree structure and extracts plain text.
2. Strips all formatting marks (bold, italic, strikethrough, etc.).
3. Redacts credentials and secrets using configurable regex patterns with typed placeholders (`[REDACTED:type]`).
4. Returns normalized text as `descriptionText` and renames the old `description` to `descriptionRaw`.
5. Logs redaction audit events via the existing Pino logger.

The approach is a pure function pipeline: `ADF JSON → parse tree → extract text → redact secrets → plain text string`. No external dependencies are needed.

## Technical Context

**Language/Version**: TypeScript 5.4 / Node.js (ES2022 target, CommonJS modules)  
**Primary Dependencies**: NestJS 10, Axios, Bottleneck, class-validator, class-transformer, Pino, TypeORM  
**Storage**: MySQL via TypeORM (audit logs only; normalization is stateless)  
**Target Platform**: Linux server (backend-only NestJS application)  
**Project Type**: Single NestJS backend application  
**Performance Goals**: Linear-time normalization; typical ADF descriptions are <50KB JSON. No measurable latency impact on issue retrieval.  
**Constraints**: Deterministic output (same ADF → same text every time). No external API calls for normalization. Redaction is regex-based, not AI-based. No unit tests — logic is written as pure functions by design but test files are out of scope.  
**Scale/Scope**: Single endpoint (`POST /mcp/jira/issue`). One normalization pipeline applied per issue retrieval.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Architecture is clear and maintainable with explicit separation of concerns.** ✅ PASS
  - The normalization pipeline is a set of pure functions in `src/modules/jira/` separated from transport (controller) and storage (audit). The ADF parser, secret redactor, and text assembler are independent, composable units.

- **Critical logic is testable/verifiable and has structured logging.** ✅ PASS
  - All normalization functions are pure (deterministic input → output) with no side effects. Redaction audit events are logged via the existing Pino logger. The logic is written to be verifiable by design (pure functions with deterministic I/O), satisfying the constitution principle that critical logic MUST be *written so it is testable and verifiable* — formal testing is not required in early phases per Constitution III.

- **API/AI output contracts are consistent with clear error messages.** ✅ PASS
  - `descriptionText` always returns a string (empty string on null/error). `descriptionRaw` always returns the original ADF or null. The response shape is predictable and documented in the DTO. Normalization errors fall back gracefully (NFR-002).

- **External API usage is controlled with timeouts and safe degradation.** ✅ PASS
  - Normalization adds no new external API calls. The existing Jira client already has timeouts, rate limiting, and retry logic. Normalization failure degrades to empty `descriptionText` without blocking the response.

- **Scope remains backend-only unless the spec explicitly re-scopes it.** ✅ PASS
  - This feature is entirely server-side within the MCP server.

## Project Structure

### Documentation (this feature)

```text
specs/002-normalize-jira-descriptions/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── normalized-issue-response.json
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
src/
├── modules/
│   ├── jira/
│   │   ├── jira.client.ts          # Existing: HTTP client for Jira API
│   │   ├── jira.service.ts         # Existing: orchestrates fetch → normalize → audit
│   │   ├── jira.module.ts          # Existing: NestJS module
│   │   ├── normalize.ts            # MODIFY: update NormalizedIssue interface, call pipeline
│   │   ├── adf-parser.ts           # NEW: ADF tree walker → plain text extraction
│   │   ├── adf-types.ts            # NEW: TypeScript interfaces for ADF nodes/marks
│   │   └── secret-redactor.ts      # NEW: configurable regex-based secret redaction
│   ├── mcp/
│   │   ├── mcp.controller.ts       # Existing: no changes needed
│   │   ├── mcp.dto.ts              # MODIFY: update NormalizedIssueResponseDto
│   │   └── mcp.module.ts           # Existing: no changes needed
│   └── audit/
│       ├── audit.service.ts        # Existing: no changes needed (use Pino for redaction logs)
│       └── ...                     # Existing: unchanged
├── common/
│   ├── logger.ts                   # Existing: Pino logger (used for redaction audit logs)
│   └── ...                         # Existing: unchanged
└── main.ts                         # Existing: no changes needed
```

**Structure Decision**: The existing single NestJS project structure is preserved. Three new files are added to the `jira` module (`adf-parser.ts`, `adf-types.ts`, `secret-redactor.ts`) following the separation of concerns principle. The ADF parser and secret redactor are independent modules that the existing `normalize.ts` orchestrates.

## Complexity Tracking

No Constitution violations. No complexity justifications needed.
