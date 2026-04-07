/**
 * aing Denial Learner v1.0.0
 * Analyzes denial JSONL logs to detect repeated violation patterns
 * and auto-escalate guardrail severity (warn → block).
 *
 * Domain boundary: operates on rule data (denial JSONL) only.
 * Observed data (project-memory) uses decay, not learning.
 *
 * @module scripts/guardrail/denial-learner
 */

import { createLogger } from '../core/logger.js';
import { readStateOrDefault, writeState } from '../core/state.js';
import { join } from 'node:path';
import { readFileSync, existsSync } from 'node:fs';

const log = createLogger('denial-learner');

/** Minimum repeat count to trigger auto-escalation */
const REPEAT_THRESHOLD = 5;
/** Analysis window in days */
const WINDOW_DAYS = 90;
/** Max denial entries to sample */
const MAX_SAMPLE = 1000;

interface DenialLogEntry {
  timestamp: string;
  toolName: string;
  ruleId: string;
  action: 'block' | 'warn';
  severity: string;
  message: string;
  input?: string;
}

interface EscalationEntry {
  ruleId: string;
  count: number;
  previousAction: 'warn';
  newAction: 'block';
  learnedAt: string;
  reason: string;
}

interface LearnerOutput {
  analyzedAt: string;
  windowDays: number;
  totalDenials: number;
  sampledDenials: number;
  escalations: EscalationEntry[];
  contextInjection: string[];
}

/**
 * Analyze denial logs and produce escalation recommendations.
 * Called from session-start hook.
 *
 * Auto-escalation rules:
 * - Only warn → block (never block → deny)
 * - Threshold: same ruleId 5+ times within 90 days
 * - Results saved to denial-learner-output.json for audit
 */
export function analyzeDenials(projectDir?: string): LearnerOutput {
  const dir = projectDir || process.cwd();
  const logPath = join(dir, '.aing', 'logs', 'denials.jsonl');
  const outputPath = join(dir, '.aing', 'state', 'denial-learner-output.json');

  const output: LearnerOutput = {
    analyzedAt: new Date().toISOString(),
    windowDays: WINDOW_DAYS,
    totalDenials: 0,
    sampledDenials: 0,
    escalations: [],
    contextInjection: [],
  };

  if (!existsSync(logPath)) {
    writeState(outputPath, output);
    return output;
  }

  // Parse JSONL within time window
  const cutoff = Date.now() - WINDOW_DAYS * 24 * 60 * 60 * 1000;
  const entries: DenialLogEntry[] = [];

  try {
    const raw = readFileSync(logPath, 'utf-8');
    const lines = raw.trim().split('\n');
    output.totalDenials = lines.length;

    // Sample from recent entries (tail of file)
    const recentLines = lines.slice(-MAX_SAMPLE);
    for (const line of recentLines) {
      if (!line.trim()) continue;
      try {
        const entry = JSON.parse(line) as DenialLogEntry;
        const ts = new Date(entry.timestamp).getTime();
        if (ts >= cutoff) {
          entries.push(entry);
        }
      } catch (_) { /* skip malformed lines */ }
    }
  } catch (err) {
    log.warn('Failed to read denial log', { error: String(err) });
    writeState(outputPath, output);
    return output;
  }

  output.sampledDenials = entries.length;

  // Count by ruleId (only warn-action entries are escalation candidates)
  const warnCounts = new Map<string, { count: number; message: string }>();
  for (const entry of entries) {
    if (entry.action !== 'warn') continue;
    const existing = warnCounts.get(entry.ruleId);
    if (existing) {
      existing.count++;
    } else {
      warnCounts.set(entry.ruleId, { count: 1, message: entry.message });
    }
  }

  // Detect repeated patterns exceeding threshold
  for (const [ruleId, data] of warnCounts) {
    if (data.count >= REPEAT_THRESHOLD) {
      output.escalations.push({
        ruleId,
        count: data.count,
        previousAction: 'warn',
        newAction: 'block',
        learnedAt: new Date().toISOString(),
        reason: `${data.count}x repeated in ${WINDOW_DAYS} days (threshold: ${REPEAT_THRESHOLD})`,
      });
    }
  }

  // Generate context injection lines for session-start
  if (output.escalations.length > 0) {
    output.contextInjection.push(
      `[Denial Learning] ${output.escalations.length} rule(s) auto-escalated (warn → block):`
    );
    for (const esc of output.escalations) {
      output.contextInjection.push(
        `  - ${esc.ruleId}: ${esc.count}x → escalated to block. ${esc.reason}`
      );
    }
  }

  // Save output for audit trail
  writeState(outputPath, output);

  if (output.escalations.length > 0) {
    log.info('Denial learning complete', {
      escalations: output.escalations.length,
      sampled: output.sampledDenials,
    });
  }

  return output;
}

/**
 * Get escalated rule overrides for guardrail-engine.
 * Returns a map of ruleId → 'block' for rules that should be escalated.
 */
export function getEscalatedRules(projectDir?: string): Map<string, 'block'> {
  const dir = projectDir || process.cwd();
  const outputPath = join(dir, '.aing', 'state', 'denial-learner-output.json');
  const overrides = new Map<string, 'block'>();

  const output = readStateOrDefault(outputPath, { escalations: [] }) as LearnerOutput;
  for (const esc of output.escalations || []) {
    overrides.set(esc.ruleId, 'block');
  }

  return overrides;
}
