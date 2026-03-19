/**
 * sw-kit Rollback System v1.0.0
 * Git-based automatic rollback on verification failure.
 * Harness Engineering: Correct axis — undo damage automatically.
 * Uses execFileSync (not execSync) to prevent shell injection.
 * @module scripts/pipeline/rollback
 */

import { readStateOrDefault, writeState } from '../core/state.mjs';
import { createLogger } from '../core/logger.mjs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';

const log = createLogger('rollback');

function git(args, cwd) {
  return execFileSync('git', args, { cwd, encoding: 'utf-8', stdio: 'pipe' }).trim();
}

/**
 * Create a git checkpoint (lightweight tag) for rollback.
 * @param {string} label
 * @param {string} [projectDir]
 * @returns {{ ok: boolean, tag?: string, commit?: string, error?: string }}
 */
export function createCheckpoint(label, projectDir) {
  const dir = projectDir || process.cwd();
  const tag = `swkit-checkpoint/${label}-${Date.now()}`;

  try {
    const commit = git(['rev-parse', 'HEAD'], dir);
    git(['tag', tag], dir);

    const checkpointPath = join(dir, '.sw-kit', 'state', 'checkpoints.json');
    const checkpoints = readStateOrDefault(checkpointPath, []);
    checkpoints.push({ tag, label, commit, createdAt: new Date().toISOString() });
    writeState(checkpointPath, checkpoints.slice(-10));

    log.info(`Checkpoint created: ${tag}`, { commit: commit.slice(0, 7) });
    return { ok: true, tag, commit };
  } catch (err) {
    log.error('Failed to create checkpoint', { error: err.message });
    return { ok: false, error: err.message };
  }
}

/**
 * List available rollback checkpoints.
 * @param {string} [projectDir]
 * @returns {Array}
 */
export function listCheckpoints(projectDir) {
  const dir = projectDir || process.cwd();
  return readStateOrDefault(join(dir, '.sw-kit', 'state', 'checkpoints.json'), []);
}

/**
 * Rollback to the latest checkpoint.
 * @param {string} [projectDir]
 * @returns {{ ok: boolean, rolledBackTo?: string, message: string }}
 */
export function rollbackToLatest(projectDir) {
  const checkpoints = listCheckpoints(projectDir);
  if (checkpoints.length === 0) {
    return { ok: false, message: '롤백 가능한 체크포인트가 없습니다.' };
  }
  return rollbackToCheckpoint(checkpoints[checkpoints.length - 1].tag, projectDir);
}

/**
 * Rollback to a specific checkpoint (non-destructive — creates new branch).
 * @param {string} tag
 * @param {string} [projectDir]
 * @returns {{ ok: boolean, rolledBackTo?: string, stashRef?: string, message: string }}
 */
export function rollbackToCheckpoint(tag, projectDir) {
  const dir = projectDir || process.cwd();

  try {
    const status = git(['status', '--porcelain'], dir);
    let stashRef = null;

    if (status) {
      git(['stash', 'push', '-m', 'sw-kit rollback safety stash'], dir);
      stashRef = 'stash@{0}';
      log.info('Uncommitted changes stashed before rollback');
    }

    const targetCommit = git(['rev-parse', tag], dir);
    const rollbackBranch = `swkit-rollback-${Date.now()}`;
    git(['checkout', '-b', rollbackBranch, tag], dir);

    log.info(`Rolled back to ${tag}`, { commit: targetCommit.slice(0, 7), branch: rollbackBranch });

    const rollbackLogPath = join(dir, '.sw-kit', 'state', 'rollback-log.json');
    const rollbackLog = readStateOrDefault(rollbackLogPath, []);
    rollbackLog.push({ tag, commit: targetCommit, branch: rollbackBranch, stashRef, rolledBackAt: new Date().toISOString() });
    writeState(rollbackLogPath, rollbackLog);

    return {
      ok: true,
      rolledBackTo: tag,
      stashRef,
      message: `✅ 롤백 완료: ${tag} (commit: ${targetCommit.slice(0, 7)})\n새 브랜치: ${rollbackBranch}` +
               (stashRef ? `\n변경사항은 git stash에 보존됨` : '')
    };
  } catch (err) {
    log.error('Rollback failed', { error: err.message, tag });
    return { ok: false, message: `롤백 실패: ${err.message}` };
  }
}

/**
 * Clean up old checkpoint tags.
 * @param {number} [keepCount=5]
 * @param {string} [projectDir]
 * @returns {{ removed: number }}
 */
export function cleanupCheckpoints(keepCount = 5, projectDir) {
  const dir = projectDir || process.cwd();
  const checkpoints = listCheckpoints(dir);
  if (checkpoints.length <= keepCount) return { removed: 0 };

  const toRemove = checkpoints.slice(0, checkpoints.length - keepCount);
  let removed = 0;
  for (const cp of toRemove) {
    try { git(['tag', '-d', cp.tag], dir); removed++; } catch (_) {}
  }

  writeState(join(dir, '.sw-kit', 'state', 'checkpoints.json'), checkpoints.slice(-keepCount));
  return { removed };
}

/**
 * Format rollback info for display.
 * @param {string} [projectDir]
 * @returns {string}
 */
export function formatRollbackInfo(projectDir) {
  const checkpoints = listCheckpoints(projectDir);
  if (checkpoints.length === 0) return '[sw-kit Rollback] 체크포인트 없음';

  const lines = ['[sw-kit Rollback] Available checkpoints:'];
  for (const cp of checkpoints.slice(-5)) {
    lines.push(`  📌 ${cp.label} — ${cp.commit.slice(0, 7)} (${cp.createdAt.slice(0, 19)})`);
  }
  return lines.join('\n');
}
