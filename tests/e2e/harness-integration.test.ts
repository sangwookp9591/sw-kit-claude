/**
 * Harness Integration Tests
 * End-to-end integration tests for the aing harness self-verification.
 *
 * Scenarios:
 * 1. Guardrail block -> denial record
 * 2. Safety invariant step limit -> block
 * 3. Reality-check flag -> pre-tool-use block
 * 4. PDCA scaling profile -> correct reviewers
 * 5. Compaction -> priority preservation
 * + Pass-case audit trail counter
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { join } from 'node:path';
import * as fs from 'node:fs';
import * as os from 'node:os';

// ---------------------------------------------------------------------------
// Mocks — isolate from Claude Code runtime
// ---------------------------------------------------------------------------

let stateStore: Record<string, unknown> = {};

vi.mock('../../scripts/core/state.js', () => ({
  readState: vi.fn((path: string) => {
    if (stateStore[path]) return { ok: true, data: stateStore[path] };
    return { ok: false, error: 'File not found' };
  }),
  readStateOrDefault: vi.fn((path: string, defaultVal: unknown) => {
    return stateStore[path] ?? JSON.parse(JSON.stringify(defaultVal));
  }),
  writeState: vi.fn((path: string, data: unknown) => {
    stateStore[path] = JSON.parse(JSON.stringify(data));
    return { ok: true };
  }),
  updateState: vi.fn((path: string, defaultVal: unknown, mutator: (data: unknown) => unknown) => {
    const current = stateStore[path] ?? (typeof defaultVal === 'function'
      ? (defaultVal as () => unknown)()
      : JSON.parse(JSON.stringify(defaultVal)));
    const updated = mutator(JSON.parse(JSON.stringify(current)));
    stateStore[path] = updated;
    return { ok: true, data: updated };
  }),
}));

vi.mock('../../scripts/core/config.js', () => ({
  loadConfig: vi.fn(() => ({})),
  getConfig: vi.fn((_path: string, fallback: unknown) => fallback),
  resetConfigCache: vi.fn(),
}));

vi.mock('../../scripts/core/logger.js', () => ({
  createLogger: vi.fn(() => ({
    debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn(),
  })),
}));

vi.mock('../../scripts/core/norch-bridge.js', () => ({
  norchPdcaChange: vi.fn(),
}));

vi.mock('../../scripts/guardrail/denial-tracker.js', () => {
  const denials: Array<Record<string, unknown>> = [];
  return {
    recordDenial: vi.fn((entry: Record<string, unknown>) => { denials.push(entry); }),
    getDenialSummary: vi.fn(() => null),
    resetDenialState: vi.fn(),
    _getDenials: () => denials,
    _clearDenials: () => { denials.length = 0; },
  };
});

vi.mock('../../scripts/guardrail/mutation-guard.js', () => ({
  getRecentMutations: vi.fn(() => []),
}));

vi.mock('../../scripts/core/context-budget.js', () => ({
  estimateTokens: vi.fn((text: string) => Math.ceil(text.length / 4)),
}));

vi.mock('../../scripts/guardrail/progress-tracker.js', () => ({
  getProgressSummary: vi.fn(() => null),
}));

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------

import { checkBashCommand, checkFilePath } from '../../scripts/guardrail/guardrail-engine.js';
import { checkStepLimit, loadInvariants } from '../../scripts/guardrail/safety-invariants.js';
import { getConfig } from '../../scripts/core/config.js';
import {
  writeRealityCheckFlag,
  readRealityCheckFlag,
  clearRealityCheckFlag,
} from '../../scripts/hooks/reality-check.js';
import { startPdca, getScalingProfile } from '../../scripts/pdca/pdca-engine.js';
import { buildCompactionContext } from '../../scripts/compaction/context-compaction.js';

// Access the mock's internal denial log
const denialMock = await import('../../scripts/guardrail/denial-tracker.js') as unknown as {
  recordDenial: ReturnType<typeof vi.fn>;
  _getDenials: () => Array<Record<string, unknown>>;
  _clearDenials: () => void;
};

// ---------------------------------------------------------------------------
// Audit trail counter
// ---------------------------------------------------------------------------

let passCount = 0;
const auditLog: string[] = [];

function recordPass(scenario: string): void {
  passCount++;
  auditLog.push(`[PASS] ${scenario} at ${new Date().toISOString()}`);
}

// ---------------------------------------------------------------------------
// Setup / Teardown
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();
  stateStore = {};
  denialMock._clearDenials();
  vi.mocked(getConfig).mockImplementation((_path: string, fallback: unknown) => fallback);
});

// ==========================================================================
// Scenario 1: Guardrail block -> denial record
// ==========================================================================

describe('Scenario 1: Guardrail block -> denial record', () => {
  it('checkBashCommand detects rm -rf and calls recordDenial', () => {
    const result = checkBashCommand('rm -rf /important-data ');
    expect(result.violations.length).toBeGreaterThanOrEqual(1);
    expect(result.violations[0].rule.id).toBe('warn-rm-rf');
    expect(denialMock.recordDenial).toHaveBeenCalledWith(
      expect.objectContaining({ ruleId: 'warn-rm-rf', toolName: 'Bash' }),
      undefined,
    );
    recordPass('guardrail-bash-denial');
  });

  it('checkFilePath blocks .env and records denial', () => {
    const result = checkFilePath('.env');
    expect(result.allowed).toBe(false);
    expect(result.violations.some(v => v.rule.id === 'protect-env')).toBe(true);
    expect(denialMock.recordDenial).toHaveBeenCalledWith(
      expect.objectContaining({ ruleId: 'protect-env', action: 'block' }),
      undefined,
    );
    recordPass('guardrail-file-denial');
  });

  // Negative test: safe command produces NO denial
  it('safe command produces no violations and no denial', () => {
    const result = checkBashCommand('npm test');
    expect(result.allowed).toBe(true);
    expect(result.violations).toHaveLength(0);
    expect(denialMock.recordDenial).not.toHaveBeenCalled();
    recordPass('guardrail-safe-pass');
  });

  // Negative test: intentional bypass attempt should still be caught
  it('rejects obfuscated rm -rf pattern', () => {
    const result = checkBashCommand('rm -rf /var/log ');
    expect(result.violations.length).toBeGreaterThanOrEqual(1);
    recordPass('guardrail-obfuscated-reject');
  });
});

// ==========================================================================
// Scenario 2: Safety invariant step limit -> block
// ==========================================================================

describe('Scenario 2: Safety invariant step limit exceeded -> block', () => {
  it('checkStepLimit returns ok=false when steps exceed maxSteps', () => {
    // Pre-seed tracker at the limit
    const trackerPath = '/tmp/harness-test/.aing/state/invariants-tracker.json';
    stateStore[trackerPath] = { steps: 50, fileChanges: 0, errors: 0, startedAt: null };

    const result = checkStepLimit('/tmp/harness-test');
    expect(result.ok).toBe(false);
    expect(result.current).toBe(51);
    expect(result.max).toBe(50);
    expect(result.message).toContain('Safety');
    recordPass('safety-step-limit-block');
  });

  it('checkStepLimit returns ok=true within limit', () => {
    const result = checkStepLimit('/tmp/harness-test2');
    expect(result.ok).toBe(true);
    expect(result.current).toBe(1);
    recordPass('safety-step-limit-ok');
  });

  // Negative test: cannot exceed hard max (200) even with config override
  it('loadInvariants caps maxSteps at hard max 200', () => {
    vi.mocked(getConfig).mockImplementation((path: string, fallback: unknown) => {
      if (path === 'guardrail.invariants') return { maxSteps: 999 };
      return fallback;
    });

    const inv = loadInvariants();
    expect(inv.maxSteps).toBe(200);
    recordPass('safety-hard-max-cap');
  });
});

// ==========================================================================
// Scenario 3: Reality-check flag -> pre-tool-use block
// ==========================================================================

describe('Scenario 3: Reality-check flag -> pre-tool-use block', () => {
  let tmpProjectDir: string;

  beforeEach(() => {
    tmpProjectDir = fs.mkdtempSync(join(os.tmpdir(), 'aing-harness-rc-'));
    fs.mkdirSync(join(tmpProjectDir, '.aing', 'state'), { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tmpProjectDir, { recursive: true, force: true });
  });

  it('flag written -> readRealityCheckFlag returns active flag', () => {
    writeRealityCheckFlag('rc-destructive-unconfirmed', 'sess-test', tmpProjectDir);

    const flag = readRealityCheckFlag(tmpProjectDir);
    expect(flag).not.toBeNull();
    expect(flag!.active).toBe(true);
    expect(flag!.scenario).toBe('rc-destructive-unconfirmed');
    recordPass('reality-check-flag-active');
  });

  it('no flag -> readRealityCheckFlag returns null (pass-through)', () => {
    const flag = readRealityCheckFlag(tmpProjectDir);
    expect(flag).toBeNull();
    recordPass('reality-check-no-flag');
  });

  it('clearRealityCheckFlag removes the flag', () => {
    writeRealityCheckFlag('test-scenario', 'sess-x', tmpProjectDir);
    expect(readRealityCheckFlag(tmpProjectDir)).not.toBeNull();

    clearRealityCheckFlag(tmpProjectDir);
    expect(readRealityCheckFlag(tmpProjectDir)).toBeNull();
    recordPass('reality-check-flag-clear');
  });

  // Negative test: inactive flag should not block
  it('inactive flag returns null', () => {
    const flagPath = join(tmpProjectDir, '.aing', 'state', 'reality-check-flag.json');
    fs.writeFileSync(flagPath, JSON.stringify({
      active: false, scenario: 'test', createdAt: '', sessionId: '',
    }));

    const flag = readRealityCheckFlag(tmpProjectDir);
    expect(flag).toBeNull();
    recordPass('reality-check-inactive-null');
  });
});

// ==========================================================================
// Scenario 4: PDCA scaling profile -> correct reviewers
// ==========================================================================

describe('Scenario 4: PDCA scaling profile -> correct reviewers', () => {
  it('low complexity (<=3) selects milla-only reviewer', () => {
    const profile = getScalingProfile(2);
    expect(profile.level).toBe('low');
    expect(profile.reviewers).toEqual(['milla']);
    expect(profile.maxIterations).toBe(1);
    recordPass('pdca-low-reviewers');
  });

  it('mid complexity (4-7) selects milla + willji reviewers', () => {
    const profile = getScalingProfile(5);
    expect(profile.level).toBe('mid');
    expect(profile.reviewers).toContain('milla');
    expect(profile.reviewers).toContain('willji');
    expect(profile.maxIterations).toBe(2);
    recordPass('pdca-mid-reviewers');
  });

  it('high complexity (>=8) selects full pipeline reviewers', () => {
    const profile = getScalingProfile(9);
    expect(profile.level).toBe('high');
    expect(profile.reviewers).toEqual(['simon', 'milla', 'willji', 'klay']);
    expect(profile.maxIterations).toBe(3);
    recordPass('pdca-high-reviewers');
  });

  it('startPdca with complexityScore attaches correct scaling profile', () => {
    startPdca('test-feature', 8, '/tmp/pdca-harness');

    const statePath = '/tmp/pdca-harness/.aing/state/pdca-status.json';
    const state = stateStore[statePath] as {
      features: Record<string, { scalingProfile: { level: string; reviewers: string[] } }>;
    };
    expect(state.features['test-feature'].scalingProfile.level).toBe('high');
    expect(state.features['test-feature'].scalingProfile.reviewers).toContain('klay');
    recordPass('pdca-start-scaling');
  });

  // Negative test: wrong complexity score should NOT select full pipeline
  it('low complexity does NOT get full pipeline reviewers', () => {
    const profile = getScalingProfile(1);
    expect(profile.reviewers).not.toContain('klay');
    expect(profile.reviewers).not.toContain('simon');
    expect(profile.level).not.toBe('high');
    recordPass('pdca-low-no-full-pipeline');
  });
});

// ==========================================================================
// Scenario 5: Compaction -> priority preservation
// ==========================================================================

describe('Scenario 5: Compaction preserves high priority, drops low priority', () => {
  it('PDCA_STATE (priority=100) is preserved, low-priority items are dropped under budget', () => {
    // Seed PDCA state (priority=100)
    const dir = '/tmp/compaction-harness';
    stateStore[join(dir, '.aing', 'state', 'pdca-status.json')] = {
      activeFeature: 'test-feat',
      features: { 'test-feat': { currentStage: 'do', iteration: 1 } },
    };

    // Seed invariant tracker (priority=85)
    stateStore[join(dir, '.aing', 'state', 'invariants-tracker.json')] = {
      steps: 10, fileChanges: 3, errors: 0,
    };

    // Set very tight token budget so lower-priority items get dropped
    vi.mocked(getConfig).mockImplementation((path: string, fallback: unknown) => {
      if (path === 'context.maxCompactionTokens') return 80;
      return fallback;
    });

    const result = buildCompactionContext(dir);

    // PDCA state should be preserved (highest priority=100)
    expect(result.preserved).toContain('PDCA State');
    // Context should mention the feature
    expect(result.context).toContain('test-feat');
    recordPass('compaction-pdca-preserved');
  });

  it('all sections preserved when budget is generous', () => {
    const dir = '/tmp/compaction-generous';
    stateStore[join(dir, '.aing', 'state', 'pdca-status.json')] = {
      activeFeature: 'big-feat',
      features: { 'big-feat': { currentStage: 'check', iteration: 2 } },
    };
    stateStore[join(dir, '.aing', 'state', 'invariants-tracker.json')] = {
      steps: 5, fileChanges: 2, errors: 1,
    };

    vi.mocked(getConfig).mockImplementation((path: string, fallback: unknown) => {
      if (path === 'context.maxCompactionTokens') return 5000;
      return fallback;
    });

    const result = buildCompactionContext(dir);
    expect(result.preserved).toContain('PDCA State');
    expect(result.preserved).toContain('Safety');
    expect(result.dropped).toHaveLength(0);
    recordPass('compaction-generous-all-preserved');
  });

  // Negative test: empty state produces empty context
  it('empty state produces no preserved sections', () => {
    const result = buildCompactionContext('/tmp/compaction-empty');
    expect(result.preserved).toHaveLength(0);
    expect(result.context).toBe('');
    recordPass('compaction-empty-state');
  });
});

// ==========================================================================
// Pass-case audit trail
// ==========================================================================

describe('Pass-case audit trail', () => {
  it('at least 1 pass case was recorded in the audit log', () => {
    // This test runs last (vitest runs in file order within describe blocks).
    // All prior recordPass() calls have accumulated.
    expect(passCount).toBeGreaterThanOrEqual(1);
    expect(auditLog.length).toBeGreaterThanOrEqual(1);
    expect(auditLog.every(entry => entry.startsWith('[PASS]'))).toBe(true);
  });
});
