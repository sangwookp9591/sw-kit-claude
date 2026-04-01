/**
 * aing Persistent Mode State Utility
 * Shared module for hooks to check/set persistent (ralph-like) execution state.
 * @module scripts/hooks/persistent-mode
 */
export interface PersistentModeState {
    active: boolean;
    mode: string;
    startedAt: string;
    reason: string;
    iteration?: number;
    maxIterations?: number;
    feature?: string;
    fixLoopCount?: number;
    reinforcementCount?: number;
    lastReinforcedAt?: string;
}
/**
 * Activate persistent mode. Subsequent stop hooks will inject advisory context.
 */
export declare function activatePersistentMode(projectDir: string, mode: string, reason: string): Promise<void>;
/**
 * Deactivate persistent mode. Preserves the last mode for audit.
 */
export declare function deactivatePersistentMode(projectDir: string): Promise<void>;
/**
 * Read current persistent mode state. Returns null if not set.
 */
export declare function getPersistentModeState(projectDir: string): Promise<PersistentModeState | null>;
/**
 * Increment iteration and extend maxIterations if soft cap reached.
 * Returns false if circuit breaker tripped (allow stop).
 */
export declare function incrementIteration(projectDir: string): Promise<boolean>;
/**
 * Record a reinforcement (stop hook blocking a stop attempt).
 * Returns false if circuit breaker tripped (too many reinforcements or time limit — allow stop).
 */
export declare function recordReinforcement(projectDir: string): Promise<boolean>;
/**
 * Update fix loop count in persistent mode state.
 */
export declare function updateFixLoop(projectDir: string, fixCount: number): Promise<void>;
//# sourceMappingURL=persistent-mode.d.ts.map