# Architecture

aing is a harness engineering agent framework for Claude Code. This document explains the design decisions and module structure.

## Core Idea

15 named agents collaborate through a PDCA cycle (Plan→Do→Check→Act→Review), with complexity-based model routing, evidence-based verification, and self-healing recovery.

```
User Input
  ↓
Intent Router (11 routes, bilingual)
  ↓
Complexity Scorer (0-15 points)
  ↓
Team Preset (Solo/Duo/Squad/Full)
  ↓
Agent Spawning (parallel, model-routed)
  ↓
PDCA Cycle (5 stages, enforced)
  ↓
Evidence Chain (test/build/lint/review)
  ↓
Sam Verdict (ACHIEVED / INCOMPLETE / FAILED)
```

## Module Structure

### Core (scripts/core/)
- **state.mjs** — Atomic JSON I/O (temp+rename pattern). Race-safe for multi-agent writes.
- **config.mjs** — Dot-notation config access with fallback values.
- **logger.mjs** — Structured JSONL logger. Stderr for immediate visibility, .aing/logs/ for persistence.
- **context-budget.mjs** — Token estimation without external API. 0.75 tok/word (EN), 2 tok/char (KR).

### Routing (scripts/routing/)
- **intent-router.mjs** — 11-route natural language routing. Detects: debug, review, explore, perf, refactor, tdd, security, plan, auto, team, design.
- **complexity-scorer.mjs** — 0-15 score from signals (fileCount, lineCount, domainCount, flags).
- **model-router.mjs** — Routes agents to haiku/sonnet/opus based on complexity + cost mode.

### Review (scripts/review/)
- **review-engine.mjs** — 4-tier review pipeline (Eng/CEO/Design/Outside Voice).
- **review-checklist.mjs** — 18-category code review (6 CRITICAL + 12 INFORMATIONAL).
- **pre-landing-reviewer.mjs** — Diff-based checklist execution for ship step 4.
- **ceo-reviewer.mjs** — Product strategy with 6-question framework.
- **eng-reviewer.mjs** — Architecture/quality/tests/security/performance.
- **design-reviewer.mjs** — AI Slop detection + 10-dimension scoring.
- **review-dashboard.mjs** — Readiness dashboard with staleness detection.
- **scope-drift.mjs** — 3-way comparison (intent vs plan vs diff).
- **outside-voice.mjs** — Adversarial subagent review.
- **cso-audit.mjs** — 14-phase OWASP + STRIDE security audit.
- **qa-health-score.mjs** — 8-category weighted health score (A-F).
- **design-scoring.mjs** — AI Slop 10 + Litmus 7 + Hard Rejection 7.
- **benchmark-engine.mjs** — Performance regression detection with budgets.
- **retro-engine.mjs** — 13-step retrospective with session detection.
- **aria-refs.mjs** — ARIA accessibility tree element addressing.
- **browser-evidence.mjs** — MCP Playwright integration with evidence chain.
- **pdca-integration.mjs** — PDCA↔Review↔Ship gating.

### Ship (scripts/ship/)
- **ship-orchestrator.mjs** — 7-step pipeline controller (actual git execution).
- **ship-engine.mjs** — Ship state management.
- **preflight-check.mjs** — 4-check pre-ship validation.
- **test-triage.mjs** — Pre-existing vs branch-new failure classification.
- **version-bump.mjs** — Semantic versioning (major/minor/patch).
- **changelog-gen.mjs** — Conventional commit parsing + CHANGELOG generation.
- **pr-creator.mjs** — gh CLI PR creation with auto-generated body.
- **deploy-detect.mjs** — Platform detection (Fly/Render/Vercel/Netlify).
- **doc-release.mjs** — Post-ship documentation staleness detection.
- **canary-monitor.mjs** — Post-deploy health monitoring loop.

### Evidence (scripts/evidence/)
- **evidence-chain.mjs** — Structured proof collection (test/build/lint/review).
- **llm-judge.mjs** — 7-criteria LLM quality evaluation (0-10).
- **completeness-scorer.mjs** — Goal-backward verification (0-10).
- **goal-checker.mjs** — Derive assertions from original request.

### Pipeline (scripts/pipeline/)
- **autoplan-engine.mjs** — 6-principle auto-decision system.
- **team-orchestrator.mjs** — Team preset selection (Solo/Duo/Squad/Full).
- **adaptive-preamble.mjs** — Per-agent context generation.

### Guardrail (scripts/guardrail/)
- **guardrail-engine.mjs** — 7-rule declarative engine (block/warn/allow).
- **safety-invariants.mjs** — 5 hard limits (steps, files, time, paths, errors).
- **freeze-engine.mjs** — Directory-scoped edit restriction.
- **careful-checklist.mjs** — Dangerous command detection.
- **mutation-guard.mjs** — File modification audit trail.

### Recovery (scripts/recovery/)
- **circuit-breaker.mjs** — CLOSED→OPEN→HALF_OPEN state machine.
- **retry-engine.mjs** — Exponential backoff with jitter.
- **recovery-engine.mjs** — Rollback to git checkpoint.
- **health-check.mjs** — State file integrity validation.

### Telemetry (scripts/telemetry/)
- **telemetry-engine.mjs** — 3-tier (community/anonymous/off) + pending marker recovery.

### QA (scripts/qa/)
- **qa-orchestrator.mjs** — Health score + fix loop (max 5 cycles).
- **regression-detector.mjs** — Baseline comparison.

### Build (scripts/build/)
- **gen-skill-docs.mjs** — Template→SKILL.md generation with 20 placeholders.
- **resolvers/** — Dynamic content generators (review, ship, evidence, qa).
- **check-freshness.mjs** — CI freshness verification.
- **touchfiles.mjs** — Diff-based test selection.

### CLI (scripts/cli/)
- **aing-config.mjs** — Configuration management.
- **aing-diff-scope.mjs** — Change category detection.
- **aing-analytics.mjs** — Usage statistics dashboard.
- **aing-doctor.mjs** — Installation health check.

## Security Model

- **Guardrails**: 7 rules block dangerous operations (rm -rf, force push, DROP TABLE).
- **5 Hard Limits**: maxSteps(50), maxFileChanges(20), maxSessionMinutes(120), forbiddenPaths, maxConsecutiveErrors(5).
- **Freeze**: Directory-scoped edit restriction with trailing slash boundary.
- **Evidence Required**: No completion without test/build/lint proof.
- **Atomic Writes**: All state files use temp+rename to prevent corruption.

## Agent Team

| Role | Agent | Model | Responsibility |
|------|-------|:-----:|---------------|
| CEO | Simon | opus | Product strategy, scope decisions |
| CTO | Sam | opus | Final verdict, evidence verification |
| PM | Able | sonnet | Requirements, task decomposition |
| Architect | Klay | opus | Codebase scanning, architecture |
| Backend | Jay | sonnet | API development, TDD |
| DB | Jerry | sonnet | Schema, migrations |
| Security | Milla | sonnet | OWASP, CSO audit, code review |
| Performance | Jun | sonnet | Profiling, optimization |
| Code Intel | Kain | sonnet | Dead code, LSP, complexity |
| Design | Willji | sonnet | UI/UX, AI slop detection |
| Frontend | Iron | sonnet | React, wizard mode |
| Mobile | Derek | sonnet | Flutter, cross-platform |
| Motion | Rowan | sonnet | Animations, interactions |
