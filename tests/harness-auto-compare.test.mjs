/**
 * aing Harness Auto-Compare Test Suite
 * Tests autoCompare: latest 2 versions auto-comparison + suggestions.
 *
 * Run: node --test tests/harness-auto-compare.test.mjs
 */
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const TEST_DIR = join(tmpdir(), `aing-auto-compare-test-${Date.now()}`);
const EVO_PATH = '../dist/scripts/harness/harness-evolution.js';

before(() => {
  mkdirSync(TEST_DIR, { recursive: true });
});

after(() => {
  rmSync(TEST_DIR, { recursive: true, force: true });
});

function makeConfig(agentCount = 2, pattern = 'pipeline') {
  return {
    projectDir: TEST_DIR,
    pattern,
    executionMode: 'agent-team',
    agents: Array.from({ length: agentCount }, (_, i) => ({
      name: `agent-${i}`,
      description: `Agent ${i}`,
      model: 'sonnet',
      subagentType: 'general-purpose',
      filePath: `/agents/agent-${i}.md`,
      role: [`role-${i}`, 'backup-role'],
      principles: [`principle-${i}`, 'backup-principle'],
      inputOutput: { input: 'stdin', output: 'stdout' },
      errorHandling: ['retry'],
      collaboration: ['share'],
      skills: ['test-skill'],
    })),
    skills: [],
    dataFlow: [],
  };
}

describe('autoCompare', () => {
  it('버전 1개만 있으면 insufficient-data', async () => {
    const { autoCompare, snapshotHarness } = await import(EVO_PATH);
    const feature = `single-${Date.now()}`;
    snapshotHarness(feature, makeConfig(), TEST_DIR);
    const result = autoCompare(feature, TEST_DIR);
    assert.equal(result.verdict, 'insufficient-data');
    assert.equal(result.comparison, null);
  });

  it('버전 0개면 insufficient-data', async () => {
    const { autoCompare } = await import(EVO_PATH);
    const result = autoCompare(`nonexistent-${Date.now()}`, TEST_DIR);
    assert.equal(result.verdict, 'insufficient-data');
  });

  it('2개 이상이면 comparison + verdict 반환', async () => {
    const { autoCompare, snapshotHarness, recordMetrics } = await import(EVO_PATH);
    const feature = `multi-${Date.now()}`;
    const id1 = snapshotHarness(feature, makeConfig(2), TEST_DIR);
    recordMetrics(feature, id1, { quality: 70, tokens: 1000, duration: 5000, iterations: 1, verdict: 'PASS' }, TEST_DIR);
    const id2 = snapshotHarness(feature, makeConfig(3), TEST_DIR);
    recordMetrics(feature, id2, { quality: 85, tokens: 1200, duration: 4000, iterations: 1, verdict: 'PASS' }, TEST_DIR);

    const result = autoCompare(feature, TEST_DIR);
    assert.ok(result.comparison !== null);
    assert.equal(result.verdict, 'improved');
  });

  it('regressed verdict when quality drops', async () => {
    const { autoCompare, snapshotHarness, recordMetrics } = await import(EVO_PATH);
    const feature = `regress-${Date.now()}`;
    const id1 = snapshotHarness(feature, makeConfig(3), TEST_DIR);
    recordMetrics(feature, id1, { quality: 90, tokens: 1000, duration: 3000, iterations: 1, verdict: 'PASS' }, TEST_DIR);
    const id2 = snapshotHarness(feature, makeConfig(2), TEST_DIR);
    recordMetrics(feature, id2, { quality: 60, tokens: 1500, duration: 6000, iterations: 2, verdict: 'FAIL' }, TEST_DIR);

    const result = autoCompare(feature, TEST_DIR);
    assert.ok(result.comparison !== null);
    assert.equal(result.verdict, 'regressed');
  });

  it('suggestions 배열이 포함된다', async () => {
    const { autoCompare, snapshotHarness, recordMetrics } = await import(EVO_PATH);
    const feature = `suggest-${Date.now()}`;
    const id1 = snapshotHarness(feature, makeConfig(2), TEST_DIR);
    recordMetrics(feature, id1, { quality: 80, tokens: 5000, duration: 3000, iterations: 1, verdict: 'PASS' }, TEST_DIR);
    const id2 = snapshotHarness(feature, makeConfig(2), TEST_DIR);
    recordMetrics(feature, id2, { quality: 50, tokens: 60000, duration: 10000, iterations: 3, verdict: 'FAIL' }, TEST_DIR);

    const result = autoCompare(feature, TEST_DIR);
    assert.ok(Array.isArray(result.suggestions));
    // Quality dropped significantly, should have suggestions
    assert.ok(result.suggestions.length > 0, 'Should have at least one suggestion for regressed quality');
  });
});
