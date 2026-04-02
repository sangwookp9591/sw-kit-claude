/**
 * aing Denial Tracker v1.0.0
 * Structured audit trail for guardrail denials.
 * Inspired by claw-code-main's PermissionDenial tracking pattern.
 * @module scripts/guardrail/denial-tracker
 */
import { readStateOrDefault, writeState } from '../core/state.js';
import { createLogger } from '../core/logger.js';
import { join } from 'node:path';
import { appendFileSync, mkdirSync } from 'node:fs';
const log = createLogger('denial-tracker');
const DEFAULT_STATE = {
    sessionDenials: 0,
    topRules: [],
    lastDenialAt: '',
};
/**
 * Record a guardrail denial to both JSONL log and session state.
 */
export function recordDenial(entry, projectDir) {
    const dir = projectDir || process.cwd();
    // Append to JSONL log (persistent across sessions)
    try {
        const logDir = join(dir, '.aing', 'logs');
        mkdirSync(logDir, { recursive: true });
        const logPath = join(logDir, 'denials.jsonl');
        appendFileSync(logPath, JSON.stringify(entry) + '\n');
    }
    catch (_) { /* best-effort */ }
    // Update session state (for compaction preservation + stop summary)
    try {
        const statePath = join(dir, '.aing', 'state', 'denial-audit.json');
        const state = readStateOrDefault(statePath, DEFAULT_STATE);
        state.sessionDenials += 1;
        state.lastDenialAt = entry.timestamp;
        // Update top rules (count per ruleId)
        const existing = state.topRules.find(r => r.ruleId === entry.ruleId);
        if (existing) {
            existing.count += 1;
        }
        else {
            state.topRules.push({ ruleId: entry.ruleId, count: 1 });
        }
        state.topRules.sort((a, b) => b.count - a.count);
        writeState(statePath, state);
    }
    catch (_) { /* best-effort */ }
    log.info('Denial recorded', {
        tool: entry.toolName,
        rule: entry.ruleId,
        action: entry.action,
        severity: entry.severity,
    });
}
/**
 * Get session denial summary for stop hook output.
 */
export function getDenialSummary(projectDir) {
    const dir = projectDir || process.cwd();
    const statePath = join(dir, '.aing', 'state', 'denial-audit.json');
    const state = readStateOrDefault(statePath, DEFAULT_STATE);
    if (state.sessionDenials === 0)
        return null;
    const lines = [
        `[aing:denial-audit] ${state.sessionDenials} guardrail denial(s) this session:`,
    ];
    for (const rule of state.topRules.slice(0, 5)) {
        lines.push(`  - ${rule.ruleId}: ${rule.count}x`);
    }
    lines.push(`  Log: .aing/logs/denials.jsonl`);
    return lines.join('\n');
}
/**
 * Reset session denial state (called on session start).
 */
export function resetDenialState(projectDir) {
    const dir = projectDir || process.cwd();
    const statePath = join(dir, '.aing', 'state', 'denial-audit.json');
    writeState(statePath, DEFAULT_STATE);
}
//# sourceMappingURL=denial-tracker.js.map