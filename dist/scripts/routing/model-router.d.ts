/**
 * aing Model Router — Adaptive model selection based on task complexity and risk.
 * Routes agents to optimal model tier (haiku/sonnet/opus) based on signals.
 * @module scripts/routing/model-router
 */
import { ComplexitySignals } from './complexity-scorer.js';
export type CostMode = 'quality' | 'balanced' | 'budget';
export type ModelTier = 'haiku' | 'sonnet' | 'opus';
export type ProviderKind = 'anthropic' | 'openai' | 'google' | 'xai';
/**
 * Provider metadata for model routing.
 * Inspired by claw-code-main's MODEL_REGISTRY pattern.
 */
export interface ProviderMeta {
    provider: ProviderKind;
    modelId: string;
    tier: ModelTier;
    maxTokens: number;
    pricing: {
        input: number;
        output: number;
    };
}
/**
 * Model registry — maps canonical names and aliases to provider metadata.
 * Single source of truth for model capabilities and costs.
 */
export declare const MODEL_REGISTRY: Record<string, ProviderMeta>;
/**
 * Resolve a model name (or alias) to its provider metadata.
 * Returns null if model is not in the registry.
 */
export declare function resolveModel(modelName: string): ProviderMeta | null;
/**
 * Get pricing info for a model tier.
 */
export declare function getTierPricing(tier: ModelTier): {
    input: number;
    output: number;
};
interface RoutingResult {
    model: string;
    reason: string;
    escalated: boolean;
}
interface RouteOptions {
    costMode?: CostMode;
    forceModel?: string;
    context?: string;
}
/**
 * Detect whether file paths include core/safety modules.
 * Used by orchestrators to auto-set hasCoreModule signal.
 */
export declare function detectCoreModule(filePaths: string[]): boolean;
/**
 * Route an agent to the optimal model tier.
 */
export declare function routeModel(agentName: string, signals?: ComplexitySignals, options?: RouteOptions): RoutingResult;
/**
 * Get cost mode from environment or default.
 */
export declare function getCostMode(): CostMode;
export {};
//# sourceMappingURL=model-router.d.ts.map