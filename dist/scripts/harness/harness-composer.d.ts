/**
 * aing Harness Composer — Multi-harness pipeline composition
 * Chains multiple harnesses into sequential/parallel pipelines.
 * @module scripts/harness/harness-composer
 */
import type { ComposedPipeline } from './harness-types.js';
import type { TransferablePattern } from './pattern-transfer.js';
/**
 * Parse "research → design → build → qa" into stage names.
 */
export declare function parseCompositionString(input: string): string[];
export declare function composeHarnesses(stageNames: string[]): ComposedPipeline;
/**
 * Automatically compose a pipeline from a task description.
 * If matching patterns are provided, uses the best match's agent list as stage names.
 * Falls back to the default 4-stage pipeline.
 */
export declare function autoCompose(task: string, _projectDir: string, patterns?: TransferablePattern[]): ComposedPipeline;
export declare function validateComposition(pipeline: ComposedPipeline): string[];
export interface ExecutionPlan {
    waves: string[][];
    totalStages: number;
    estimatedAgents: number;
}
export declare function buildExecutionPlan(pipeline: ComposedPipeline): ExecutionPlan;
export declare function formatComposition(pipeline: ComposedPipeline): string;
//# sourceMappingURL=harness-composer.d.ts.map