export interface BenchmarkResult {
    name: string;
    current: number;
    baseline: number;
    threshold: number;
    regression: boolean;
    delta: number;
}
export interface BenchmarkSuite {
    results: BenchmarkResult[];
    hasRegression: boolean;
    summary: string;
}
/**
 * Run benchmark comparison between current and baseline metrics.
 */
export declare function runBenchmark(current: Record<string, number>, baseline: Record<string, number>, threshold?: number): BenchmarkSuite;
/**
 * Load performance baseline from .aing/qa/perf-baseline.json.
 */
export declare function loadBaseline(projectDir: string): Record<string, number>;
/**
 * Save performance metrics as new baseline to .aing/qa/perf-baseline.json.
 */
export declare function saveBaseline(projectDir: string, metrics: Record<string, number>): void;
//# sourceMappingURL=perf-benchmark.d.ts.map