export interface FlakyResult {
    testName: string;
    runs: boolean[];
    isFlaky: boolean;
    passRate: number;
}
export interface FlakyReport {
    results: FlakyResult[];
    flakyCount: number;
    totalTests: number;
}
/**
 * Detect flaky tests from multiple runs of the same tests.
 * @param testResults - Array of test run results, each run is an array of {name, passed}
 */
export declare function detectFlaky(testResults: Array<{
    name: string;
    passed: boolean;
}>[]): FlakyReport;
/**
 * Save flaky report to .aing/qa/flaky-report.json.
 */
export declare function saveFlakyReport(projectDir: string, report: FlakyReport): void;
//# sourceMappingURL=flaky-detector.d.ts.map