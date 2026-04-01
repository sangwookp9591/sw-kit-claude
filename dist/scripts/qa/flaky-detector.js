/**
 * aing Flaky Test Detector — Identifies tests with inconsistent pass/fail results
 * @module scripts/qa/flaky-detector
 */
import { writeState } from '../core/state.js';
import { createLogger } from '../core/logger.js';
import { join } from 'node:path';
import { mkdirSync } from 'node:fs';
const log = createLogger('flaky-detector');
/**
 * Detect flaky tests from multiple runs of the same tests.
 * @param testResults - Array of test run results, each run is an array of {name, passed}
 */
export function detectFlaky(testResults) {
    if (testResults.length === 0) {
        return { results: [], flakyCount: 0, totalTests: 0 };
    }
    // Aggregate runs per test name
    const runMap = new Map();
    for (const run of testResults) {
        for (const { name, passed } of run) {
            const existing = runMap.get(name);
            if (existing) {
                existing.push(passed);
            }
            else {
                runMap.set(name, [passed]);
            }
        }
    }
    const results = [];
    for (const [testName, runs] of runMap.entries()) {
        const passCount = runs.filter(r => r).length;
        const passRate = runs.length === 0 ? 0 : passCount / runs.length;
        const hasPass = runs.some(r => r);
        const hasFail = runs.some(r => !r);
        const isFlaky = hasPass && hasFail;
        results.push({ testName, runs, isFlaky, passRate });
    }
    const flakyCount = results.filter(r => r.isFlaky).length;
    log.info(`Flaky detection: ${flakyCount}/${results.length} tests flaky`);
    return { results, flakyCount, totalTests: results.length };
}
/**
 * Save flaky report to .aing/qa/flaky-report.json.
 */
export function saveFlakyReport(projectDir, report) {
    const path = join(projectDir, '.aing', 'qa', 'flaky-report.json');
    mkdirSync(join(projectDir, '.aing', 'qa'), { recursive: true });
    writeState(path, report);
    log.info(`Flaky report saved: ${report.flakyCount}/${report.totalTests} flaky`);
}
//# sourceMappingURL=flaky-detector.js.map