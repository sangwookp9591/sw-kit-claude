/**
 * aing Evidence Gate (Hard Limit 1 enforcement)
 * Checks whether minimum evidence exists before allowing task completion.
 * @module scripts/guardrail/evidence-gate
 */
interface EvidenceGateResult {
    ok: boolean;
    reason?: string;
}
/**
 * Check whether at least one passing evidence entry exists.
 * Best-effort: returns ok:true on any filesystem/parse error (graceful fallback).
 */
export declare function hasMinimumEvidence(projectDir?: string): EvidenceGateResult;
export {};
//# sourceMappingURL=evidence-gate.d.ts.map