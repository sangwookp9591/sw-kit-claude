/**
 * aing Eng Reviewer — Architecture, Code Quality, Tests, Performance
 * Klay(Architect) + Jay(Backend) + Milla(Security) perspective.
 * @module scripts/review/eng-reviewer
 */
import { createLogger } from '../core/logger.mjs';
import { runChecklist, classifyResults, formatChecklistResults } from './review-checklist.mjs';
import { recordReview } from './review-engine.mjs';

const log = createLogger('eng-reviewer');

/**
 * Eng review sections (maps to review-checklist.mjs categories).
 */
export const ENG_SECTIONS = [
  { id: 'architecture', name: 'Architecture', agents: ['klay'], focus: 'Component boundaries, dependency graph, coupling' },
  { id: 'code-quality', name: 'Code Quality', agents: ['jay'], focus: 'DRY, error handling, naming, complexity' },
  { id: 'tests', name: 'Test Coverage', agents: ['jay'], focus: 'Missing tests, edge cases, regression tests' },
  { id: 'security', name: 'Security', agents: ['milla'], focus: 'OWASP Top 10, auth, injection, data exposure' },
  { id: 'performance', name: 'Performance', agents: ['jay'], focus: 'N+1, memory, caching, bundle size' },
];

/**
 * Run eng review against diff.
 * @param {string} diff - Git diff content
 * @param {string} [projectDir]
 * @returns {{ results: Array, classified: object, formatted: string }}
 */
export function runEngReview(diff, projectDir) {
  const results = runChecklist(diff);
  const classified = classifyResults(results);
  const formatted = formatChecklistResults(results, classified);

  recordReview('eng-review', {
    status: classified.summary.critical === 0 ? 'clean' : 'issues_open',
    issues_found: classified.summary.total,
    critical_gaps: classified.summary.critical,
    mode: 'ENG_REVIEW',
  }, projectDir);

  return { results, classified, formatted };
}

/**
 * Build eng review prompt for agents.
 * @param {object} context
 * @returns {string}
 */
export function buildEngReviewPrompt(context) {
  const sections = ENG_SECTIONS.map(s =>
    `### ${s.name} (${s.agents.join(', ')})\n${s.focus}`
  ).join('\n\n');

  return `# Eng Review — ${context.feature || 'unknown'}

## Sections
${sections}

## 18-Category Checklist
Run all categories from review-checklist.mjs against the diff.
For each finding: file:line reference, severity, fix suggestion.

## Output
- CRITICAL findings → block ship
- INFORMATIONAL → classify as AUTO-FIX or ASK
- Produce ASCII test coverage diagram`;
}
