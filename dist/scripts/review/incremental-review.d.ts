export interface IncrementalResult {
    changedFiles: string[];
    reviewedFiles: string[];
    skippedFiles: string[];
    mode: 'incremental' | 'full';
}
/**
 * Get list of changed files relative to baseBranch (default: HEAD~1).
 * Returns empty array on error (e.g., first commit or clean tree).
 */
export declare function getChangedFiles(projectDir: string, baseBranch?: string): string[];
/**
 * Filter the full file list to only those that changed.
 * If no changed files found, falls back to full mode.
 */
export declare function filterReviewScope(allFiles: string[], changedFiles: string[]): IncrementalResult;
//# sourceMappingURL=incremental-review.d.ts.map