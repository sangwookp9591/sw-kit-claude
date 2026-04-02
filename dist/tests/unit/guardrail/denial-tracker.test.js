/**
 * Unit tests for scripts/guardrail/denial-tracker.ts
 * Covers: recordDenial, getDenialSummary, resetDenialState
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
vi.mock('node:fs', () => ({
    appendFileSync: vi.fn(),
    mkdirSync: vi.fn(),
}));
import { recordDenial, getDenialSummary, resetDenialState } from '../../../scripts/guardrail/denial-tracker.js';
import { readStateOrDefault, writeState } from '../../../scripts/core/state.js';
import { appendFileSync } from 'node:fs';
const mockReadState = vi.mocked(readStateOrDefault);
const mockWriteState = vi.mocked(writeState);
const mockAppendFile = vi.mocked(appendFileSync);
beforeEach(() => {
    vi.clearAllMocks();
});
const sampleDenial = {
    timestamp: '2026-04-02T00:00:00.000Z',
    toolName: 'Bash',
    ruleId: 'block-rm-rf',
    action: 'block',
    severity: 'critical',
    message: 'rm -rf blocked',
    input: 'rm -rf /',
};
describe('recordDenial', () => {
    it('appends JSONL entry to denials log', () => {
        mockReadState.mockReturnValue({ sessionDenials: 0, topRules: [], lastDenialAt: '' });
        recordDenial(sampleDenial, '/tmp/test-project');
        expect(mockAppendFile).toHaveBeenCalledOnce();
        const logContent = mockAppendFile.mock.calls[0][1];
        expect(logContent).toContain('"ruleId":"block-rm-rf"');
        expect(logContent.endsWith('\n')).toBe(true);
    });
    it('increments sessionDenials in state', () => {
        mockReadState.mockReturnValue({ sessionDenials: 2, topRules: [{ ruleId: 'block-rm-rf', count: 1 }], lastDenialAt: '' });
        recordDenial(sampleDenial, '/tmp/test-project');
        expect(mockWriteState).toHaveBeenCalled();
        const writtenState = mockWriteState.mock.calls[0][1];
        expect(writtenState.sessionDenials).toBe(3);
    });
    it('adds new ruleId to topRules if not present', () => {
        mockReadState.mockReturnValue({ sessionDenials: 0, topRules: [], lastDenialAt: '' });
        recordDenial(sampleDenial, '/tmp/test-project');
        const writtenState = mockWriteState.mock.calls[0][1];
        expect(writtenState.topRules).toEqual([{ ruleId: 'block-rm-rf', count: 1 }]);
    });
    it('increments count for existing ruleId', () => {
        mockReadState.mockReturnValue({ sessionDenials: 1, topRules: [{ ruleId: 'block-rm-rf', count: 3 }], lastDenialAt: '' });
        recordDenial(sampleDenial, '/tmp/test-project');
        const writtenState = mockWriteState.mock.calls[0][1];
        expect(writtenState.topRules[0].count).toBe(4);
    });
    it('sorts topRules by count descending', () => {
        mockReadState.mockReturnValue({
            sessionDenials: 5,
            topRules: [
                { ruleId: 'block-force-push', count: 1 },
                { ruleId: 'block-rm-rf', count: 4 },
            ],
            lastDenialAt: '',
        });
        recordDenial(sampleDenial, '/tmp/test-project');
        const writtenState = mockWriteState.mock.calls[0][1];
        expect(writtenState.topRules[0].ruleId).toBe('block-rm-rf');
        expect(writtenState.topRules[0].count).toBe(5);
    });
});
describe('getDenialSummary', () => {
    it('returns null when no denials', () => {
        mockReadState.mockReturnValue({ sessionDenials: 0, topRules: [], lastDenialAt: '' });
        expect(getDenialSummary('/tmp/test-project')).toBeNull();
    });
    it('returns formatted summary with denial count', () => {
        mockReadState.mockReturnValue({
            sessionDenials: 3,
            topRules: [{ ruleId: 'block-rm-rf', count: 2 }, { ruleId: 'protect-env', count: 1 }],
            lastDenialAt: '2026-04-02T00:00:00.000Z',
        });
        const summary = getDenialSummary('/tmp/test-project');
        expect(summary).toContain('3 guardrail denial(s)');
        expect(summary).toContain('block-rm-rf: 2x');
        expect(summary).toContain('protect-env: 1x');
        expect(summary).toContain('denials.jsonl');
    });
    it('limits topRules display to 5', () => {
        mockReadState.mockReturnValue({
            sessionDenials: 10,
            topRules: Array.from({ length: 8 }, (_, i) => ({ ruleId: `rule-${i}`, count: 8 - i })),
            lastDenialAt: '',
        });
        const summary = getDenialSummary('/tmp/test-project');
        const ruleLines = summary.split('\n').filter(l => l.includes('rule-'));
        expect(ruleLines.length).toBe(5);
    });
});
describe('resetDenialState', () => {
    it('writes default empty state', () => {
        resetDenialState('/tmp/test-project');
        expect(mockWriteState).toHaveBeenCalledOnce();
        const state = mockWriteState.mock.calls[0][1];
        expect(state.sessionDenials).toBe(0);
        expect(state.topRules).toEqual([]);
    });
});
//# sourceMappingURL=denial-tracker.test.js.map