/**
 * Tests for scripts/qa/perf-benchmark.ts
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// Import compiled JS
import { runBenchmark, loadBaseline, saveBaseline } from '../dist/scripts/qa/perf-benchmark.js';

describe('perf-benchmark', () => {
  test('no regression when all metrics within threshold', () => {
    const current = { ttfb: 100, lcp: 200 };
    const baseline = { ttfb: 100, lcp: 200 };
    const suite = runBenchmark(current, baseline, 10);

    assert.equal(suite.hasRegression, false);
    assert.equal(suite.results.length, 2);
    assert.ok(suite.summary.includes('within threshold'));
  });

  test('detects regression when metric exceeds threshold', () => {
    const current = { ttfb: 120 }; // 20% increase
    const baseline = { ttfb: 100 };
    const suite = runBenchmark(current, baseline, 10);

    assert.equal(suite.hasRegression, true);
    assert.equal(suite.results[0].regression, true);
    assert.ok(Math.abs(suite.results[0].delta - 20) < 0.001);
  });

  test('no regression when delta equals threshold exactly', () => {
    const current = { ttfb: 110 }; // exactly 10%
    const baseline = { ttfb: 100 };
    const suite = runBenchmark(current, baseline, 10);

    // delta === threshold → not a regression (threshold is exclusive)
    assert.equal(suite.results[0].regression, false);
  });

  test('regression when delta exceeds threshold', () => {
    const current = { ttfb: 111 }; // 11% > 10%
    const baseline = { ttfb: 100 };
    const suite = runBenchmark(current, baseline, 10);

    assert.equal(suite.results[0].regression, true);
  });

  test('skips metrics not in baseline', () => {
    const current = { ttfb: 100, newMetric: 50 };
    const baseline = { ttfb: 100 };
    const suite = runBenchmark(current, baseline, 10);

    // newMetric has no baseline — should be skipped
    assert.equal(suite.results.length, 1);
    assert.equal(suite.results[0].name, 'ttfb');
  });

  test('handles empty inputs', () => {
    const suite = runBenchmark({}, {}, 10);
    assert.equal(suite.results.length, 0);
    assert.equal(suite.hasRegression, false);
  });

  test('uses default threshold of 10 when not specified', () => {
    const current = { ttfb: 115 }; // 15% over
    const baseline = { ttfb: 100 };
    const suite = runBenchmark(current, baseline);

    assert.equal(suite.results[0].regression, true);
    assert.equal(suite.results[0].threshold, 10);
  });

  test('saveBaseline and loadBaseline round-trip', () => {
    const dir = mkdtempSync(join(tmpdir(), 'perf-test-'));
    try {
      const metrics = { ttfb: 100, lcp: 250, fcp: 150 };
      saveBaseline(dir, metrics);
      const loaded = loadBaseline(dir);

      assert.deepEqual(loaded, metrics);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test('loadBaseline returns empty object when no baseline file', () => {
    const dir = mkdtempSync(join(tmpdir(), 'perf-test-'));
    try {
      const loaded = loadBaseline(dir);
      assert.deepEqual(loaded, {});
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test('calculates correct delta values', () => {
    const current = { metric: 150 };
    const baseline = { metric: 100 };
    const suite = runBenchmark(current, baseline, 10);

    assert.equal(suite.results[0].delta, 50); // 50% increase
    assert.equal(suite.results[0].current, 150);
    assert.equal(suite.results[0].baseline, 100);
  });

  test('handles zero baseline without division by zero', () => {
    const current = { metric: 0 };
    const baseline = { metric: 0 };
    const suite = runBenchmark(current, baseline, 10);

    assert.equal(suite.results[0].delta, 0);
    assert.equal(suite.results[0].regression, false);
  });
});
