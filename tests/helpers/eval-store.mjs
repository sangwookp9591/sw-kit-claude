/**
 * aing Eval Store — Test Result Persistence & Comparison
 * Absorbed from gstack's eval-store.ts pattern.
 *
 * @module tests/helpers/eval-store
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { hostname } from 'node:os';

const EVAL_DIR = '.aing/evals';

/**
 * @typedef {object} EvalResult
 * @property {string} version
 * @property {string} branch
 * @property {string} gitSha
 * @property {string} timestamp
 * @property {number} totalTests
 * @property {number} passed
 * @property {number} failed
 * @property {number} totalDurationMs
 * @property {Array<EvalTestEntry>} tests
 */

/**
 * Save eval results.
 * @param {EvalResult} result
 * @param {string} [projectDir]
 * @returns {string} Path to saved file
 */
export function saveEvalResult(result, projectDir) {
  const dir = projectDir || process.cwd();
  const evalDir = join(dir, EVAL_DIR);
  mkdirSync(evalDir, { recursive: true });

  let version = '0.0.0';
  try {
    const pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf-8'));
    version = pkg.version || version;
  } catch {}

  let branch = 'unknown';
  let sha = 'unknown';
  try {
    branch = execFileSync('git', ['branch', '--show-current'], { cwd: dir, encoding: 'utf-8' }).trim();
    sha = execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: dir, encoding: 'utf-8' }).trim();
  } catch {}

  const enriched = {
    ...result,
    version,
    branch,
    gitSha: sha,
    timestamp: new Date().toISOString(),
    hostname: hostname(),
  };

  const filename = `${version}-${branch}-${Date.now()}.json`;
  const filePath = join(evalDir, filename);
  writeFileSync(filePath, JSON.stringify(enriched, null, 2));

  return filePath;
}

/**
 * Find the most recent eval result for comparison.
 * @param {string} [projectDir]
 * @param {string} [branch] - Prefer same branch, fallback to any
 * @param {string} [excludeFile] - File to exclude (current run)
 * @returns {EvalResult|null}
 */
export function findPreviousRun(projectDir, branch, excludeFile) {
  const dir = projectDir || process.cwd();
  const evalDir = join(dir, EVAL_DIR);

  if (!existsSync(evalDir)) return null;

  const files = readdirSync(evalDir)
    .filter(f => f.endsWith('.json') && f !== excludeFile)
    .sort()
    .reverse();

  // Prefer same branch
  if (branch) {
    const sameBranch = files.find(f => f.includes(branch));
    if (sameBranch) {
      try {
        return JSON.parse(readFileSync(join(evalDir, sameBranch), 'utf-8'));
      } catch {}
    }
  }

  // Fallback to most recent
  if (files.length > 0) {
    try {
      return JSON.parse(readFileSync(join(evalDir, files[0]), 'utf-8'));
    } catch {}
  }

  return null;
}

/**
 * Compare two eval runs and detect regressions.
 * @param {EvalResult} before
 * @param {EvalResult} after
 * @returns {{ regressions: Array, improvements: Array, unchanged: Array }}
 */
export function compareRuns(before, after) {
  const regressions = [];
  const improvements = [];
  const unchanged = [];

  const beforeMap = new Map(before.tests?.map(t => [t.name, t]) || []);
  const afterMap = new Map(after.tests?.map(t => [t.name, t]) || []);

  for (const [name, afterTest] of afterMap) {
    const beforeTest = beforeMap.get(name);

    if (!beforeTest) {
      // New test
      improvements.push({ name, type: 'new', after: afterTest });
      continue;
    }

    if (beforeTest.passed && !afterTest.passed) {
      regressions.push({ name, type: 'regression', before: beforeTest, after: afterTest });
    } else if (!beforeTest.passed && afterTest.passed) {
      improvements.push({ name, type: 'fixed', before: beforeTest, after: afterTest });
    } else {
      unchanged.push({ name, before: beforeTest, after: afterTest });
    }
  }

  return { regressions, improvements, unchanged };
}

/**
 * Format comparison for display.
 * @param {object} comparison
 * @returns {string}
 */
export function formatComparison(comparison) {
  const lines = ['Eval Comparison:'];

  if (comparison.regressions.length > 0) {
    lines.push(`\n  REGRESSIONS (${comparison.regressions.length}):`);
    for (const r of comparison.regressions) {
      lines.push(`    ✗ ${r.name} — was PASS, now FAIL`);
    }
  }

  if (comparison.improvements.length > 0) {
    lines.push(`\n  IMPROVEMENTS (${comparison.improvements.length}):`);
    for (const i of comparison.improvements) {
      lines.push(`    ✓ ${i.name} — ${i.type}`);
    }
  }

  lines.push(`\n  Unchanged: ${comparison.unchanged.length}`);
  lines.push(`  Total: ${comparison.regressions.length} regressions, ${comparison.improvements.length} improvements`);

  return lines.join('\n');
}
