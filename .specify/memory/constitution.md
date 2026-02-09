<!--
Sync Impact Report
- Version change: N/A (template) → 1.0.0
- Modified principles:
  - Placeholder principle 1 → I. High-Quality, Maintainable Architecture
  - Placeholder principle 2 → II. Explicit Separation of Concerns
  - Placeholder principle 3 → III. Testable & Verifiable Critical Logic
  - Placeholder principle 4 → IV. Consistent API & AI Outputs
  - Placeholder principle 5 → V. Reliable & Controlled External Integration
- Added sections: Performance & Reliability Standards; Development Workflow & Scope Control
- Removed sections: None
- Templates requiring updates:
  - ✅ .specify/templates/plan-template.md
  - ✅ .specify/templates/spec-template.md
  - ✅ .specify/templates/tasks-template.md
- Follow-up TODOs: TODO(RATIFICATION_DATE): original adoption date unknown
-->
# Jira MCP Server Constitution

## Core Principles

### I. High-Quality, Maintainable Architecture
- The architecture MUST be simple, clear, and maintainable over time.
- Components MUST have clear interfaces and minimal coupling.
- Code MUST be readable and structured for long-term ownership.
Rationale: maintainable systems reduce defects and speed up future changes.

### II. Explicit Separation of Concerns
- Domain logic, infrastructure, and integration code MUST be separated.
- Business rules MUST NOT depend on transport or storage details.
- Shared utilities MUST be generic and avoid feature-specific coupling.
Rationale: clear boundaries prevent regressions and enable focused changes.

### III. Testable & Verifiable Critical Logic
- Formal testing standards are NOT required in early phases.
- All critical logic MUST be written so it is testable and verifiable.
- Critical logic MUST use deterministic inputs/outputs and injectable deps.
- Structured logging MUST exist for critical paths to support verification.
Rationale: verifiable behavior reduces risk even before full test suites exist.

### IV. Consistent API & AI Outputs
- API and AI-facing outputs MUST be predictable and documented.
- Response shapes MUST be consistent for the same inputs.
- Errors MUST be clear, stable, and include actionable messages.
Rationale: consistent outputs enable reliable integration and automation.

### V. Reliable & Controlled External Integration
- External API usage MUST be controlled with limits and timeouts.
- All external calls MUST handle failure and degrade gracefully.
- Audit logging MUST be non-blocking and MUST NOT delay requests.
Rationale: reliability comes from controlled dependencies and safe fallbacks.

## Performance & Reliability Standards

- Define timeouts and retry policies for all external calls.
- Use bounded concurrency and rate limits for third-party services.
- Prefer async or buffered audit logging to avoid blocking request paths.
- Ensure critical paths remain reliable under partial dependency failure.

## Development Workflow & Scope Control

- No implementation may begin without an approved specification.
- Scope changes MUST update the specification before implementation.
- The system is backend-only unless explicitly re-scoped in a spec.

## Governance

- This constitution is binding and supersedes local practices.
- All technical decisions and implementations MUST follow these principles.
- No implementation may occur without an approved specification.
- Scope changes require specification updates before any code changes.
- The system remains backend-only unless explicitly re-scoped.
- Amendments require documenting changes, updating the Sync Impact Report,
  and recording a new version and amendment date.
- Reviews MUST verify compliance with this constitution.

**Version**: 1.0.0 | **Ratified**: TODO(RATIFICATION_DATE): original adoption date unknown | **Last Amended**: 2026-02-09
