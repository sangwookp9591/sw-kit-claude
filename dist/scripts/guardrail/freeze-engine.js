/**
 * aing Freeze Engine — Directory-Scoped Edit Restriction
 *
 * Supports two modes:
 *   1. Single directory freeze (legacy): restricts to one directory
 *   2. AllowList freeze: restricts to multiple allowed paths
 *
 * Uses trailing slash semantics: /src/ won't match /src-old/
 * Inspired by claw-code-main's FilesystemIsolationMode (Off/WorkspaceOnly/AllowList).
 *
 * @module scripts/guardrail/freeze-engine
 */
import { readFileSync, writeFileSync, existsSync, unlinkSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { createLogger } from '../core/logger.js';
const log = createLogger('freeze');
const STATE_FILE = 'freeze-dir.txt';
const ALLOWLIST_FILE = 'freeze-allowlist.json';
/**
 * Normalize a directory path to absolute with trailing slash.
 */
function normalizeDirPath(directory) {
    let p = resolve(directory);
    if (!p.endsWith('/'))
        p += '/';
    return p;
}
/**
 * Set freeze boundary (single directory — backward compatible).
 */
export function setFreeze(directory, projectDir) {
    const dir = projectDir || process.cwd();
    const stateDir = join(dir, '.aing', 'state');
    mkdirSync(stateDir, { recursive: true });
    const freezeDir = normalizeDirPath(directory);
    // Clear allowlist if switching to single mode
    const allowlistPath = join(stateDir, ALLOWLIST_FILE);
    if (existsSync(allowlistPath))
        unlinkSync(allowlistPath);
    writeFileSync(join(stateDir, STATE_FILE), freezeDir);
    log.info(`Freeze set: ${freezeDir}`);
    return { ok: true, freezeDir };
}
/**
 * Set freeze with AllowList mode — multiple allowed paths.
 */
export function setFreezeAllowList(directories, projectDir) {
    const dir = projectDir || process.cwd();
    const stateDir = join(dir, '.aing', 'state');
    mkdirSync(stateDir, { recursive: true });
    const allowList = directories.map(d => normalizeDirPath(d));
    // Clear single-dir state if switching to allowlist mode
    const singlePath = join(stateDir, STATE_FILE);
    if (existsSync(singlePath))
        unlinkSync(singlePath);
    writeFileSync(join(stateDir, ALLOWLIST_FILE), JSON.stringify(allowList));
    log.info(`Freeze allowlist set: ${allowList.join(', ')}`);
    return { ok: true, allowList };
}
/**
 * Clear freeze boundary (both modes).
 */
export function clearFreeze(projectDir) {
    const dir = projectDir || process.cwd();
    const stateDir = join(dir, '.aing', 'state');
    const singlePath = join(stateDir, STATE_FILE);
    if (existsSync(singlePath))
        unlinkSync(singlePath);
    const allowlistPath = join(stateDir, ALLOWLIST_FILE);
    if (existsSync(allowlistPath))
        unlinkSync(allowlistPath);
    log.info('Freeze cleared');
    return { ok: true };
}
/**
 * Get current freeze mode and directories.
 */
export function getFreezeMode(projectDir) {
    const dir = projectDir || process.cwd();
    const stateDir = join(dir, '.aing', 'state');
    // Check allowlist first (takes precedence)
    const allowlistPath = join(stateDir, ALLOWLIST_FILE);
    if (existsSync(allowlistPath)) {
        try {
            const paths = JSON.parse(readFileSync(allowlistPath, 'utf-8'));
            if (Array.isArray(paths) && paths.length > 0) {
                return { mode: 'allowlist', paths };
            }
        }
        catch { /* fall through */ }
    }
    // Check single directory
    const singlePath = join(stateDir, STATE_FILE);
    if (existsSync(singlePath)) {
        try {
            const freezeDir = readFileSync(singlePath, 'utf-8').trim();
            if (freezeDir)
                return { mode: 'single', paths: [freezeDir] };
        }
        catch { /* fall through */ }
    }
    return { mode: 'off', paths: [] };
}
/**
 * Get current freeze directory (backward compatible — returns first path or null).
 */
export function getFreezeDir(projectDir) {
    const { mode, paths } = getFreezeMode(projectDir);
    if (mode === 'off')
        return null;
    return paths[0] || null;
}
/**
 * Check if a file path is allowed under current freeze.
 */
export function checkFreeze(filePath, projectDir) {
    const { mode, paths } = getFreezeMode(projectDir);
    // No freeze active = everything allowed
    if (mode === 'off')
        return { allowed: true };
    const absolutePath = resolve(filePath);
    // Check against all allowed paths
    for (const allowedDir of paths) {
        if (absolutePath.startsWith(allowedDir) || absolutePath + '/' === allowedDir) {
            return { allowed: true };
        }
    }
    const pathList = paths.join(', ');
    return {
        allowed: false,
        reason: mode === 'single'
            ? `File ${absolutePath} is outside freeze boundary ${pathList}. Run /aing unfreeze to remove restriction.`
            : `File ${absolutePath} is outside allowed paths [${pathList}]. Run /aing unfreeze to remove restriction.`,
    };
}
/**
 * Format freeze status for display.
 */
export function formatFreezeStatus(projectDir) {
    const { mode, paths } = getFreezeMode(projectDir);
    if (mode === 'off') {
        return 'Freeze: OFF (all directories writable)';
    }
    if (mode === 'single') {
        return `Freeze: ON — edits restricted to ${paths[0]}\n  Edit/Write outside this directory will be blocked.\n  Run /aing unfreeze to remove.`;
    }
    const lines = [
        `Freeze: ALLOWLIST — edits restricted to ${paths.length} paths:`,
        ...paths.map(p => `  - ${p}`),
        '  Run /aing unfreeze to remove.',
    ];
    return lines.join('\n');
}
//# sourceMappingURL=freeze-engine.js.map