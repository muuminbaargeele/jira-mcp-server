---

description: "Task list for Jira Issue Retrieval Service"
---

# Tasks: Jira Issue Retrieval Service

**Input**: Design documents from `/specs/001-retrieve-jira-issue/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Tests are OPTIONAL and were not explicitly requested in the spec.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Single project**: `src/`, `test/` at repository root
- Paths shown below assume single project - adjust based on plan.md structure

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [x] T001 Create project structure per implementation plan (src/modules, src/common, test/) in repository root
- [x] T002 Initialize NestJS project and baseline config in `src/main.ts` and `src/app.module.ts`
- [x] T003 [P] Add TypeScript build tooling and scripts in `package.json`
- [x] T004 [P] Add baseline lint/format config in `.eslintrc.js` and `.prettierrc`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T005 Define environment schema and config loader in `src/modules/config/config.module.ts`
- [x] T006 [P] Create shared error types and error mapper in `src/common/errors.ts`
- [x] T007 [P] Create request validation utilities in `src/common/validation.ts`
- [x] T008 Configure structured logger in `src/common/logger.ts`
- [x] T009 Configure MySQL connection and audit repository in `src/modules/audit/audit.module.ts`
- [x] T010 Define audit log entity mapping in `src/modules/audit/jira-interaction.entity.ts`
- [x] T011 Define audit log writer service in `src/modules/audit/audit.service.ts`
- [x] T012 Define Jira client wrapper with timeouts and retries in `src/modules/jira/jira.client.ts`
- [x] T013 Add outbound Jira rate limiting/concurrency guard in `src/modules/jira/jira.client.ts`
- [x] T014 Define normalization utilities for deterministic output in `src/modules/jira/normalize.ts`
- [x] T015 Define MCP tool controller shell in `src/modules/mcp/mcp.controller.ts`
- [x] T016 Add OAuth client credentials guard in `src/modules/mcp/mcp.auth.guard.ts`
- [x] T017 Add audit retention policy job/config in `src/modules/audit/audit.retention.ts`
- [x] T018 Add TypeORM migration for audit table in `src/migrations/001-create-jira-interaction-logs.ts`
- [x] T019 Disable TypeORM synchronize and enable migrations in `src/app.module.ts`

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Retrieve a Jira issue by key (Priority: P1) 🎯 MVP

**Goal**: Return a deterministic, normalized Jira issue for a valid key.

**Independent Test**: Call the MCP endpoint with a valid key and verify the normalized response is complete and stable across repeated calls.

### Implementation for User Story 1

- [x] T020 [P] [US1] Implement Jira issue fetch in `src/modules/jira/jira.service.ts`
- [x] T021 [P] [US1] Implement normalized response builder in `src/modules/jira/normalize.ts`
- [x] T022 [US1] Wire MCP controller to Jira service in `src/modules/mcp/mcp.controller.ts`
- [x] T023 [US1] Add response schema mapping in `src/modules/mcp/mcp.dto.ts`
- [x] T024 [US1] Ensure deterministic ordering for normalized fields in `src/modules/jira/normalize.ts`

**Checkpoint**: User Story 1 is functional and returns a deterministic payload

---

## Phase 4: User Story 2 - Handle invalid or inaccessible keys safely (Priority: P2)

**Goal**: Return clear, stable errors without exposing Jira secrets.

**Independent Test**: Call the MCP endpoint with invalid and inaccessible keys and verify stable error responses.

### Implementation for User Story 2

- [x] T025 [P] [US2] Add key format validation in `src/modules/mcp/mcp.dto.ts`
- [x] T026 [US2] Map Jira errors to stable error responses in `src/common/errors.ts`
- [x] T027 [US2] Add error handling in MCP controller in `src/modules/mcp/mcp.controller.ts`

**Checkpoint**: User Story 2 returns clear, stable errors for invalid or denied keys

---

## Phase 5: User Story 3 - Observe and audit Jira interactions (Priority: P3)

**Goal**: Persist an audit record for every Jira request, response, and error.

**Independent Test**: Call the MCP endpoint and confirm an audit record is created for both success and error cases.

### Implementation for User Story 3

- [x] T028 [P] [US3] Capture audit metadata in `src/modules/audit/audit.service.ts`
- [x] T029 [US3] Add audit logging hook to Jira service in `src/modules/jira/jira.service.ts`
- [x] T030 [US3] Ensure non-blocking audit writes in `src/modules/audit/audit.service.ts`

**Checkpoint**: Audit logs are written for every Jira interaction

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [x] T031 [P] Document environment variables in `specs/001-retrieve-jira-issue/quickstart.md`
- [x] T032 [P] Validate OpenAPI contract alignment in `specs/001-retrieve-jira-issue/contracts/jira-issue.openapi.yaml`
- [x] T033 Run quickstart validation checklist in `specs/001-retrieve-jira-issue/quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order (P1 → P2 → P3)
- **Polish (Final Phase)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) - Depends on US1 error mapping patterns
- **User Story 3 (P3)**: Can start after Foundational (Phase 2) - Depends on shared audit module

### Within Each User Story

- Models/entities before services
- Services before controller endpoints
- Core implementation before integration
- Story complete before moving to next priority

### Parallel Opportunities

- Setup tasks T003 and T004 can run in parallel
- Foundational tasks T006, T007, T008 can run in parallel
- User story tasks marked [P] can run in parallel within that story

---

## Parallel Example: User Story 1

```bash
Task: "Implement Jira issue fetch in src/modules/jira/jira.service.ts"
Task: "Implement normalized response builder in src/modules/jira/normalize.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Test User Story 1 independently
5. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Deploy/Demo (MVP!)
3. Add User Story 2 → Test independently → Deploy/Demo
4. Add User Story 3 → Test independently → Deploy/Demo
5. Each story adds value without breaking previous stories
