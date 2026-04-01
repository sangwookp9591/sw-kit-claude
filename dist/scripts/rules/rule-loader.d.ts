/**
 * aing Project Rules — Rule Loader
 * Loads .aing/rules/*.json files and validates schema.
 * @module scripts/rules/rule-loader
 */
import type { ProjectRule, RuleValidationResult } from './rule-types.js';
export declare function validateRule(raw: unknown): RuleValidationResult;
export interface LoadResult {
    rules: ProjectRule[];
    errors: Array<{
        file: string;
        error: string;
    }>;
}
export declare function loadProjectRules(rulesDir: string): LoadResult;
//# sourceMappingURL=rule-loader.d.ts.map