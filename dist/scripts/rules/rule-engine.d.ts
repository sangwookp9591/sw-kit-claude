/**
 * aing Project Rules — Rule Engine
 * Applies ProjectRule patterns against diff content.
 * @module scripts/rules/rule-engine
 */
import type { ProjectRule, RuleMatch } from './rule-types.js';
/**
 * Apply rules to diff content.
 * Each rule's pattern is matched against added lines in the diff.
 */
export declare function applyRules(rules: ProjectRule[], diff: string): RuleMatch[];
//# sourceMappingURL=rule-engine.d.ts.map