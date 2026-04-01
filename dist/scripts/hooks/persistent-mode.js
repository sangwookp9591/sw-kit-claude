/**
 * aing Persistent Mode State Utility
 * Shared module for hooks to check/set persistent (ralph-like) execution state.
 * @module scripts/hooks/persistent-mode
 */
import { readState, writeState } from '../core/state.js';
import { join } from 'node:path';
function statePath(projectDir) {
    return join(projectDir, '.aing', 'state', 'persistent-mode.json');
}
/**
 * Activate persistent mode. Subsequent stop hooks will inject advisory context.
 */
export async function activatePersistentMode(projectDir, mode, reason) {
    const state = {
        active: true,
        mode,
        startedAt: new Date().toISOString(),
        reason,
    };
    const result = writeState(statePath(projectDir), state);
    if (!result.ok) {
        throw new Error(result.error);
    }
}
/**
 * Deactivate persistent mode. Preserves the last mode for audit.
 */
export async function deactivatePersistentMode(projectDir) {
    const existing = await getPersistentModeState(projectDir);
    const state = {
        active: false,
        mode: existing?.mode ?? 'auto',
        startedAt: existing?.startedAt ?? new Date().toISOString(),
        reason: existing?.reason ?? '',
    };
    const result = writeState(statePath(projectDir), state);
    if (!result.ok) {
        throw new Error(result.error);
    }
}
/**
 * Read current persistent mode state. Returns null if not set.
 */
export async function getPersistentModeState(projectDir) {
    const result = readState(statePath(projectDir));
    if (!result.ok)
        return null;
    return result.data;
}
// ---------------------------------------------------------------------------
// Unbounded Persistence (ralph-style soft cap)
// ---------------------------------------------------------------------------
const REINFORCEMENT_MAX = 20;
const REINFORCEMENT_WINDOW_MS = 5 * 60 * 1000; // 5 minutes
/**
 * Increment iteration and extend maxIterations if soft cap reached.
 * Returns false if circuit breaker tripped (allow stop).
 */
export async function incrementIteration(projectDir) {
    const state = await getPersistentModeState(projectDir);
    if (!state?.active)
        return false;
    const iteration = (state.iteration ?? 0) + 1;
    let maxIterations = state.maxIterations ?? 10;
    // Soft cap: extend by 3 instead of stopping
    if (iteration >= maxIterations) {
        maxIterations += 3;
    }
    const result = writeState(statePath(projectDir), {
        ...state,
        iteration,
        maxIterations,
    });
    return result.ok;
}
/**
 * Record a reinforcement (stop hook blocking a stop attempt).
 * Returns false if circuit breaker tripped (too many reinforcements — allow stop).
 */
export async function recordReinforcement(projectDir) {
    const state = await getPersistentModeState(projectDir);
    if (!state?.active)
        return false;
    const now = Date.now();
    const lastReinforced = state.lastReinforcedAt ? new Date(state.lastReinforcedAt).getTime() : 0;
    // Reset counter if outside window
    let count = (state.reinforcementCount ?? 0);
    if (now - lastReinforced > REINFORCEMENT_WINDOW_MS) {
        count = 0;
    }
    count += 1;
    // Circuit breaker: if too many reinforcements, allow stop (fail-safe)
    if (count > REINFORCEMENT_MAX) {
        return false; // caller should allow stop
    }
    const result = writeState(statePath(projectDir), {
        ...state,
        reinforcementCount: count,
        lastReinforcedAt: new Date().toISOString(),
    });
    return result.ok;
}
/**
 * Update fix loop count in persistent mode state.
 */
export async function updateFixLoop(projectDir, fixCount) {
    const state = await getPersistentModeState(projectDir);
    if (!state?.active)
        return;
    writeState(statePath(projectDir), {
        ...state,
        fixLoopCount: fixCount,
    });
}
//# sourceMappingURL=persistent-mode.js.map