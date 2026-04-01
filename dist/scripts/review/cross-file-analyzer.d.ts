export interface ImportEdge {
    source: string;
    target: string;
    specifiers: string[];
}
export interface CrossFileResult {
    imports: ImportEdge[];
    circularDeps: string[][];
    unusedExports: Array<{
        file: string;
        export: string;
    }>;
    depth: number;
}
/**
 * Detect circular dependencies in import graph.
 */
export declare function detectCircularDeps(imports: ImportEdge[]): string[][];
/**
 * Analyze import graph across given files.
 * BFS traversal up to maxDepth; visited set prevents infinite loops.
 */
export declare function analyzeImports(filePaths: string[], _projectDir: string, maxDepth?: number): CrossFileResult;
//# sourceMappingURL=cross-file-analyzer.d.ts.map