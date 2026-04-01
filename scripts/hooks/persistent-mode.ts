/**
 * aing Persistent Mode State Utility
 * Shared module for hooks to check/set persistent (ralph-like) execution state.
 * @module scripts/hooks/persistent-mode
 */

import { readState, writeState, updateState } from '../core/state.js';
import { join } from 'node:path';

export interface PersistentModeState {
  active: boolean;
  mode: string; // 'auto' | 'team' | 'pdca'
  startedAt: string;
  reason: string;
  iteration?: number;
  maxIterations?: number;
  feature?: string;
  fixLoopCount?: number;
  reinforcementCount?: number;
  lastReinforcedAt?: string;
}

function statePath(projectDir: string): string {
  return join(projectDir, '.aing', 'state', 'persistent-mode.json');
}

/**
 * Activate persistent mode. Subsequent stop hooks will inject advisory context.
 */
export async function activatePersistentMode(
  projectDir: string,
  mode: string,
  reason: string
): Promise<void> {
  const state: PersistentModeState = {
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
export async function deactivatePersistentMode(projectDir: string): Promise<void> {
  const existing = await getPersistentModeState(projectDir);
  const state: PersistentModeState = {
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
export async function getPersistentModeState(
  projectDir: string
): Promise<PersistentModeState | null> {
  const result = readState(statePath(projectDir));
  if (!result.ok) return null;
  return result.data as PersistentModeState;
}

// ---------------------------------------------------------------------------
// Unbounded Persistence (ralph-style soft cap)
// ---------------------------------------------------------------------------

const REINFORCEMENT_MAX = 8;
const REINFORCEMENT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_PERSISTENT_DURATION_MS = 30 * 60 * 1000; // 30 min hard time limit

/**
 * Increment iteration and extend maxIterations if soft cap reached.
 * Returns false if circuit breaker tripped (allow stop).
 */
export async function incrementIteration(projectDir: string): Promise<boolean> {
  const state = await getPersistentModeState(projectDir);
  if (!state?.active) return false;

  const result = updateState(
    statePath(projectDir),
    state,
    (data: unknown) => {
      const s = data as PersistentModeState;
      const iteration = (s.iteration ?? 0) + 1;
      let maxIterations = s.maxIterations ?? 10;
      if (iteration >= maxIterations) {
        maxIterations += 3;
      }
      return { ...s, iteration, maxIterations };
    }
  );
  return result.ok;
}

/**
 * Record a reinforcement (stop hook blocking a stop attempt).
 * Returns false if circuit breaker tripped (too many reinforcements or time limit — allow stop).
 */
export async function recordReinforcement(projectDir: string): Promise<boolean> {
  const state = await getPersistentModeState(projectDir);
  if (!state?.active) return false;

  const now = Date.now();

  // Time-based circuit breaker: hard limit on total persistent duration
  const startedAt = state.startedAt ? Date.parse(state.startedAt) : now;
  if (!isNaN(startedAt) && (now - startedAt) > MAX_PERSISTENT_DURATION_MS) {
    return false; // 30 min hard limit — allow stop
  }

  const lastTs = state.lastReinforcedAt ? Date.parse(state.lastReinforcedAt) : 0;
  const lastReinforced = isNaN(lastTs) ? now : lastTs;

  // Reset counter if outside window
  let count = (state.reinforcementCount ?? 0);
  if (now - lastReinforced > REINFORCEMENT_WINDOW_MS) {
    count = 0;
  }
  count += 1;

  // Count-based circuit breaker
  if (count > REINFORCEMENT_MAX) {
    return false; // caller should allow stop
  }

  // Use updateState to prevent race conditions
  const result = updateState(
    statePath(projectDir),
    state,
    (data: unknown) => ({
      ...(data as PersistentModeState),
      reinforcementCount: count,
      lastReinforcedAt: new Date().toISOString(),
    })
  );
  return result.ok;
}

/**
 * Update fix loop count in persistent mode state.
 */
export async function updateFixLoop(projectDir: string, fixCount: number): Promise<void> {
  const state = await getPersistentModeState(projectDir);
  if (!state?.active) return;

  writeState(statePath(projectDir), {
    ...state,
    fixLoopCount: fixCount,
  });
}
