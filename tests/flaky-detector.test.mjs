/**
 * Tests for scripts/qa/flaky-detector.ts
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, existsSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// Import compiled JS
import { detectFlaky, saveFlakyReport } from '../dist/scripts/qa/flaky-detector.js';

describe('flaky-detector', () => {
  test('returns empty report for empty input', () => {
    const report = detectFlaky([]);
    assert.equal(report.flakyCount, 0);
    assert.equal(report.totalTests, 0);
    assert.deepEqual(report.results, []);
  });

  test('no flaky when all runs pass', () => {
    const runs = [
      [{ name: 'test-a', passed: true }],
      [{ name: 'test-a', passed: true }],
      [{ name: 'test-a', passed: true }],
    ];
    const report = detectFlaky(runs);
    assert.equal(report.flakyCount, 0);
    assert.equal(report.results[0].isFlaky, false);
    assert.equal(report.results[0].passRate, 1);
  });

  test('no flaky when all runs fail consistently', () => {
    const runs = [
      [{ name: 'test-a', passed: false }],
      [{ name: 'test-a', passed: false }],
    ];
    const report = detectFlaky(runs);
    assert.equal(report.flakyCount, 0);
    assert.equal(report.results[0].isFlaky, false);
    assert.equal(report.results[0].passRate, 0);
  });

  test('detects flaky test with mixed pass/fail', () => {
    const runs = [
      [{ name: 'test-flaky', passed: true }],
      [{ name: 'test-flaky', passed: false }],
      [{ name: 'test-flaky', passed: true }],
    ];
    const report = detectFlaky(runs);
    assert.equal(report.flakyCount, 1);
    assert.equal(report.results[0].isFlaky, true);
    assert.ok(Math.abs(report.results[0].passRate - 2 / 3) < 0.001);
  });

  test('correctly identifies mix of stable and flaky tests', () => {
    const runs = [
      [
        { name: 'stable', passed: true },
        { name: 'flaky', passed: true },
      ],
      [
        { name: 'stable', passed: true },
        { name: 'flaky', passed: false },
      ],
    ];
    const report = detectFlaky(runs);
    assert.equal(report.totalTests, 2);
    assert.equal(report.flakyCount, 1);

    const stable = report.results.find(r => r.testName === 'stable');
    const flaky = report.results.find(r => r.testName === 'flaky');
    assert.ok(stable);
    assert.ok(flaky);
    assert.equal(stable.isFlaky, false);
    assert.equal(flaky.isFlaky, true);
  });

  test('runs array is recorded per test', () => {
    const runs = [
      [{ name: 'test-a', passed: true }],
      [{ name: 'test-a', passed: false }],
    ];
    const report = detectFlaky(runs);
    assert.deepEqual(report.results[0].runs, [true, false]);
  });

  test('handles single run without marking flaky', () => {
    const runs = [
      [{ name: 'test-a', passed: false }],
    ];
    const report = detectFlaky(runs);
    assert.equal(report.results[0].isFlaky, false);
    assert.equal(report.results[0].passRate, 0);
  });

  test('saveFlakyReport writes json to correct path', () => {
    const dir = mkdtempSync(join(tmpdir(), 'flaky-test-'));
    try {
      const runs = [
        [{ name: 'test-x', passed: true }],
        [{ name: 'test-x', passed: false }],
      ];
      const report = detectFlaky(runs);
      saveFlakyReport(dir, report);

      const reportPath = join(dir, '.aing', 'qa', 'flaky-report.json');
      assert.ok(existsSync(reportPath), 'flaky-report.json should exist');

      const saved = JSON.parse(readFileSync(reportPath, 'utf-8'));
      assert.equal(saved.flakyCount, 1);
      assert.equal(saved.totalTests, 1);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test('totalTests equals number of unique test names', () => {
    const runs = [
      [
        { name: 'a', passed: true },
        { name: 'b', passed: true },
        { name: 'c', passed: false },
      ],
    ];
    const report = detectFlaky(runs);
    assert.equal(report.totalTests, 3);
  });
});
