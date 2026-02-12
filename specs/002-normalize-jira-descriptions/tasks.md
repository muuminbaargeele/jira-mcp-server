# Tasks: Normalize Jira Issue Descriptions

**Input**: Design documents from `/specs/002-normalize-jira-descriptions/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/
**Tests**: Not required (per clarification: no unit testing needed)

**Organization**: Tasks are grouped by user story to enable independent implementation and verification of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4)
- Include exact file paths in descriptions

## Path Conventions

- **Single project**: `src/` at repository root
- All new files go in `src/modules/jira/`
- Modified files in `src/modules/jira/` and `src/modules/mcp/`

---

## Phase 1: Foundational (Blocking Prerequisites)

**Purpose**: Create shared type definitions and update the response interface/DTO that all user stories depend on. No user story work can begin until this phase is complete.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [x] T001 [P] Create ADF TypeScript type definitions in `src/modules/jira/adf-types.ts` — define `AdfDocument`, `AdfNode`, and `AdfMark` interfaces per data-model.md. Export all types.
- [x] T002 [P] Update `NormalizedIssue` interface in `src/modules/jira/normalize.ts` — remove the `description?: string` field, add `descriptionText: string` (always a string, default `""`) and `descriptionRaw: object | null` (original ADF JSON or null). Update the `normalizeIssue()` function to set `descriptionText` to `""` and `descriptionRaw` to `fields.description ?? null` as a temporary passthrough (parser wiring comes in US1).
- [x] T003 [P] Update `NormalizedIssueResponseDto` in `src/modules/mcp/mcp.dto.ts` — remove `description?: string`, add `descriptionText!: string` and `descriptionRaw?: object | null`. Add class-validator decorators matching the JSON schema in `contracts/normalized-issue-response.json`.

**Checkpoint**: Foundational types and interfaces are in place. The server compiles and runs with the new response shape (descriptionText is `""` for now, descriptionRaw passes through raw ADF). User story implementation can begin.

---

## Phase 2: User Story 1 — AI Consumer Receives Clean Plain Text Description (Priority: P1) 🎯 MVP

**Goal**: The MCP server parses ADF JSON and returns readable plain text in `descriptionText`. This is the core value of the entire feature.

**Independent Test**: Fetch any Jira issue with a non-empty description via `POST /mcp/jira/issue` and verify that `descriptionText` contains readable plain text with paragraphs, lists, and headings preserved — no ADF JSON structure or formatting metadata.

### Implementation for User Story 1

- [x] T004 [US1] Implement the ADF-to-plain-text parser in `src/modules/jira/adf-parser.ts` — create an exported `parseAdf(doc: AdfDocument | null): string` function that recursively walks the ADF tree. Handle block nodes: `doc`, `paragraph` (text + `\n\n`), `heading` (text + `\n\n`), `bulletList`/`orderedList` (prefix items with `- ` or `1. `), `codeBlock` (triple backtick fences with optional language), `blockquote` (`> ` prefix), `table` (pipe-delimited rows), `panel` (`[PANEL_TYPE]:` prefix), `rule` (`---\n\n`), `expand` (title + content), `mediaSingle`/`mediaGroup` (`[attachment]`). Handle child nodes: `listItem`, `tableRow`, `tableCell`, `tableHeader`, `nestedExpand`, `media`. Handle inline nodes: `text` (extract `.text` string, ignore `.marks`), `hardBreak` (`\n`), `mention` (`@displayName` from `attrs.text`), `emoji` (`:shortName:` from `attrs.shortName`), `date` (ISO date from `attrs.timestamp`), `status` (`[text]` from `attrs.text`), `inlineCard` (URL from `attrs.url`). Return `""` for null/undefined input. Skip unrecognized node types silently (FR-010). Trim trailing whitespace from final output. Must be deterministic (FR-009).
- [x] T005 [US1] Wire the ADF parser into `normalizeIssue()` in `src/modules/jira/normalize.ts` — import `parseAdf` from `adf-parser.ts`. Replace the temporary `descriptionText: ""` with `descriptionText: parseAdf(fields.description)`. Keep `descriptionRaw: fields.description ?? null` (passing the raw ADF object, not a JSON string). Wrap the `parseAdf` call in a try/catch: on error, set `descriptionText` to `""` and log the error with the issue key and details via `getLogger()` (NFR-002).
- [x] T006 [US1] Update `hashNormalizedIssue()` in `src/modules/jira/normalize.ts` — ensure the hash function works correctly with the new `descriptionText` and `descriptionRaw` fields instead of the old `description` field.

**Checkpoint**: User Story 1 is complete. Fetching a Jira issue returns `descriptionText` with clean plain text and `descriptionRaw` with the original ADF. This is the MVP — the server is usable at this point.

---

## Phase 3: User Story 2 — Formatting Marks Are Stripped for Consistency (Priority: P2)

**Goal**: All ADF formatting marks (bold, italic, strikethrough, underline, code, link, textColor, subsup, backgroundColor, border) are completely stripped from `descriptionText`, leaving only the underlying text.

**Independent Test**: Fetch a Jira issue whose description has bold, italic, strikethrough, colored text, and hyperlinks. Verify `descriptionText` contains only the raw text without any formatting indicators.

### Implementation for User Story 2

- [x] T007 [US2] Ensure complete mark stripping in `src/modules/jira/adf-parser.ts` — verify the text extraction logic explicitly ignores all mark types listed in FR-003 (`strong`, `em`, `strike`, `underline`, `code`, `textColor`, `subsup`, `link`, `backgroundColor`, `border`). For `link` marks specifically: confirm that the text node's `.text` property is used (which is the link display text) and the mark's `attrs.href` is discarded — unless the `.text` itself is a URL, in which case it naturally remains. Add a code comment documenting the full list of stripped marks for future maintainability.

**Checkpoint**: User Story 2 is complete. All formatting is stripped. Combined with US1, the description is clean plain text.

---

## Phase 4: User Story 3 — Sensitive Information Is Redacted (Priority: P2)

**Goal**: Credentials, API keys, tokens, passwords, and other secrets in descriptions are detected and replaced with typed `[REDACTED:type]` placeholders before being returned in `descriptionText`. Redaction events are logged for security auditing.

**Independent Test**: Fetch a Jira issue whose description contains AWS keys, API tokens, passwords, or connection strings. Verify `descriptionText` has them replaced with `[REDACTED:aws-key]`, `[REDACTED:api-token]`, `[REDACTED:password]`, etc. Verify server logs contain a `secrets_redacted` warning entry.

### Implementation for User Story 3

- [x] T008 [US3] Implement the secret redaction engine in `src/modules/jira/secret-redactor.ts` — define and export the `RedactionPattern` interface (`name: string`, `pattern: RegExp`, `replace?: (match: string) => string`). Define and export the `RedactionResult` interface (`text: string`, `redactions: { type: string; count: number }[]`, `totalRedacted: number`). Create and export a `DEFAULT_PATTERNS: RedactionPattern[]` array with 8 patterns per research.md: `aws-key` (`AKIA[A-Z0-9]{16}`), `aws-secret` (40-char base64 after key-value separator), `api-token` (`sk-`, `ghp_`, `gho_`, `xoxb-`, `xoxp-` prefixed tokens), `bearer-token` (`Bearer` followed by token chars), `password` (key-value patterns for password/passwd/secret/token/api_key/apikey), `private-key` (PEM key blocks), `connection-string` (URLs with `://user:pass@host`), `generic-high-entropy` (long base64/hex after key-value separators). Create and export a `redactSecrets(text: string, patterns?: RedactionPattern[]): RedactionResult` function that applies patterns in order, replaces matches with `[REDACTED:name]`, counts per type, and returns the result. Patterns default to `DEFAULT_PATTERNS` if not provided (NFR-003).
- [x] T009 [US3] Wire secret redactor into the normalization pipeline in `src/modules/jira/normalize.ts` — import `redactSecrets` from `secret-redactor.ts`. After calling `parseAdf()`, pass the plain text through `redactSecrets()`. Use the returned `RedactionResult.text` as the final `descriptionText`.
- [x] T010 [US3] Add redaction audit logging in `src/modules/jira/normalize.ts` — after `redactSecrets()` returns, if `result.totalRedacted > 0`, emit a structured Pino log at `warn` level via `getLogger()` with: `msg: "secrets_redacted"`, `issueKey` (from `issue.key`), `redactions` (array of `{ type, count }`), and `totalRedacted`. Never log the actual secret value (FR-011). Logging must be non-blocking (NFR-005).

**Checkpoint**: User Story 3 is complete. Secrets are redacted with typed placeholders and audit events are logged. Combined with US1 + US2, the full normalization pipeline is operational.

---

## Phase 5: User Story 4 — Migration from `description` to New Fields (Priority: P3)

**Goal**: The old `description` field is fully removed from the response. `descriptionRaw` contains the exact same data that `description` previously held. Existing consumers have a clear migration path.

**Independent Test**: Fetch any Jira issue and verify: (a) no `description` field in the response, (b) `descriptionRaw` matches what `description` previously returned, (c) `descriptionText` contains normalized plain text.

### Implementation for User Story 4

- [x] T011 [US4] Verify backward compatibility of `descriptionRaw` in `src/modules/jira/normalize.ts` — confirm that `descriptionRaw` passes through the original `fields.description` ADF object (not a JSON string). For non-null descriptions, `descriptionRaw` should be the raw ADF object exactly as Jira returned it. For null descriptions, `descriptionRaw` should be `null`. Ensure the old `description` field is fully removed from the `NormalizedIssue` interface (done in T002) and no references to it remain in `normalize.ts`.
- [x] T012 [US4] Verify `jira.service.ts` compatibility in `src/modules/jira/jira.service.ts` — ensure `getNormalizedIssue()` works correctly with the updated `NormalizedIssue` return type. Confirm the `responseSummary` passed to `AuditService.recordInteraction()` still makes sense with the new field names. No logic changes expected — just verification and any needed string updates.

**Checkpoint**: User Story 4 is complete. The breaking change is fully applied. `description` is gone, `descriptionRaw` + `descriptionText` are the new contract.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final improvements that affect multiple user stories.

- [x] T013 Add structured logging for normalization lifecycle in `src/modules/jira/normalize.ts` — log at `debug` level: ADF parse start/complete, node count, any skipped unknown nodes. Use existing `getLogger()` from `src/common/logger.ts`.
- [x] T014 Validate end-to-end response against quickstart.md scenarios — run the server, fetch a real Jira issue, confirm the before/after response shape matches the documentation in `specs/002-normalize-jira-descriptions/quickstart.md`. Verify `descriptionText` is clean text, `descriptionRaw` is the ADF object, and the old `description` field is absent.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Foundational (Phase 1)**: No dependencies — can start immediately. BLOCKS all user stories.
- **User Story 1 (Phase 2)**: Depends on Foundational completion — core MVP.
- **User Story 2 (Phase 3)**: Depends on US1 (uses the same `adf-parser.ts` file).
- **User Story 3 (Phase 4)**: Depends on US1 (needs `parseAdf()` output to redact). Can start in parallel with US2 since it touches a different file (`secret-redactor.ts`), but wiring (T009, T010) depends on T005.
- **User Story 4 (Phase 5)**: Depends on Foundational (T002, T003). Can run in parallel with US1/US2/US3 for verification tasks.
- **Polish (Phase 6)**: Depends on all user stories being complete.

### User Story Dependencies

- **US1 (P1)**: Foundational → T004 → T005 → T006. **No dependencies on other stories.**
- **US2 (P2)**: Depends on T004 (adf-parser.ts from US1). Lightweight — adds verification and comments to existing parser.
- **US3 (P2)**: T008 is independent (new file). T009 and T010 depend on T005 (pipeline wiring from US1).
- **US4 (P3)**: T011 depends on T002 and T005. T012 depends on T002.

### Parallel Opportunities

```text
After Foundational (T001, T002, T003 — all parallel):
  ├── T004 [US1] adf-parser.ts  ─┐
  │                                ├── T005 [US1] wire into normalize.ts
  │                                │     ├── T006 [US1] update hash
  │                                │     ├── T007 [US2] verify mark stripping (after T004)
  │                                │     ├── T009 [US3] wire redactor (after T008)
  │                                │     └── T010 [US3] audit logging (after T009)
  └── T008 [US3] secret-redactor.ts (parallel with T004)
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Foundational (T001, T002, T003)
2. Complete Phase 2: User Story 1 (T004, T005, T006)
3. **STOP and VALIDATE**: Fetch a Jira issue → verify `descriptionText` has clean plain text
4. Server is usable at this point — AI consumers get readable descriptions

### Incremental Delivery

1. Foundational → Foundation ready
2. Add US1 → Validate → **MVP deployed** (clean text extraction)
3. Add US2 → Validate → Complete mark stripping confirmed
4. Add US3 → Validate → Secret redaction active, audit logging live
5. Add US4 → Validate → Migration complete, old field removed
6. Polish → Final validation

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- No test tasks — unit testing is explicitly out of scope per spec clarification
- Commit after each task or logical group
- Stop at any checkpoint to validate the story independently
- The ADF parser (T004) is the largest single task — it handles ~25 node types
- The secret redactor (T008) is the second largest — it defines 8 regex patterns
