export interface ChangedFile {
    path: string;
    status: 'added' | 'modified' | 'deleted' | 'renamed';
    additions: number;
    deletions: number;
}
export interface IncrementalScope {
    files: ChangedFile[];
    totalAdditions: number;
    totalDeletions: number;
    suggestedTiers: string[];
}
/**
 * Get changed files from git diff.
 * @param base - Base ref to compare against (default: HEAD~1)
 * @param cwd - Working directory
 */
export declare function getChangedFiles(base?: string, cwd?: string): ChangedFile[];
/**
 * Determine review scope from changed files.
 * Suggests review tiers based on file types and change patterns.
 */
export declare function determineScope(files: ChangedFile[]): IncrementalScope;
/**
 * Filter review to only changed files.
 */
export declare function filterToChangedPaths(allPaths: string[], changedFiles: ChangedFile[]): string[];
//# sourceMappingURL=incremental-review.d.ts.map