/**
 * aing Incremental Review — Diff-based selective review
 * @module scripts/review/incremental-review
 */
import { execSync } from 'node:child_process';
import { createLogger } from '../core/logger.js';
const log = createLogger('incremental-review');
/**
 * Get changed files from git diff.
 * @param base - Base ref to compare against (default: HEAD~1)
 * @param cwd - Working directory
 */
export function getChangedFiles(base = 'HEAD~1', cwd) {
    const dir = cwd || process.cwd();
    try {
        const output = execSync(`git diff --numstat ${base}`, { cwd: dir, encoding: 'utf-8', timeout: 10000 });
        const statusOutput = execSync(`git diff --name-status ${base}`, { cwd: dir, encoding: 'utf-8', timeout: 10000 });
        const statusMap = new Map();
        for (const line of statusOutput.trim().split('\n').filter(Boolean)) {
            const parts = line.split('\t');
            if (parts.length >= 2) {
                const status = parts[0][0]; // First char: A/M/D/R
                const filePath = parts[parts.length - 1]; // Last part is the file path (handles renames)
                statusMap.set(filePath, status);
            }
        }
        const files = [];
        for (const line of output.trim().split('\n').filter(Boolean)) {
            const [add, del, path] = line.split('\t');
            if (!path)
                continue;
            const statusChar = statusMap.get(path) || 'M';
            const status = statusChar === 'A' ? 'added'
                : statusChar === 'D' ? 'deleted'
                    : statusChar === 'R' ? 'renamed'
                        : 'modified';
            files.push({
                path,
                status,
                additions: add === '-' ? 0 : parseInt(add),
                deletions: del === '-' ? 0 : parseInt(del),
            });
        }
        log.info(`Changed files: ${files.length}`, { base });
        return files;
    }
    catch (err) {
        log.warn('Failed to get git diff', { error: String(err) });
        return [];
    }
}
/**
 * Determine review scope from changed files.
 * Suggests review tiers based on file types and change patterns.
 */
export function determineScope(files) {
    const totalAdditions = files.reduce((sum, f) => sum + f.additions, 0);
    const totalDeletions = files.reduce((sum, f) => sum + f.deletions, 0);
    const suggestedTiers = ['eng-review']; // Always
    const hasUI = files.some(f => /\.(tsx|jsx|css|scss|svelte|vue)$/.test(f.path) ||
        f.path.includes('component') ||
        f.path.includes('ui/') ||
        f.path.includes('pages/'));
    const hasSecurity = files.some(f => f.path.includes('auth') ||
        f.path.includes('security') ||
        f.path.includes('middleware') ||
        f.path.includes('guard'));
    const hasProductChange = files.some(f => f.path.includes('README') ||
        f.path.includes('CHANGELOG') ||
        f.path.includes('package.json'));
    if (hasUI)
        suggestedTiers.push('design-review');
    if (hasSecurity)
        suggestedTiers.push('outside-voice');
    if (hasProductChange)
        suggestedTiers.push('ceo-review');
    // Large changes get more scrutiny
    if (totalAdditions + totalDeletions > 500) {
        if (!suggestedTiers.includes('outside-voice'))
            suggestedTiers.push('outside-voice');
    }
    return { files, totalAdditions, totalDeletions, suggestedTiers };
}
/**
 * Filter review to only changed files.
 */
export function filterToChangedPaths(allPaths, changedFiles) {
    const changedSet = new Set(changedFiles.map(f => f.path));
    return allPaths.filter(p => changedSet.has(p));
}
//# sourceMappingURL=incremental-review.js.map