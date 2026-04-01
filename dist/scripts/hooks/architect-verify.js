/**
 * aing Architect Verification — Enforces architect approval after team-verify.
 * Provides a second verification layer independent of Milla/Sam.
 * Uses state tracking to enforce verification completion.
 * @module scripts/hooks/architect-verify
 */
import { readState, writeState, deleteState } from '../core/state.js';
import { join } from 'node:path';
import { createLogger } from '../core/logger.js';
const log = createLogger('architect-verify');
// ---------------------------------------------------------------------------
// Path
// ---------------------------------------------------------------------------
function verifyPath(projectDir) {
    return join(projectDir, '.aing', 'state', 'architect-verify.json');
}
// ---------------------------------------------------------------------------
// Core Operations
// ---------------------------------------------------------------------------
const DEFAULT_MAX_ATTEMPTS = 3;
/**
 * Start architect verification. Called after team-verify PASS.
 */
export function startVerification(projectDir, feature, completionClaim, opts) {
    // Determine tier based on change scope
    const tier = opts?.tier ?? 'standard';
    const state = {
        pending: true,
        feature,
        completionClaim,
        verificationAttempts: 0,
        maxVerificationAttempts: DEFAULT_MAX_ATTEMPTS,
        requestedAt: new Date().toISOString(),
        tier,
    };
    const result = writeState(verifyPath(projectDir), state);
    if (!result.ok) {
        log.error('Failed to start verification', { error: result.error });
        throw new Error(result.error);
    }
    log.info('Architect verification started', { feature, tier });
    return state;
}
/**
 * Read current verification state. Returns null if not pending.
 */
export function getVerifyState(projectDir) {
    const result = readState(verifyPath(projectDir));
    if (!result.ok)
        return null;
    const state = result.data;
    if (!state.pending)
        return null;
    return state;
}
/**
 * Record architect approval. Clears verification state.
 */
export function recordApproval(projectDir) {
    const state = getVerifyState(projectDir);
    if (!state)
        return;
    writeState(verifyPath(projectDir), {
        ...state,
        pending: false,
        architectApproved: true,
        verificationAttempts: state.verificationAttempts + 1,
    });
    log.info('Architect approved', { feature: state.feature, attempts: state.verificationAttempts + 1 });
}
/**
 * Record architect rejection with feedback.
 * Returns true if more attempts remain, false if exhausted.
 */
export function recordRejection(projectDir, feedback) {
    const state = getVerifyState(projectDir);
    if (!state)
        return false;
    const attempts = state.verificationAttempts + 1;
    const exhausted = attempts >= state.maxVerificationAttempts;
    writeState(verifyPath(projectDir), {
        ...state,
        verificationAttempts: attempts,
        architectFeedback: feedback,
        architectApproved: false,
        pending: !exhausted, // clear pending if exhausted
    });
    log.info('Architect rejected', {
        feature: state.feature,
        attempts,
        exhausted,
        feedback: feedback.slice(0, 100),
    });
    return !exhausted;
}
/**
 * Clear verification state entirely.
 */
export function clearVerification(projectDir) {
    deleteState(verifyPath(projectDir));
    log.info('Architect verification cleared');
}
/**
 * Determine verification tier from file count and change type.
 */
export function determineTier(filesChanged, hasSecurityChanges) {
    if (filesChanged > 20 || hasSecurityChanges)
        return 'thorough';
    return 'standard';
}
/**
 * Generate the architect review prompt for the stop hook to inject.
 */
export function generateArchitectPrompt(state) {
    const lines = [
        `[aing:architect-verify] VERIFICATION PENDING (attempt ${state.verificationAttempts + 1}/${state.maxVerificationAttempts})`,
        `Feature: ${state.feature}`,
        `Tier: ${state.tier} (${state.tier === 'thorough' ? 'opus' : 'sonnet'})`,
        ``,
        `Claim: ${state.completionClaim}`,
        ``,
        `INSTRUCTIONS:`,
        `1. Spawn Klay (architect) to verify the completion claim against the codebase.`,
        `2. Klay must check: all acceptance criteria met, tests pass, no regressions.`,
        `3. If APPROVED: run markArchitectApproved() then proceed to completion.`,
        `4. If REJECTED: record feedback, fix issues, re-verify.`,
    ];
    if (state.architectFeedback) {
        lines.push(``, `PREVIOUS FEEDBACK (address this):`, state.architectFeedback);
    }
    return lines.join('\n');
}
//# sourceMappingURL=architect-verify.js.map