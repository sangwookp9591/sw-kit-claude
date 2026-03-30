/**
 * aing Mutation Guard — Track and audit file modifications
 * @module scripts/guardrail/mutation-guard
 */
import { readStateOrDefault, writeState } from '../core/state.mjs';
import { createLogger } from '../core/logger.mjs';
import { join } from 'node:path';

const log = createLogger('mutation-guard');

/**
 * Record a file mutation for audit.
 * @param {string} filePath - Modified file
 * @param {string} action - 'create' | 'edit' | 'delete'
 * @param {string} agent - Agent that made the change
 * @param {string} [projectDir]
 */
export function recordMutation(filePath, action, agent, projectDir) {
  const dir = projectDir || process.cwd();
  const auditPath = join(dir, '.aing', 'state', 'mutation-audit.json');
  const audit = readStateOrDefault(auditPath, { mutations: [] });

  audit.mutations.push({
    file: filePath,
    action,
    agent,
    ts: new Date().toISOString(),
  });

  // Keep last 200 mutations
  if (audit.mutations.length > 200) {
    audit.mutations = audit.mutations.slice(-200);
  }

  writeState(auditPath, audit);
}

/**
 * Get recent mutations.
 * @param {number} [limit=20]
 * @param {string} [projectDir]
 * @returns {Array}
 */
export function getRecentMutations(limit = 20, projectDir) {
  const dir = projectDir || process.cwd();
  const auditPath = join(dir, '.aing', 'state', 'mutation-audit.json');
  const audit = readStateOrDefault(auditPath, { mutations: [] });
  return audit.mutations.slice(-limit);
}

/**
 * Format mutation audit for display.
 * @param {Array} mutations
 * @returns {string}
 */
export function formatMutationAudit(mutations) {
  if (mutations.length === 0) return 'No mutations recorded.';
  const lines = [`Mutation Audit (${mutations.length} recent):`];
  for (const m of mutations.slice(-10)) {
    lines.push(`  ${m.ts.slice(11, 19)} [${m.action}] ${m.file} (${m.agent})`);
  }
  return lines.join('\n');
}
