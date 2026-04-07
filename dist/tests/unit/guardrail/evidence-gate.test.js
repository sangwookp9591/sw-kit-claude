/**
 * Unit tests for scripts/guardrail/evidence-gate.ts
 * Covers: hasMinimumEvidence()
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { hasMinimumEvidence } from '../../../scripts/guardrail/evidence-gate.js';
let tmpDir;
beforeEach(() => {
    tmpDir = join(tmpdir(), `evidence-gate-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    mkdirSync(tmpDir, { recursive: true });
});
afterEach(() => {
    try {
        rmSync(tmpDir, { recursive: true, force: true });
    }
    catch { /* ignore */ }
});
describe('hasMinimumEvidence', () => {
    it('returns ok: true when no .aing/state directory exists (graceful fallback)', () => {
        const result = hasMinimumEvidence(tmpDir);
        expect(result.ok).toBe(true);
    });
    it('returns ok: false when evidence files exist but no pass entries', () => {
        const stateDir = join(tmpDir, '.aing', 'state');
        mkdirSync(stateDir, { recursive: true });
        writeFileSync(join(stateDir, 'evidence-test.json'), JSON.stringify({ entries: [{ result: 'fail' }, { result: 'error' }] }));
        const result = hasMinimumEvidence(tmpDir);
        expect(result.ok).toBe(false);
        expect(result.reason).toContain('통과(pass)된 증거가 없습니다');
    });
    it('returns ok: true when at least one pass entry exists', () => {
        const stateDir = join(tmpDir, '.aing', 'state');
        mkdirSync(stateDir, { recursive: true });
        writeFileSync(join(stateDir, 'evidence-build.json'), JSON.stringify({ entries: [{ result: 'fail' }, { result: 'pass' }] }));
        const result = hasMinimumEvidence(tmpDir);
        expect(result.ok).toBe(true);
    });
    it('returns ok: false when evidence file JSON is invalid (entries empty after parse skip)', () => {
        const stateDir = join(tmpDir, '.aing', 'state');
        mkdirSync(stateDir, { recursive: true });
        writeFileSync(join(stateDir, 'evidence-corrupt.json'), '{not valid json!!!');
        const result = hasMinimumEvidence(tmpDir);
        // Parse failure -> continue in loop -> totalEntries=0 -> ok:false
        expect(result.ok).toBe(false);
        expect(result.reason).toContain('증거 항목이 비어 있습니다');
    });
    it('returns ok: false when state dir exists but contains no evidence files', () => {
        const stateDir = join(tmpDir, '.aing', 'state');
        mkdirSync(stateDir, { recursive: true });
        writeFileSync(join(stateDir, 'other-file.json'), '{}');
        const result = hasMinimumEvidence(tmpDir);
        expect(result.ok).toBe(false);
        expect(result.reason).toContain('증거 파일이 없습니다');
    });
});
//# sourceMappingURL=evidence-gate.test.js.map