/**
 * Unit tests for scripts/guardrail/denial-learner.ts
 * Covers: analyzeDenials(), getEscalatedRules()
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
vi.mock('../../../scripts/core/state.js', () => ({
    readStateOrDefault: vi.fn(),
    writeState: vi.fn(),
}));
vi.mock('../../../scripts/core/logger.js', () => ({
    createLogger: vi.fn(() => ({
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
    })),
}));
vi.mock('node:fs', async () => {
    const actual = await vi.importActual('node:fs');
    return {
        ...actual,
        existsSync: vi.fn(),
        readFileSync: vi.fn(),
    };
});
import { analyzeDenials, getEscalatedRules } from '../../../scripts/guardrail/denial-learner.js';
import { readStateOrDefault, writeState } from '../../../scripts/core/state.js';
import { existsSync, readFileSync } from 'node:fs';
const mockExistsSync = vi.mocked(existsSync);
const mockReadFileSync = vi.mocked(readFileSync);
const mockReadState = vi.mocked(readStateOrDefault);
const mockWriteState = vi.mocked(writeState);
beforeEach(() => {
    vi.clearAllMocks();
});
/** Build a JSONL denial log line */
function denialLine(ruleId, action, timestamp) {
    return JSON.stringify({
        timestamp: timestamp ?? new Date().toISOString(),
        toolName: 'Bash',
        ruleId,
        action,
        severity: action === 'block' ? 'critical' : 'warning',
        message: `${ruleId} triggered`,
    });
}
describe('analyzeDenials', () => {
    it('returns empty escalations when denial log does not exist', () => {
        mockExistsSync.mockReturnValue(false);
        const result = analyzeDenials('/tmp/test');
        expect(result.escalations).toEqual([]);
        expect(result.totalDenials).toBe(0);
        expect(mockWriteState).toHaveBeenCalled();
    });
    it('returns empty escalations when same ruleId appears fewer than 5 times', () => {
        mockExistsSync.mockReturnValue(true);
        const lines = Array.from({ length: 4 }, () => denialLine('warn-rule-a', 'warn'));
        mockReadFileSync.mockReturnValue(lines.join('\n'));
        const result = analyzeDenials('/tmp/test');
        expect(result.escalations).toEqual([]);
        expect(result.sampledDenials).toBe(4);
    });
    it('creates an escalation when same ruleId has 5+ warn entries', () => {
        mockExistsSync.mockReturnValue(true);
        const lines = Array.from({ length: 6 }, () => denialLine('warn-rule-b', 'warn'));
        mockReadFileSync.mockReturnValue(lines.join('\n'));
        const result = analyzeDenials('/tmp/test');
        expect(result.escalations).toHaveLength(1);
        expect(result.escalations[0].ruleId).toBe('warn-rule-b');
        expect(result.escalations[0].count).toBe(6);
        expect(result.escalations[0].previousAction).toBe('warn');
        expect(result.escalations[0].newAction).toBe('block');
        expect(result.contextInjection.length).toBeGreaterThan(0);
    });
    it('does not escalate block-action denials (only warn is eligible)', () => {
        mockExistsSync.mockReturnValue(true);
        const lines = Array.from({ length: 10 }, () => denialLine('block-rule-c', 'block'));
        mockReadFileSync.mockReturnValue(lines.join('\n'));
        const result = analyzeDenials('/tmp/test');
        expect(result.escalations).toEqual([]);
    });
});
describe('getEscalatedRules', () => {
    it('returns Map<string, "block"> from saved learner output', () => {
        mockReadState.mockReturnValue({
            escalations: [
                { ruleId: 'warn-rule-x', count: 7, previousAction: 'warn', newAction: 'block', learnedAt: '', reason: '' },
                { ruleId: 'warn-rule-y', count: 5, previousAction: 'warn', newAction: 'block', learnedAt: '', reason: '' },
            ],
        });
        const overrides = getEscalatedRules('/tmp/test');
        expect(overrides).toBeInstanceOf(Map);
        expect(overrides.size).toBe(2);
        expect(overrides.get('warn-rule-x')).toBe('block');
        expect(overrides.get('warn-rule-y')).toBe('block');
    });
    it('returns empty map when no escalations exist', () => {
        mockReadState.mockReturnValue({ escalations: [] });
        const overrides = getEscalatedRules('/tmp/test');
        expect(overrides.size).toBe(0);
    });
});
//# sourceMappingURL=denial-learner.test.js.map