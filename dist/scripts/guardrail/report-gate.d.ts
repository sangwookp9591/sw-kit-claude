/**
 * aing Report Gate (HOOK-4 — Hard Limit 5)
 *
 * Checks whether a completion report with all 5 required sections exists
 * for the current session. If missing, auto-generates a template.
 *
 * @module scripts/guardrail/report-gate
 */
export interface ReportCheckResult {
    ok: boolean;
    templatePath?: string;
    reason?: string;
}
/**
 * Check whether a completion report with all 5 required sections exists.
 *
 * Rules:
 * - Sessions with 0 completed tasks do not require a report (ok: true).
 * - If a valid report is found in .aing/reports/, ok: true.
 * - Otherwise, generate a template and return ok: false with templatePath.
 */
export declare function checkCompletionReport(projectDir?: string): ReportCheckResult;
//# sourceMappingURL=report-gate.d.ts.map