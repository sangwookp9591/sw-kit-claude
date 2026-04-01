/**
 * aing Harness Pattern Transfer — Cross-project pattern sharing
 * Export, import, and match harness patterns across projects.
 * @module scripts/harness/pattern-transfer
 */
import type { GalleryEntry } from './harness-types.js';
export interface TransferablePattern {
    id: string;
    source: string;
    pattern: GalleryEntry;
    applicability: number;
}
/**
 * Export all gallery patterns from a project as transferable patterns.
 * applicability defaults to 100 for patterns with a positive success record,
 * 70 otherwise.
 */
export declare function exportPatterns(projectDir: string): TransferablePattern[];
/**
 * Import a transferable pattern into the target project's gallery.
 * Returns true if successfully saved, false otherwise.
 */
export declare function importPattern(projectDir: string, transfer: TransferablePattern): boolean;
/**
 * Match a task description against a set of transferable patterns.
 * Returns patterns sorted by computed applicability (keyword overlap).
 */
export declare function matchPatterns(task: string, patterns: TransferablePattern[]): TransferablePattern[];
//# sourceMappingURL=pattern-transfer.d.ts.map