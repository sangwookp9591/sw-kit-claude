import { type BenchmarkSuite } from './perf-benchmark.js';
import { type FlakyReport } from './flaky-detector.js';
export interface QAResult {
    healthScore: number;
    grade: string;
    cycles: number;
    findings: string[];
    allFixed: boolean;
    healthHistory?: HealthScoreEntry[];
    perfBenchmark?: BenchmarkSuite;
    flakyReport?: FlakyReport;
}
export interface QAOptions {
    feature: string;
    testCommand?: string;
    fixMode?: boolean;
    projectDir?: string;
    runPerf?: boolean;
    runFlaky?: boolean;
}
interface HealthScoreEntry {
    cycle: number;
    score: number;
    grade: string;
}
/**
 * Run a complete QA cycle.
 */
export declare function runQACycle(options: QAOptions): QAResult;
/**
 * Format QA result for display.
 */
export declare function formatQAResult(result: QAResult): string;
export {};
//# sourceMappingURL=qa-orchestrator.d.ts.map