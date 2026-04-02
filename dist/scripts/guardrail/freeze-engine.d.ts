interface FreezeResult {
    ok: boolean;
    freezeDir?: string;
    allowList?: string[];
}
interface FreezeCheckResult {
    allowed: boolean;
    reason?: string;
}
type FreezeMode = 'off' | 'single' | 'allowlist';
/**
 * Set freeze boundary (single directory — backward compatible).
 */
export declare function setFreeze(directory: string, projectDir?: string): FreezeResult;
/**
 * Set freeze with AllowList mode — multiple allowed paths.
 */
export declare function setFreezeAllowList(directories: string[], projectDir?: string): FreezeResult;
/**
 * Clear freeze boundary (both modes).
 */
export declare function clearFreeze(projectDir?: string): {
    ok: boolean;
};
/**
 * Get current freeze mode and directories.
 */
export declare function getFreezeMode(projectDir?: string): {
    mode: FreezeMode;
    paths: string[];
};
/**
 * Get current freeze directory (backward compatible — returns first path or null).
 */
export declare function getFreezeDir(projectDir?: string): string | null;
/**
 * Check if a file path is allowed under current freeze.
 */
export declare function checkFreeze(filePath: string, projectDir?: string): FreezeCheckResult;
/**
 * Format freeze status for display.
 */
export declare function formatFreezeStatus(projectDir?: string): string;
export {};
//# sourceMappingURL=freeze-engine.d.ts.map