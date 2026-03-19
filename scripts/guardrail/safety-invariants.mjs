/**
 * sw-kit Safety Invariants v0.3.0
 * Hard limits that can never be overridden by the agent.
 * Harness Engineering: Constrain axis — absolute boundaries.
 * @module scripts/guardrail/safety-invariants
 */

import { readStateOrDefault, writeState } from '../core/state.mjs';
import { getConfig } from '../core/config.mjs';
import { createLogger } from '../core/logger.mjs';
import { join } from 'node:path';

const log = createLogger('safety-invariants');

/**
 * Default invariant limits
 */
const DEFAULT_INVARIANTS = {
  maxSteps: 50,              // Max agent execution steps per task
  maxFileChanges: 20,        // Max files changed in one session
  maxSessionMinutes: 120,    // Max session duration
  forbiddenPaths: [          // Absolute no-touch paths
    '/etc/',
    '/usr/',
    '/System/',
    '~/.ssh/',
    '~/.aws/credentials'
  ],
  requireTestBeforeCommit: false,  // Require test pass before git commit
  maxConsecutiveErrors: 5          // Max errors before force-stop suggestion
};

function getInvariantsPath(projectDir) {
  return join(projectDir || process.cwd(), '.sw-kit', 'state', 'invariants-tracker.json');
}

/**
 * Load invariant limits (config overrides defaults, but cannot exceed hard max).
 * @param {string} [projectDir]
 * @returns {object} Active invariants
 */
export function loadInvariants(projectDir) {
  const userInvariants = getConfig('guardrail.invariants', {});

  // Hard maximums that config CANNOT exceed
  const HARD_MAX = {
    maxSteps: 200,
    maxFileChanges: 100,
    maxSessionMinutes: 480,
    maxConsecutiveErrors: 20
  };

  const merged = { ...DEFAULT_INVARIANTS };
  for (const [key, value] of Object.entries(userInvariants)) {
    if (key === 'forbiddenPaths' && Array.isArray(value)) {
      merged.forbiddenPaths = [...DEFAULT_INVARIANTS.forbiddenPaths, ...value];
    } else if (typeof value === 'number' && HARD_MAX[key]) {
      merged[key] = Math.min(value, HARD_MAX[key]);
    } else if (typeof value === 'boolean') {
      merged[key] = value;
    }
  }

  return merged;
}

/**
 * Track and check step count invariant.
 * @param {string} [projectDir]
 * @returns {{ ok: boolean, current: number, max: number, message?: string }}
 */
export function checkStepLimit(projectDir) {
  const invariants = loadInvariants(projectDir);
  const trackerPath = getInvariantsPath(projectDir);
  const tracker = readStateOrDefault(trackerPath, { steps: 0, fileChanges: 0, errors: 0, startedAt: null });

  tracker.steps++;
  if (!tracker.startedAt) tracker.startedAt = new Date().toISOString();
  writeState(trackerPath, tracker);

  if (tracker.steps > invariants.maxSteps) {
    log.error(`Step limit exceeded: ${tracker.steps}/${invariants.maxSteps}`);
    return {
      ok: false,
      current: tracker.steps,
      max: invariants.maxSteps,
      message: `[sw-kit Safety] 실행 단계 한도 초과 (${tracker.steps}/${invariants.maxSteps}). 작업을 분할하거나 설정에서 maxSteps를 조정하세요.`
    };
  }

  return { ok: true, current: tracker.steps, max: invariants.maxSteps };
}

/**
 * Track and check file change count.
 * @param {string} filePath
 * @param {string} [projectDir]
 * @returns {{ ok: boolean, current: number, max: number, message?: string }}
 */
export function checkFileChangeLimit(filePath, projectDir) {
  const invariants = loadInvariants(projectDir);
  const trackerPath = getInvariantsPath(projectDir);
  const tracker = readStateOrDefault(trackerPath, { steps: 0, fileChanges: 0, errors: 0, changedFiles: [] });

  if (!tracker.changedFiles) tracker.changedFiles = [];
  if (!tracker.changedFiles.includes(filePath)) {
    tracker.changedFiles.push(filePath);
    tracker.fileChanges = tracker.changedFiles.length;
    writeState(trackerPath, tracker);
  }

  if (tracker.fileChanges > invariants.maxFileChanges) {
    log.error(`File change limit exceeded: ${tracker.fileChanges}/${invariants.maxFileChanges}`);
    return {
      ok: false,
      current: tracker.fileChanges,
      max: invariants.maxFileChanges,
      message: `[sw-kit Safety] 파일 변경 한도 초과 (${tracker.fileChanges}/${invariants.maxFileChanges}). 커밋 후 계속하세요.`
    };
  }

  return { ok: true, current: tracker.fileChanges, max: invariants.maxFileChanges };
}

/**
 * Check if a path is in the forbidden list.
 * @param {string} filePath
 * @param {string} [projectDir]
 * @returns {{ ok: boolean, message?: string }}
 */
export function checkForbiddenPath(filePath, projectDir) {
  const invariants = loadInvariants(projectDir);
  const expanded = filePath.replace('~', process.env.HOME || '');

  for (const forbidden of invariants.forbiddenPaths) {
    const expandedForbidden = forbidden.replace('~', process.env.HOME || '');
    if (expanded.startsWith(expandedForbidden)) {
      log.error(`Forbidden path access: ${filePath}`);
      return {
        ok: false,
        message: `[sw-kit Safety] 🚫 접근 금지 경로: ${filePath}`
      };
    }
  }

  return { ok: true };
}

/**
 * Track consecutive errors and check limit.
 * @param {string} [projectDir]
 * @returns {{ ok: boolean, current: number, max: number, message?: string }}
 */
export function checkErrorLimit(projectDir) {
  const invariants = loadInvariants(projectDir);
  const trackerPath = getInvariantsPath(projectDir);
  const tracker = readStateOrDefault(trackerPath, { steps: 0, fileChanges: 0, errors: 0 });

  tracker.errors++;
  writeState(trackerPath, tracker);

  if (tracker.errors > invariants.maxConsecutiveErrors) {
    return {
      ok: false,
      current: tracker.errors,
      max: invariants.maxConsecutiveErrors,
      message: `[sw-kit Safety] 연속 에러 한도 초과 (${tracker.errors}/${invariants.maxConsecutiveErrors}). 접근 방식을 변경하거나 도움을 요청하세요.`
    };
  }

  return { ok: true, current: tracker.errors, max: invariants.maxConsecutiveErrors };
}

/**
 * Reset error counter (called on successful operation).
 * @param {string} [projectDir]
 */
export function resetErrorCount(projectDir) {
  const trackerPath = getInvariantsPath(projectDir);
  const tracker = readStateOrDefault(trackerPath, { steps: 0, fileChanges: 0, errors: 0 });
  tracker.errors = 0;
  writeState(trackerPath, tracker);
}

/**
 * Reset all invariant trackers (called at session start).
 * @param {string} [projectDir]
 */
export function resetTrackers(projectDir) {
  const trackerPath = getInvariantsPath(projectDir);
  writeState(trackerPath, {
    steps: 0,
    fileChanges: 0,
    errors: 0,
    changedFiles: [],
    startedAt: new Date().toISOString()
  });
}

/**
 * Get current tracker status for display.
 * @param {string} [projectDir]
 * @returns {object}
 */
export function getTrackerStatus(projectDir) {
  const invariants = loadInvariants(projectDir);
  const trackerPath = getInvariantsPath(projectDir);
  const tracker = readStateOrDefault(trackerPath, { steps: 0, fileChanges: 0, errors: 0, changedFiles: [] });

  return {
    steps: `${tracker.steps}/${invariants.maxSteps}`,
    fileChanges: `${tracker.fileChanges}/${invariants.maxFileChanges}`,
    errors: `${tracker.errors}/${invariants.maxConsecutiveErrors}`,
    startedAt: tracker.startedAt,
    changedFiles: tracker.changedFiles || []
  };
}
