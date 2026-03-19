/**
 * sw-kit Handoff Manager v1.3.0
 * Auto-generates handoff documents on pipeline stage transitions.
 * @module scripts/pipeline/handoff
 */

import { readStateOrDefault, writeState } from '../core/state.mjs';
import { createLogger } from '../core/logger.mjs';
import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const log = createLogger('handoff');

function getHandoffDir(projectDir) {
  const dir = join(projectDir || process.cwd(), '.sw-kit', 'handoffs');
  mkdirSync(dir, { recursive: true });
  return dir;
}

/**
 * Create a handoff document for stage transition.
 * @param {object} params
 * @param {string} params.fromStage - Current stage
 * @param {string} params.toStage - Next stage
 * @param {string[]} params.decided - Key decisions made
 * @param {string[]} [params.rejected] - Alternatives rejected
 * @param {string[]} [params.risks] - Identified risks
 * @param {string[]} [params.files] - Key files created/modified
 * @param {string[]} [params.remaining] - Items for next stage
 * @param {string} [projectDir]
 * @returns {{ ok: boolean, path: string }}
 */
export function createHandoff(params, projectDir) {
  const dir = getHandoffDir(projectDir);
  const fileName = `${params.fromStage}-to-${params.toStage}.md`;
  const filePath = join(dir, fileName);
  const now = new Date().toISOString();

  const lines = [
    `## Handoff: ${params.fromStage} → ${params.toStage}`,
    `> Generated: ${now}`,
    '',
    `- **Decided**: ${(params.decided || []).join('; ') || 'None'}`,
    `- **Rejected**: ${(params.rejected || []).join('; ') || 'None'}`,
    `- **Risks**: ${(params.risks || []).join('; ') || 'None identified'}`,
    `- **Files**: ${(params.files || []).join(', ') || 'None'}`,
    `- **Remaining**: ${(params.remaining || []).join('; ') || 'None'}`
  ];

  try {
    writeFileSync(filePath, lines.join('\n'), 'utf-8');
    log.info(`Handoff created: ${fileName}`);

    // Update handoff index
    const indexPath = join(dir, '_index.json');
    const index = readStateOrDefault(indexPath, []);
    index.push({
      from: params.fromStage,
      to: params.toStage,
      file: fileName,
      createdAt: now
    });
    writeState(indexPath, index);

    return { ok: true, path: filePath };
  } catch (err) {
    log.error('Failed to create handoff', { error: err.message });
    return { ok: false, path: '' };
  }
}

/**
 * Load handoff context for a stage (reads all prior handoffs).
 * @param {string} currentStage
 * @param {string} [projectDir]
 * @returns {string} Combined handoff context
 */
export function loadHandoffContext(currentStage, projectDir) {
  const dir = getHandoffDir(projectDir);
  const indexPath = join(dir, '_index.json');
  const index = readStateOrDefault(indexPath, []);

  const relevant = index.filter(h => h.to === currentStage || index.indexOf(h) < index.findIndex(x => x.to === currentStage));

  if (relevant.length === 0) return '';

  const parts = ['[sw-kit Handoffs]'];
  for (const h of relevant) {
    const filePath = join(dir, h.file);
    if (existsSync(filePath)) {
      try {
        parts.push(readFileSync(filePath, 'utf-8'));
        parts.push('');
      } catch (_) {}
    }
  }

  return parts.join('\n');
}

/**
 * List all handoff documents.
 * @param {string} [projectDir]
 * @returns {Array}
 */
export function listHandoffs(projectDir) {
  const indexPath = join(getHandoffDir(projectDir), '_index.json');
  return readStateOrDefault(indexPath, []);
}

/**
 * Auto-generate handoff from pipeline state.
 * Called automatically on pipeline stage transition.
 * @param {object} pipelineState
 * @param {string} fromStage
 * @param {string} toStage
 * @param {string} [projectDir]
 */
export function autoHandoff(pipelineState, fromStage, toStage, projectDir) {
  const completedStage = pipelineState.stages?.find(s => s.id === fromStage);

  createHandoff({
    fromStage,
    toStage,
    decided: completedStage?.result?.data ? [JSON.stringify(completedStage.result.data).slice(0, 200)] : ['Stage completed'],
    risks: completedStage?.result?.outcome === 'fail' ? ['Previous stage had failures'] : [],
    files: [],
    remaining: pipelineState.stages?.filter(s => s.status === 'pending').map(s => `${s.emoji} ${s.name}`) || []
  }, projectDir);
}
