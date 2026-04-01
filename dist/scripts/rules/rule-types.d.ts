/**
 * aing Project Rules — Type Definitions
 * @module scripts/rules/rule-types
 */
export interface ProjectRule {
    id: string;
    type: 'file' | 'content' | 'naming';
    scope?: string;
    pattern: string;
    action: 'warn' | 'error';
    severity: 'critical' | 'high' | 'medium' | 'low';
    message: string;
    category?: string;
}
export interface RuleValidationResult {
    valid: boolean;
    errors: string[];
}
export interface RuleMatch {
    rule: ProjectRule;
    line: string;
    match: string;
}
//# sourceMappingURL=rule-types.d.ts.map