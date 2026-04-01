/**
 * aing Performance Benchmark — Regression Detection via Threshold Comparison
 * @module scripts/qa/perf-benchmark
 */
import { readStateOrDefault, writeState } from '../core/state.js';
import { createLogger } from '../core/logger.js';
import { join } from 'node:path';
import { mkdirSync } from 'node:fs';

const log = createLogger('perf-benchmark');

const DEFAULT_THRESHOLD = 10; // 10% regression threshold

export interface BenchmarkResult {
  name: string;
  current: number;
  baseline: number;
  threshold: number;
  regression: boolean;
  delta: number; // (current - baseline) / baseline * 100
}

export interface BenchmarkSuite {
  results: BenchmarkResult[];
  hasRegression: boolean;
  summary: string;
}

/**
 * Run benchmark comparison between current and baseline metrics.
 */
export function runBenchmark(
  current: Record<string, number>,
  baseline: Record<string, number>,
  threshold: number = DEFAULT_THRESHOLD,
): BenchmarkSuite {
  const results: BenchmarkResult[] = [];

  for (const [name, currentVal] of Object.entries(current)) {
    const baselineVal = baseline[name];
    if (baselineVal === undefined) {
      log.info(`No baseline for metric "${name}", skipping.`);
      continue;
    }

    const delta = baselineVal === 0
      ? 0
      : ((currentVal - baselineVal) / baselineVal) * 100;

    const regression = delta > threshold;

    results.push({
      name,
      current: currentVal,
      baseline: baselineVal,
      threshold,
      regression,
      delta,
    });
  }

  const hasRegression = results.some(r => r.regression);
  const regressionCount = results.filter(r => r.regression).length;
  const summary = hasRegression
    ? `${regressionCount}/${results.length} metric(s) regressed (threshold: ${threshold}%)`
    : `All ${results.length} metric(s) within threshold (${threshold}%)`;

  log.info(summary);

  return { results, hasRegression, summary };
}

/**
 * Load performance baseline from .aing/qa/perf-baseline.json.
 */
export function loadBaseline(projectDir: string): Record<string, number> {
  const path = join(projectDir, '.aing', 'qa', 'perf-baseline.json');
  const data = readStateOrDefault(path, {}) as Record<string, number>;
  return data;
}

/**
 * Save performance metrics as new baseline to .aing/qa/perf-baseline.json.
 */
export function saveBaseline(projectDir: string, metrics: Record<string, number>): void {
  const path = join(projectDir, '.aing', 'qa', 'perf-baseline.json');
  mkdirSync(join(projectDir, '.aing', 'qa'), { recursive: true });
  writeState(path, metrics);
  log.info(`Perf baseline saved: ${Object.keys(metrics).length} metric(s)`);
}
