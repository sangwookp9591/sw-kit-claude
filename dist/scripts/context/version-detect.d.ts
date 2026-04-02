/**
 * aing Version Detect v2.0.0
 * Detects project tech stack versions from all dependency files.
 * Caches to .aing/state/tech-stack.json with git-based invalidation.
 * @module scripts/context/version-detect
 */
export interface TechStackVersion {
    name: string;
    version: string;
    major: number;
    ecosystem: 'node' | 'python' | 'java' | 'go' | 'rust' | 'ruby' | 'dart' | 'swift' | 'dotnet' | 'php';
}
export interface TechStackCache {
    detectedAt: string;
    versions: TechStackVersion[];
    summary: string;
    depFileCommits: Record<string, string>;
}
export interface DetectedStack {
    versions: TechStackVersion[];
    summary: string;
    fromCache: boolean;
}
export declare function detectVersions(projectDir: string): DetectedStack;
export declare function detectVersionsCached(projectDir: string): DetectedStack;
export declare function generateVersionContext(projectDir: string): string;
//# sourceMappingURL=version-detect.d.ts.map