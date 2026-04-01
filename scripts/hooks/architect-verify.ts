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
// Types
// ---------------------------------------------------------------------------

export interface ArchitectVerifyState {
  pending: boolean;
  feature: string;
  completionClaim: string;
  verificationAttempts: number;
  maxVerificationAttempts: number;
  architectFeedback?: string;
  architectApproved?: boolean;
  requestedAt: string;
  tier: 'standard' | 'thorough';  // standard: sonnet, thorough: opus
}

// ---------------------------------------------------------------------------
// Path
// ---------------------------------------------------------------------------

function verifyPath(projectDir: string): string {
  return join(projectDir, '.aing', 'state', 'architect-verify.json');
}

// ---------------------------------------------------------------------------
// Core Operations
// ---------------------------------------------------------------------------

const DEFAULT_MAX_ATTEMPTS = 3;

/**
 * Start architect verification. Called after team-verify PASS.
 */
export function startVerification(
  projectDir: string,
  feature: string,
  completionClaim: string,
  opts?: { tier?: 'standard' | 'thorough' }
): ArchitectVerifyState {
  // Determine tier based on change scope
  const tier = opts?.tier ?? 'standard';

  const state: ArchitectVerifyState = {
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
export function getVerifyState(projectDir: string): ArchitectVerifyState | null {
  const result = readState(verifyPath(projectDir));
  if (!result.ok) return null;
  const state = result.data as ArchitectVerifyState;
  if (!state.pending) return null;
  return state;
}

/**
 * Record architect approval. Clears verification state.
 */
export function recordApproval(projectDir: string): void {
  const state = getVerifyState(projectDir);
  if (!state) return;

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
export function recordRejection(projectDir: string, feedback: string): boolean {
  const state = getVerifyState(projectDir);
  if (!state) return false;

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
export function clearVerification(projectDir: string): void {
  deleteState(verifyPath(projectDir));
  log.info('Architect verification cleared');
}

/**
 * Determine verification tier from file count and change type.
 */
export function determineTier(filesChanged: number, hasSecurityChanges: boolean): 'standard' | 'thorough' {
  if (filesChanged > 20 || hasSecurityChanges) return 'thorough';
  return 'standard';
}

/**
 * Generate the architect review prompt for the stop hook to inject.
 */
export function generateArchitectPrompt(state: ArchitectVerifyState): string {
  const lines: string[] = [
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
