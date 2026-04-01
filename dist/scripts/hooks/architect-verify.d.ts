/**
 * aing Architect Verification — Enforces architect approval after team-verify.
 * Provides a second verification layer independent of Milla/Sam.
 * Uses state tracking to enforce verification completion.
 * @module scripts/hooks/architect-verify
 */
export interface ArchitectVerifyState {
    pending: boolean;
    feature: string;
    completionClaim: string;
    verificationAttempts: number;
    maxVerificationAttempts: number;
    architectFeedback?: string;
    architectApproved?: boolean;
    requestedAt: string;
    tier: 'standard' | 'thorough';
}
/**
 * Start architect verification. Called after team-verify PASS.
 */
export declare function startVerification(projectDir: string, feature: string, completionClaim: string, opts?: {
    tier?: 'standard' | 'thorough';
}): ArchitectVerifyState;
/**
 * Read current verification state. Returns null if not pending.
 */
export declare function getVerifyState(projectDir: string): ArchitectVerifyState | null;
/**
 * Record architect approval. Clears verification state.
 */
export declare function recordApproval(projectDir: string): void;
/**
 * Record architect rejection with feedback.
 * Returns true if more attempts remain, false if exhausted.
 */
export declare function recordRejection(projectDir: string, feedback: string): boolean;
/**
 * Clear verification state entirely.
 */
export declare function clearVerification(projectDir: string): void;
/**
 * Determine verification tier from file count and change type.
 */
export declare function determineTier(filesChanged: number, hasSecurityChanges: boolean): 'standard' | 'thorough';
/**
 * Generate the architect review prompt for the stop hook to inject.
 */
export declare function generateArchitectPrompt(state: ArchitectVerifyState): string;
//# sourceMappingURL=architect-verify.d.ts.map