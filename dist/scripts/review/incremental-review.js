/**
 * aing Incremental Review Engine — Git-based changed file detection
 *
 * Filters review scope to only changed files for faster review cycles.
 *
 * @module scripts/review/incremental-review
 */
import { execSync } from 'node:child_process';
/**
 * Get list of changed files relative to baseBranch (default: HEAD~1).
 * Returns empty array on error (e.g., first commit or clean tree).
 */
export function getChangedFiles(projectDir, baseBranch = 'HEAD~1') {
    try {
        const output = execSync(`git diff --name-only ${baseBranch}`, {
            cwd: projectDir,
            encoding: 'utf-8',
            timeout: 10_000,
        });
        return output
            .split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0);
    }
    catch {
        return [];
    }
}
/**
 * Filter the full file list to only those that changed.
 * If no changed files found, falls back to full mode.
 */
export function filterReviewScope(allFiles, changedFiles) {
    if (changedFiles.length === 0) {
        return {
            changedFiles: [],
            reviewedFiles: allFiles,
            skippedFiles: [],
            mode: 'full',
        };
    }
    const changedSet = new Set(changedFiles);
    const reviewedFiles = [];
    const skippedFiles = [];
    for (const file of allFiles) {
        // Match by filename or partial path
        const isChanged = changedSet.has(file) ||
            [...changedSet].some(changed => file.endsWith(changed) || changed.endsWith(file));
        if (isChanged) {
            reviewedFiles.push(file);
        }
        else {
            skippedFiles.push(file);
        }
    }
    // If filtering resulted in empty review set, fallback to full
    if (reviewedFiles.length === 0) {
        return {
            changedFiles,
            reviewedFiles: allFiles,
            skippedFiles: [],
            mode: 'full',
        };
    }
    return {
        changedFiles,
        reviewedFiles,
        skippedFiles,
        mode: 'incremental',
    };
}
//# sourceMappingURL=incremental-review.js.map