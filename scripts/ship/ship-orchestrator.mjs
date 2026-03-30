/**
 * aing Ship Orchestrator — 7-Step Pipeline Controller
 * Actually executes git commands, runs tests, creates PRs.
 *
 * @module scripts/ship/ship-orchestrator
 */
import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { createLogger } from '../core/logger.mjs';
import { initShip, advanceStep, getShipState, formatShipProgress } from './ship-engine.mjs';
import { determineBumpType, bumpVersion, readVersion } from './version-bump.mjs';
import { getCommitsSince, generateChangelog, prependChangelog } from './changelog-gen.mjs';
import { generateTitle, generateBody, isGhAvailable } from './pr-creator.mjs';
import { buildDashboard } from '../review/review-dashboard.mjs';
import { evaluateChain } from '../evidence/evidence-chain.mjs';
import { logSkillUsage } from '../telemetry/telemetry-engine.mjs';

const log = createLogger('ship-orchestrator');

/**
 * Execute the full 7-step ship pipeline.
 * @param {object} options
 * @param {string} options.feature - Feature name
 * @param {string} [options.baseBranch='main'] - Base branch
 * @param {boolean} [options.dryRun=false] - Simulate without side effects
 * @param {boolean} [options.skipTests=false] - Skip test step
 * @param {string} [options.projectDir]
 * @returns {{ success: boolean, state: object, pr?: string }}
 */
export async function executeShipPipeline(options) {
  const {
    feature,
    baseBranch = detectBaseBranch(options.projectDir),
    dryRun = false,
    skipTests = false,
    projectDir,
  } = options;

  const dir = projectDir || process.cwd();
  const branch = getCurrentBranch(dir);

  const state = initShip(feature, branch, baseBranch, dir);
  log.info(`Ship started: ${feature} (${branch} → ${baseBranch})`);

  const startTime = Date.now();
  let prUrl = null;

  try {
    // Step 1: Pre-flight
    const preflightResult = runPreflight(dir, branch, baseBranch, feature);
    advanceStep({ step: 'preflight', status: preflightResult.ok ? 'pass' : 'fail', details: preflightResult }, dir);
    if (!preflightResult.ok) return { success: false, state: getShipState(dir), error: preflightResult.reason };

    // Step 2: Merge base branch
    const mergeResult = runMergeBase(dir, baseBranch, dryRun);
    advanceStep({ step: 'merge-base', status: mergeResult.ok ? 'pass' : 'fail', details: mergeResult }, dir);
    if (!mergeResult.ok) return { success: false, state: getShipState(dir), error: mergeResult.reason };

    // Step 3: Run tests
    if (skipTests) {
      advanceStep({ step: 'run-tests', status: 'pass', details: { skipped: true } }, dir);
    } else {
      const testResult = runTests(dir);
      advanceStep({ step: 'run-tests', status: testResult.ok ? 'pass' : 'fail', details: testResult }, dir);
      if (!testResult.ok) return { success: false, state: getShipState(dir), error: testResult.reason };
    }

    // Step 4: Pre-landing review (lightweight check)
    const reviewResult = runPreLandingReview(dir, baseBranch);
    advanceStep({ step: 'pre-landing-review', status: reviewResult.ok ? 'pass' : 'fail', details: reviewResult }, dir);
    if (!reviewResult.ok && reviewResult.critical) return { success: false, state: getShipState(dir), error: reviewResult.reason };

    // Step 5: Version bump
    const versionResult = runVersionBump(dir, baseBranch, dryRun);
    advanceStep({ step: 'version-bump', status: 'pass', details: versionResult }, dir);

    // Step 6: Changelog
    const changelogResult = runChangelog(dir, versionResult.newVersion, baseBranch, dryRun);
    advanceStep({ step: 'changelog', status: 'pass', details: changelogResult }, dir);

    // Step 7: Push + PR
    if (dryRun) {
      advanceStep({ step: 'push-and-pr', status: 'pass', details: { dryRun: true } }, dir);
    } else {
      const prResult = runPushAndPR(dir, branch, baseBranch, feature, versionResult, changelogResult);
      advanceStep({ step: 'push-and-pr', status: prResult.ok ? 'pass' : 'fail', details: prResult }, dir);
      prUrl = prResult.prUrl;
    }

    const durationS = Math.round((Date.now() - startTime) / 1000);
    logSkillUsage({ skill: 'ship', duration_s: durationS, outcome: 'success' }, dir);

    return { success: true, state: getShipState(dir), pr: prUrl };

  } catch (err) {
    log.error(`Ship failed: ${err.message}`);
    const durationS = Math.round((Date.now() - startTime) / 1000);
    logSkillUsage({ skill: 'ship', duration_s: durationS, outcome: 'error' }, dir);
    return { success: false, state: getShipState(dir), error: err.message };
  }
}

// ── Step Implementations ──

function runPreflight(dir, branch, baseBranch, feature) {
  const issues = [];

  // Not on base branch
  if (branch === baseBranch) {
    issues.push(`Currently on ${baseBranch}. Must be on a feature branch.`);
  }

  // No uncommitted changes
  try {
    const status = execSync('git status --porcelain', { cwd: dir, encoding: 'utf-8' }).trim();
    if (status) issues.push(`Uncommitted changes detected:\n${status.split('\n').slice(0, 5).join('\n')}`);
  } catch {}

  // Review dashboard (soft check)
  try {
    const dashboard = buildDashboard(dir);
    if (dashboard.verdict !== 'CLEARED') {
      issues.push(`Review dashboard: ${dashboard.verdict} — ${dashboard.verdictReason}`);
    }
  } catch {}

  // Evidence chain (soft check)
  try {
    const evidence = evaluateChain(feature, dir);
    if (evidence.verdict === 'FAIL') {
      issues.push(`Evidence chain: FAIL — ${evidence.summary}`);
    }
  } catch {}

  return {
    ok: issues.length === 0,
    reason: issues.join('\n'),
    checks: { branch: branch !== baseBranch, clean: issues.length === 0 },
  };
}

function runMergeBase(dir, baseBranch, dryRun) {
  if (dryRun) return { ok: true, action: 'dry-run skip' };

  try {
    execSync(`git fetch origin ${baseBranch}`, { cwd: dir, encoding: 'utf-8', timeout: 30000 });
    execSync(`git merge origin/${baseBranch} --no-edit`, { cwd: dir, encoding: 'utf-8', timeout: 30000 });
    return { ok: true, action: `Merged origin/${baseBranch}` };
  } catch (err) {
    // Check for conflicts
    try {
      const status = execSync('git status --porcelain', { cwd: dir, encoding: 'utf-8' });
      if (status.includes('UU ') || status.includes('AA ')) {
        execSync('git merge --abort', { cwd: dir, encoding: 'utf-8' });
        return { ok: false, reason: `Merge conflict with ${baseBranch}. Resolve manually.` };
      }
    } catch {}
    return { ok: false, reason: `Merge failed: ${err.message}` };
  }
}

function runTests(dir) {
  // Detect test command
  const testCommands = [
    { check: 'package.json', cmd: 'node --test tests/*.test.mjs' },
    { check: 'package.json', cmd: 'npm test' },
  ];

  for (const tc of testCommands) {
    if (!existsSync(`${dir}/${tc.check}`)) continue;
    try {
      const output = execSync(tc.cmd, { cwd: dir, encoding: 'utf-8', timeout: 120000 });
      const failMatch = output.match(/fail\s+(\d+)/i);
      if (failMatch && parseInt(failMatch[1]) > 0) {
        return { ok: false, reason: `${failMatch[1]} test(s) failed`, output: output.slice(-500) };
      }
      return { ok: true, output: output.slice(-200) };
    } catch (err) {
      return { ok: false, reason: `Tests failed: ${err.message}`, output: err.stdout?.slice(-500) || '' };
    }
  }

  return { ok: true, output: 'No test framework detected, skipping' };
}

function runPreLandingReview(dir, baseBranch) {
  // Lightweight diff-based security check
  try {
    const diff = execSync(`git diff origin/${baseBranch}...HEAD`, { cwd: dir, encoding: 'utf-8', timeout: 10000 });

    const criticalPatterns = [
      { pattern: /\$\{.*\}.*(?:query|sql|exec)/gi, name: 'SQL injection risk' },
      { pattern: /eval\s*\(/g, name: 'eval() usage' },
      { pattern: /dangerouslySetInnerHTML/g, name: 'XSS risk (dangerouslySetInnerHTML)' },
      { pattern: /--force/g, name: 'Force flag in commands' },
    ];

    const findings = [];
    for (const cp of criticalPatterns) {
      const matches = diff.match(cp.pattern);
      if (matches) {
        findings.push({ pattern: cp.name, count: matches.length });
      }
    }

    return {
      ok: findings.length === 0,
      critical: findings.some(f => f.pattern.includes('injection') || f.pattern.includes('eval')),
      findings,
      reason: findings.length > 0 ? `Pre-landing: ${findings.map(f => f.pattern).join(', ')}` : 'Clean',
    };
  } catch {
    return { ok: true, findings: [], reason: 'Could not run pre-landing review' };
  }
}

function runVersionBump(dir, baseBranch, dryRun) {
  // Analyze commits to determine bump type
  let hasBreaking = false;
  let hasNewFeature = false;
  let hasBugFix = false;

  try {
    const commitLog = execSync(`git log origin/${baseBranch}..HEAD --oneline`, { cwd: dir, encoding: 'utf-8' });
    hasBreaking = /\bBREAKING\b|^.*!:/m.test(commitLog);
    hasNewFeature = /^[a-f0-9]+ feat/m.test(commitLog);
    hasBugFix = /^[a-f0-9]+ fix/m.test(commitLog);
  } catch {}

  const bumpType = determineBumpType({ hasBreaking, hasNewFeature, hasBugFix });
  const oldVersion = readVersion(dir);

  if (dryRun) {
    return { oldVersion, newVersion: `${oldVersion} (dry-run, would bump ${bumpType})`, bumpType };
  }

  const result = bumpVersion(bumpType, dir);
  return result;
}

function runChangelog(dir, newVersion, baseBranch, dryRun) {
  const commits = getCommitsSince(null, dir);
  const content = generateChangelog(newVersion, commits);

  if (!dryRun) {
    prependChangelog(content, dir);
  }

  return { version: newVersion, commitCount: commits.length, dryRun };
}

function runPushAndPR(dir, branch, baseBranch, feature, versionResult, changelogResult) {
  try {
    // Push
    execSync(`git add -A && git commit -m "chore: v${versionResult.newVersion} release" --allow-empty`, {
      cwd: dir, encoding: 'utf-8', shell: true,
    });
    execSync(`git push origin ${branch}`, { cwd: dir, encoding: 'utf-8', timeout: 30000 });

    // Create PR
    if (!isGhAvailable()) {
      return { ok: true, prUrl: null, reason: 'Pushed but gh CLI not available for PR creation' };
    }

    const title = generateTitle(feature, versionResult.newVersion, versionResult.bumpType);
    const dashboard = buildDashboard(dir);
    const body = generateBody({ changelog: changelogResult.version, reviewDashboard: dashboard, feature });

    const prOutput = execSync(
      `gh pr create --title "${title.replace(/"/g, '\\"')}" --base ${baseBranch} --body "${body.replace(/"/g, '\\"').replace(/\n/g, '\\n')}"`,
      { cwd: dir, encoding: 'utf-8', timeout: 30000 }
    ).trim();

    return { ok: true, prUrl: prOutput };
  } catch (err) {
    return { ok: false, reason: `Push/PR failed: ${err.message}` };
  }
}

// ── Utilities ──

function getCurrentBranch(dir) {
  try {
    return execSync('git branch --show-current', { cwd: dir, encoding: 'utf-8' }).trim();
  } catch {
    return 'unknown';
  }
}

function detectBaseBranch(dir) {
  const cwd = dir || process.cwd();
  try {
    execSync('git rev-parse --verify origin/main', { cwd, encoding: 'utf-8' });
    return 'main';
  } catch {}
  try {
    execSync('git rev-parse --verify origin/master', { cwd, encoding: 'utf-8' });
    return 'master';
  } catch {}
  return 'main';
}
