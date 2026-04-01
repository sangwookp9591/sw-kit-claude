import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import {
  snapshotHarness,
  recordMetrics,
  suggestEvolution,
  getVersionList,
} from '../dist/scripts/harness/harness-evolution.js';

const TEST_DIR = join(import.meta.dirname, '.test-harness-evolution-tmp');

const BASE_CONFIG = {
  projectDir: TEST_DIR,
  agents: [
    {
      name: 'planner',
      description: 'Plans tasks',
      model: 'claude-sonnet',
      subagentType: 'Plan',
      filePath: 'agents/planner.md',
      role: ['Plan'],
      principles: ['Be concise'],
      inputOutput: { input: 'task', output: 'plan' },
      errorHandling: [],
      collaboration: [],
      skills: [],
    },
  ],
  skills: [],
  pattern: 'pipeline',
  executionMode: 'sub-agent',
  dataFlow: [],
};

describe('harness-evolution: suggestEvolution', () => {
  before(() => {
    mkdirSync(TEST_DIR, { recursive: true });
  });

  after(() => {
    rmSync(TEST_DIR, { recursive: true, force: true });
  });

  it('returns empty array when fewer than 2 versioned metrics exist', () => {
    const feature = 'test-feature-no-metrics';
    const suggestions = suggestEvolution(feature, TEST_DIR);
    assert.deepEqual(suggestions, []);
  });

  it('suggests rollback when quality drops', () => {
    const feature = 'test-feature-regression';

    const id1 = snapshotHarness(feature, BASE_CONFIG, TEST_DIR);
    recordMetrics(feature, id1, { quality: 80, tokens: 10000, duration: 3000, iterations: 1, verdict: 'PASS' }, TEST_DIR);

    const id2 = snapshotHarness(feature, BASE_CONFIG, TEST_DIR);
    recordMetrics(feature, id2, { quality: 60, tokens: 12000, duration: 4000, iterations: 2, verdict: 'FAIL' }, TEST_DIR);

    const suggestions = suggestEvolution(feature, TEST_DIR);
    assert.ok(suggestions.length > 0, 'should have at least one suggestion');

    const rollback = suggestions.find(s => s.suggestion.includes('롤백'));
    assert.ok(rollback, 'should suggest rollback on quality regression');
    assert.equal(rollback.area, 'agents');
    assert.ok(rollback.confidence > 0 && rollback.confidence <= 100);
    assert.ok(rollback.evidence.includes('quality'));
  });

  it('suggests keeping pattern when quality rises and tokens drop', () => {
    const feature = 'test-feature-improvement';

    const id1 = snapshotHarness(feature, BASE_CONFIG, TEST_DIR);
    recordMetrics(feature, id1, { quality: 70, tokens: 20000, duration: 5000, iterations: 1, verdict: 'PASS' }, TEST_DIR);

    const id2 = snapshotHarness(feature, BASE_CONFIG, TEST_DIR);
    recordMetrics(feature, id2, { quality: 85, tokens: 15000, duration: 4500, iterations: 1, verdict: 'PASS' }, TEST_DIR);

    const suggestions = suggestEvolution(feature, TEST_DIR);
    assert.ok(suggestions.length > 0, 'should have at least one suggestion');

    const keep = suggestions.find(s => s.suggestion.includes('유지'));
    assert.ok(keep, 'should suggest keeping pattern on improvement');
    assert.equal(keep.area, 'agents');
    assert.ok(keep.confidence >= 60);
  });

  it('suggestion confidence is within 0-100 range', () => {
    const feature = 'test-feature-confidence';

    const id1 = snapshotHarness(feature, BASE_CONFIG, TEST_DIR);
    recordMetrics(feature, id1, { quality: 50, tokens: 100000, duration: 2000, iterations: 1, verdict: 'PASS' }, TEST_DIR);

    const id2 = snapshotHarness(feature, BASE_CONFIG, TEST_DIR);
    recordMetrics(feature, id2, { quality: 10, tokens: 200000, duration: 10000, iterations: 3, verdict: 'FAIL' }, TEST_DIR);

    const suggestions = suggestEvolution(feature, TEST_DIR);
    for (const s of suggestions) {
      assert.ok(s.confidence >= 0, 'confidence must be >= 0');
      assert.ok(s.confidence <= 100, 'confidence must be <= 100');
    }
  });

  it('version list grows as snapshots are added', () => {
    const feature = 'test-feature-versions';

    snapshotHarness(feature, BASE_CONFIG, TEST_DIR);
    snapshotHarness(feature, BASE_CONFIG, TEST_DIR);
    snapshotHarness(feature, BASE_CONFIG, TEST_DIR);

    const versions = getVersionList(TEST_DIR, feature);
    assert.equal(versions.length, 3);
    assert.equal(versions[0].version, 1);
    assert.equal(versions[2].version, 3);
  });
});
