/**
 * aing Denial Learner v1.0.0
 * Analyzes denial JSONL logs to detect repeated violation patterns
 * and auto-escalate guardrail severity (warn → block).
 *
 * Domain boundary: operates on rule data (denial JSONL) only.
 * Observed data (project-memory) uses decay, not learning.
 *
 * @module scripts/guardrail/denial-learner
 */
interface EscalationEntry {
    ruleId: string;
    count: number;
    previousAction: 'warn';
    newAction: 'block';
    learnedAt: string;
    reason: string;
}
interface LearnerOutput {
    analyzedAt: string;
    windowDays: number;
    totalDenials: number;
    sampledDenials: number;
    escalations: EscalationEntry[];
    contextInjection: string[];
}
/**
 * Analyze denial logs and produce escalation recommendations.
 * Called from session-start hook.
 *
 * Auto-escalation rules:
 * - Only warn → block (never block → deny)
 * - Threshold: same ruleId 5+ times within 90 days
 * - Results saved to denial-learner-output.json for audit
 */
export declare function analyzeDenials(projectDir?: string): LearnerOutput;
/**
 * Get escalated rule overrides for guardrail-engine.
 * Returns a map of ruleId → 'block' for rules that should be escalated.
 */
export declare function getEscalatedRules(projectDir?: string): Map<string, 'block'>;
export {};
//# sourceMappingURL=denial-learner.d.ts.map