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
/**
 * Run benchmark comparison between current and baseline metrics.
 */
export function runBenchmark(current, baseline, threshold = DEFAULT_THRESHOLD) {
    const results = [];
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
export function loadBaseline(projectDir) {
    const path = join(projectDir, '.aing', 'qa', 'perf-baseline.json');
    const data = readStateOrDefault(path, {});
    return data;
}
/**
 * Save performance metrics as new baseline to .aing/qa/perf-baseline.json.
 */
export function saveBaseline(projectDir, metrics) {
    const path = join(projectDir, '.aing', 'qa', 'perf-baseline.json');
    mkdirSync(join(projectDir, '.aing', 'qa'), { recursive: true });
    writeState(path, metrics);
    log.info(`Perf baseline saved: ${Object.keys(metrics).length} metric(s)`);
}
//# sourceMappingURL=perf-benchmark.js.map