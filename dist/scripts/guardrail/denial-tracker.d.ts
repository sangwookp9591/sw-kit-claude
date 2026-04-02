/**
 * aing Denial Tracker v1.0.0
 * Structured audit trail for guardrail denials.
 * Inspired by claw-code-main's PermissionDenial tracking pattern.
 * @module scripts/guardrail/denial-tracker
 */
export interface DenialEntry {
    timestamp: string;
    toolName: string;
    ruleId: string;
    action: 'block' | 'warn';
    severity: string;
    message: string;
    input?: string;
}
/**
 * Record a guardrail denial to both JSONL log and session state.
 */
export declare function recordDenial(entry: DenialEntry, projectDir?: string): void;
/**
 * Get session denial summary for stop hook output.
 */
export declare function getDenialSummary(projectDir?: string): string | null;
/**
 * Reset session denial state (called on session start).
 */
export declare function resetDenialState(projectDir?: string): void;
//# sourceMappingURL=denial-tracker.d.ts.map