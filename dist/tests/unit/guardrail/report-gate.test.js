/**
 * Unit tests for scripts/guardrail/report-gate.ts
 * Covers: checkCompletionReport()
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { checkCompletionReport } from '../../../scripts/guardrail/report-gate.js';
let tmpDir;
beforeEach(() => {
    tmpDir = join(tmpdir(), `report-gate-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    mkdirSync(tmpDir, { recursive: true });
});
afterEach(() => {
    try {
        rmSync(tmpDir, { recursive: true, force: true });
    }
    catch { /* ignore */ }
});
/** Helper: create a task index with completed tasks */
function createTaskIndex(count) {
    const tasksDir = join(tmpDir, '.aing', 'tasks');
    mkdirSync(tasksDir, { recursive: true });
    const entries = Array.from({ length: count }, (_, i) => ({
        id: `task-${i}`,
        status: 'completed',
    }));
    writeFileSync(join(tasksDir, '_index.json'), JSON.stringify(entries));
}
/** Helper: create a report file with given content */
function createReport(content, filename) {
    const reportsDir = join(tmpDir, '.aing', 'reports');
    mkdirSync(reportsDir, { recursive: true });
    writeFileSync(join(reportsDir, filename ?? 'session-1000.md'), content);
}
const FULL_REPORT = `# Session Report

## Team
Agent team

## Agents
Agent roles

## Completeness
All done

## Evidence
Tests passed

## Verdict
ACHIEVED
`;
const PARTIAL_REPORT = `# Session Report

## Team
Agent team

## Agents
Agent roles
`;
describe('checkCompletionReport', () => {
    it('returns ok: true when no completed tasks (report not required)', () => {
        // No .aing/tasks directory at all -> countCompletedTasks returns 0
        const result = checkCompletionReport(tmpDir);
        expect(result.ok).toBe(true);
    });
    it('returns ok: false with templatePath when tasks completed but no report', () => {
        createTaskIndex(3);
        const result = checkCompletionReport(tmpDir);
        expect(result.ok).toBe(false);
        expect(result.templatePath).toBeDefined();
        expect(result.templatePath).toContain('.aing/reports/session-');
        expect(result.reason).toContain('완료된 태스크');
    });
    it('returns ok: true when tasks completed and report has all 5 sections', () => {
        createTaskIndex(2);
        createReport(FULL_REPORT);
        const result = checkCompletionReport(tmpDir);
        expect(result.ok).toBe(true);
    });
    it('returns ok: false when report exists but sections are incomplete', () => {
        createTaskIndex(1);
        createReport(PARTIAL_REPORT);
        const result = checkCompletionReport(tmpDir);
        expect(result.ok).toBe(false);
        expect(result.templatePath).toBeDefined();
    });
});
//# sourceMappingURL=report-gate.test.js.map