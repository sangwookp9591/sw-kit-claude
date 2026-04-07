#!/usr/bin/env node
/**
 * Agent Prompt Consistency Check
 *
 * Verifies that each agents/*.md file reflects the Hard Limits
 * defined in CLAUDE.md. Keywords are extracted from
 * `<!-- harness-keyword: ... -->` comments in CLAUDE.md, falling
 * back to a hardcoded set when no such comments exist.
 *
 * An agent file passes a keyword check if it either:
 *   1. Contains the keyword directly, OR
 *   2. Contains an inheritance phrase like "CLAUDE.md 참조" or
 *      "Hard Limits 준수"
 *
 * Exit 0 = all agents consistent.
 * Exit 1 = inconsistencies found (report printed to stderr).
 *
 * Usage:
 *   npx tsx scripts/build/check-agent-consistency.ts
 *
 * @module scripts/build/check-agent-consistency
 */
export {};
//# sourceMappingURL=check-agent-consistency.d.ts.map