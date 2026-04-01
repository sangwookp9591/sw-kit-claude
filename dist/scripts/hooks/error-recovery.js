/**
 * aing Error Recovery — Tool error tracking and retry guidance.
 * Tracks repeated failures and forces alternative approaches after threshold.
 * @module scripts/hooks/error-recovery
 */
import { readState, writeState, deleteState } from '../core/state.js';
import { join } from 'node:path';
import { createLogger } from '../core/logger.js';
const log = createLogger('error-recovery');
// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const RETRY_THRESHOLD = 4; // After this many, suggest alternative approach
const FORCE_ALTERNATIVE = 6; // After this many, FORCE alternative approach
const ERROR_STALE_MS = 60_000; // Errors older than 60s are ignored
// ---------------------------------------------------------------------------
// Path
// ---------------------------------------------------------------------------
function errorPath(projectDir) {
    return join(projectDir, '.aing', 'state', 'error-recovery.json');
}
// ---------------------------------------------------------------------------
// Core Operations
// ---------------------------------------------------------------------------
/**
 * Normalize error message into a signature for dedup.
 */
function errorSignature(errorMsg) {
    return errorMsg
        .replace(/\d+/g, 'N') // normalize numbers
        .replace(/\/[\w.-]+/g, '/PATH') // normalize paths
        .slice(0, 200);
}
/**
 * Record a tool error. Returns retry guidance if threshold reached.
 */
export function recordToolError(projectDir, toolName, errorMsg) {
    const sig = errorSignature(errorMsg);
    const now = new Date();
    const stateResult = readState(errorPath(projectDir));
    const state = stateResult.ok
        ? stateResult.data
        : { errors: [], updatedAt: now.toISOString() };
    // Clean stale errors
    state.errors = state.errors.filter(e => {
        const age = now.getTime() - new Date(e.lastSeen).getTime();
        return age < ERROR_STALE_MS;
    });
    // Find or create entry
    let entry = state.errors.find(e => e.toolName === toolName && e.errorSignature === sig);
    if (!entry) {
        entry = {
            toolName,
            errorSignature: sig,
            count: 0,
            firstSeen: now.toISOString(),
            lastSeen: now.toISOString(),
        };
        state.errors.push(entry);
    }
    entry.count += 1;
    entry.lastSeen = now.toISOString();
    state.updatedAt = now.toISOString();
    writeState(errorPath(projectDir), state);
    // Generate guidance
    if (entry.count >= FORCE_ALTERNATIVE) {
        const guidance = [
            `[aing:error-recovery] FORCE ALTERNATIVE — ${toolName} 동일 에러 ${entry.count}회 반복`,
            `에러: ${errorMsg.slice(0, 100)}`,
            ``,
            `이 접근은 실패했습니다. 다음 중 하나를 선택하세요:`,
            `1. 완전히 다른 접근법 시도 (같은 도구/명령 사용 금지)`,
            `2. 문제를 더 작은 단위로 분해`,
            `3. /aing debug 로 전환하여 근본 원인 분석`,
        ].join('\n');
        log.info('Forcing alternative approach', { toolName, count: entry.count });
        return { guidance, forceAlternative: true };
    }
    if (entry.count >= RETRY_THRESHOLD) {
        const guidance = [
            `[aing:error-recovery] RETRY GUIDANCE — ${toolName} 에러 ${entry.count}회 반복`,
            `같은 방식을 반복하지 마세요. 다른 접근을 고려하세요.`,
        ].join('\n');
        log.info('Suggesting alternative', { toolName, count: entry.count });
        return { guidance, forceAlternative: false };
    }
    return { guidance: null, forceAlternative: false };
}
/**
 * Reset error tracking for a tool (after successful execution).
 */
export function clearToolErrors(projectDir, toolName) {
    const stateResult = readState(errorPath(projectDir));
    if (!stateResult.ok)
        return;
    const state = stateResult.data;
    state.errors = state.errors.filter(e => e.toolName !== toolName);
    state.updatedAt = new Date().toISOString();
    writeState(errorPath(projectDir), state);
}
/**
 * Clear all error tracking state.
 */
export function clearAllErrors(projectDir) {
    deleteState(errorPath(projectDir));
}
//# sourceMappingURL=error-recovery.js.map