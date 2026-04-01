/**
 * aing Error Recovery — Tool error tracking and retry guidance.
 * Tracks repeated failures and forces alternative approaches after threshold.
 * @module scripts/hooks/error-recovery
 */
export interface ErrorEntry {
    toolName: string;
    errorSignature: string;
    count: number;
    firstSeen: string;
    lastSeen: string;
}
export interface ErrorRecoveryState {
    errors: ErrorEntry[];
    updatedAt: string;
}
/**
 * Record a tool error. Returns retry guidance if threshold reached.
 */
export declare function recordToolError(projectDir: string, toolName: string, errorMsg: string): {
    guidance: string | null;
    forceAlternative: boolean;
};
/**
 * Reset error tracking for a tool (after successful execution).
 */
export declare function clearToolErrors(projectDir: string, toolName: string): void;
/**
 * Clear all error tracking state.
 */
export declare function clearAllErrors(projectDir: string): void;
//# sourceMappingURL=error-recovery.d.ts.map