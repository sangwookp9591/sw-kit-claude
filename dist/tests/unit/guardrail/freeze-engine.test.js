/**
 * Unit tests for scripts/guardrail/freeze-engine.ts
 * Covers: setFreeze, setFreezeAllowList, clearFreeze, checkFreeze, getFreezeMode, formatFreezeStatus
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
const mockFiles = {};
vi.mock('node:fs', () => ({
    readFileSync: vi.fn((path) => {
        if (mockFiles[path] !== undefined)
            return mockFiles[path];
        throw new Error('ENOENT');
    }),
    writeFileSync: vi.fn((path, content) => {
        mockFiles[path] = content;
    }),
    existsSync: vi.fn((path) => mockFiles[path] !== undefined),
    unlinkSync: vi.fn((path) => { delete mockFiles[path]; }),
    mkdirSync: vi.fn(),
}));
vi.mock('../../../scripts/core/logger.js', () => ({
    createLogger: vi.fn(() => ({
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
    })),
}));
import { setFreeze, setFreezeAllowList, clearFreeze, checkFreeze, getFreezeDir, getFreezeMode, formatFreezeStatus, } from '../../../scripts/guardrail/freeze-engine.js';
const PROJECT = '/tmp/test-project';
beforeEach(() => {
    vi.clearAllMocks();
    // Clear all mock files
    for (const key of Object.keys(mockFiles))
        delete mockFiles[key];
});
// ---------------------------------------------------------------------------
// Single directory freeze (backward compatible)
// ---------------------------------------------------------------------------
describe('setFreeze — single directory', () => {
    it('sets freeze with trailing slash', () => {
        const result = setFreeze('/src', PROJECT);
        expect(result.ok).toBe(true);
        expect(result.freezeDir).toBe('/src/');
    });
    it('preserves existing trailing slash', () => {
        const result = setFreeze('/src/', PROJECT);
        expect(result.freezeDir).toBe('/src/');
    });
});
describe('getFreezeDir — backward compatible', () => {
    it('returns null when no freeze', () => {
        expect(getFreezeDir(PROJECT)).toBeNull();
    });
    it('returns directory when single freeze active', () => {
        setFreeze('/src', PROJECT);
        expect(getFreezeDir(PROJECT)).toBe('/src/');
    });
});
describe('checkFreeze — single directory', () => {
    it('allows all files when no freeze', () => {
        expect(checkFreeze('/any/path.ts', PROJECT).allowed).toBe(true);
    });
    it('allows files inside freeze directory', () => {
        setFreeze('/src', PROJECT);
        expect(checkFreeze('/src/index.ts', PROJECT).allowed).toBe(true);
    });
    it('blocks files outside freeze directory', () => {
        setFreeze('/src', PROJECT);
        const result = checkFreeze('/lib/util.ts', PROJECT);
        expect(result.allowed).toBe(false);
        expect(result.reason).toContain('outside freeze boundary');
    });
    it('blocks similar-prefix directories (trailing slash safety)', () => {
        setFreeze('/src', PROJECT);
        expect(checkFreeze('/src-old/file.ts', PROJECT).allowed).toBe(false);
    });
});
// ---------------------------------------------------------------------------
// AllowList freeze (new feature)
// ---------------------------------------------------------------------------
describe('setFreezeAllowList — multiple paths', () => {
    it('sets allowlist with multiple paths', () => {
        const result = setFreezeAllowList(['/src', '/tests'], PROJECT);
        expect(result.ok).toBe(true);
        expect(result.allowList).toEqual(['/src/', '/tests/']);
    });
    it('clears single-dir state when switching to allowlist', () => {
        setFreeze('/src', PROJECT);
        setFreezeAllowList(['/src', '/tests'], PROJECT);
        const { mode } = getFreezeMode(PROJECT);
        expect(mode).toBe('allowlist');
    });
});
describe('getFreezeMode', () => {
    it('returns off when nothing set', () => {
        const { mode, paths } = getFreezeMode(PROJECT);
        expect(mode).toBe('off');
        expect(paths).toEqual([]);
    });
    it('returns single mode for single freeze', () => {
        setFreeze('/src', PROJECT);
        const { mode, paths } = getFreezeMode(PROJECT);
        expect(mode).toBe('single');
        expect(paths).toEqual(['/src/']);
    });
    it('returns allowlist mode for allowlist freeze', () => {
        setFreezeAllowList(['/src', '/tests', '/scripts'], PROJECT);
        const { mode, paths } = getFreezeMode(PROJECT);
        expect(mode).toBe('allowlist');
        expect(paths).toEqual(['/src/', '/tests/', '/scripts/']);
    });
});
describe('checkFreeze — allowlist mode', () => {
    it('allows files in any listed path', () => {
        setFreezeAllowList(['/src', '/tests'], PROJECT);
        expect(checkFreeze('/src/index.ts', PROJECT).allowed).toBe(true);
        expect(checkFreeze('/tests/unit/foo.test.ts', PROJECT).allowed).toBe(true);
    });
    it('blocks files outside all listed paths', () => {
        setFreezeAllowList(['/src', '/tests'], PROJECT);
        const result = checkFreeze('/lib/util.ts', PROJECT);
        expect(result.allowed).toBe(false);
        expect(result.reason).toContain('outside allowed paths');
    });
    it('blocks similar-prefix paths in allowlist mode', () => {
        setFreezeAllowList(['/src'], PROJECT);
        expect(checkFreeze('/src-old/file.ts', PROJECT).allowed).toBe(false);
    });
});
// ---------------------------------------------------------------------------
// clearFreeze
// ---------------------------------------------------------------------------
describe('clearFreeze', () => {
    it('clears single freeze', () => {
        setFreeze('/src', PROJECT);
        clearFreeze(PROJECT);
        expect(getFreezeMode(PROJECT).mode).toBe('off');
    });
    it('clears allowlist freeze', () => {
        setFreezeAllowList(['/src', '/tests'], PROJECT);
        clearFreeze(PROJECT);
        expect(getFreezeMode(PROJECT).mode).toBe('off');
    });
    it('is safe to call when no freeze active', () => {
        expect(clearFreeze(PROJECT).ok).toBe(true);
    });
});
// ---------------------------------------------------------------------------
// formatFreezeStatus
// ---------------------------------------------------------------------------
describe('formatFreezeStatus', () => {
    it('shows OFF when no freeze', () => {
        expect(formatFreezeStatus(PROJECT)).toContain('OFF');
    });
    it('shows ON for single freeze', () => {
        setFreeze('/src', PROJECT);
        const status = formatFreezeStatus(PROJECT);
        expect(status).toContain('ON');
        expect(status).toContain('/src/');
    });
    it('shows ALLOWLIST for allowlist freeze', () => {
        setFreezeAllowList(['/src', '/tests'], PROJECT);
        const status = formatFreezeStatus(PROJECT);
        expect(status).toContain('ALLOWLIST');
        expect(status).toContain('/src/');
        expect(status).toContain('/tests/');
    });
});
//# sourceMappingURL=freeze-engine.test.js.map