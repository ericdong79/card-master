<!--
Sync Impact Report:
- Version change: 0.0.0 → 1.0.0 (initial constitution)
- Modified principles: N/A (new constitution)
- Added sections: All sections
- Removed sections: N/A
- Templates requiring updates: ✅ updated (plan-template.md, spec-template.md, tasks-template.md)
- Follow-up TODOs: None
-->

# Card Master Constitution

## Core Principles

### I. Data-First Design
All features must be designed around the core data model: Cards, Card Packs, Scheduling States, and Review Events. Data integrity and relationships are paramount; the UI is a reflection of the data structure. Every feature must maintain data consistency and follow the established schema patterns.

### II. Algorithm Extensibility
The scheduling system MUST support multiple algorithms (SM-2, FSRS, etc.) through a pluggable interface. Algorithm implementations must be pure functions that transform previous state + review event → next state. No algorithm may depend on external state beyond its inputs. All algorithms must be versioned and support lazy migration.

### III. Test-Driven Development (NON-NEGOTIABLE)
TDD is mandatory: Tests must be written before implementation, must fail initially, then implementation must make them pass. Red-Green-Refactor cycle is strictly enforced. All scheduling algorithms must have comprehensive tests covering edge cases and state transitions.

### IV. Event Sourcing
Review Events are immutable and are the source of truth for all scheduling state. Scheduling state is a cached, reconstructable representation derived from events. No operation may modify historical events. All state transitions must be traceable to specific events.

### V. Progressive Enhancement
Core functionality must work without JavaScript enabled. The React frontend enhances but does not replace fundamental card operations. API endpoints must be fully functional via direct HTTP calls. Progressive enhancement ensures accessibility and reliability.

## Technical Constraints

### Technology Stack
Frontend: React 19+ with TypeScript, Vite, Tailwind CSS
Backend: Node.js with PostgreSQL database
API: RESTful HTTP with JSON responses
Authentication: User-based with UUID identifiers

### Data Requirements
All user data must be isolated by owner_user_id
Card content must support arbitrary text (prompt/answer)
Scheduling state must be serializable as JSONB
All timestamps must use ISO 8601 format or UTC

### Performance Standards
Card review operations must complete in <200ms p95
Scheduling calculations must not block UI responses
Database queries must be optimized for user-scoped data access
Frontend must load and be interactive within 3 seconds

## Development Workflow

### Code Organization
Frontend code in client/ directory following feature-based structure
API code organized by domain entities (cards, scheduling, reviews)
Shared types and utilities in lib/ directories
Database schema managed through migrations

### Quality Gates
All code must pass TypeScript strict mode checks
All PRs require automated testing and manual review
Database schema changes require migration and rollback plans
Scheduling algorithm changes require comprehensive test coverage

### Review Process
Feature specifications must be created before implementation
All user stories must be independently testable
Implementation must follow the plan → spec → tasks workflow
Constitution compliance must be verified for all changes

## Governance

This constitution supersedes all other development practices. Amendments require documentation, approval, and a migration plan. All PRs and reviews must verify compliance with these principles. Complexity beyond these principles must be explicitly justified. Use this constitution as the primary guidance for all development decisions.

**Version**: 1.0.0 | **Ratified**: 2026-01-06 | **Last Amended**: 2026-01-06
