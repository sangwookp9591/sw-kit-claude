/**
 * Unit tests for MODEL_REGISTRY and provider resolution in model-router.ts
 */
import { describe, it, expect, vi } from 'vitest';
vi.mock('../../../scripts/routing/complexity-scorer.js', () => ({
    scoreComplexity: vi.fn(() => ({ score: 0, level: 'low' })),
}));
vi.mock('../../../scripts/core/config.js', () => ({
    loadConfig: vi.fn(() => ({})),
    getConfig: vi.fn((_, fallback) => fallback),
    resetConfigCache: vi.fn(),
}));
import { MODEL_REGISTRY, resolveModel, getTierPricing } from '../../../scripts/routing/model-router.js';
describe('MODEL_REGISTRY', () => {
    it('contains all three tiers', () => {
        expect(MODEL_REGISTRY['opus']).toBeDefined();
        expect(MODEL_REGISTRY['sonnet']).toBeDefined();
        expect(MODEL_REGISTRY['haiku']).toBeDefined();
    });
    it('contains full model IDs', () => {
        expect(MODEL_REGISTRY['claude-opus-4-6']).toBeDefined();
        expect(MODEL_REGISTRY['claude-sonnet-4-6']).toBeDefined();
        expect(MODEL_REGISTRY['claude-haiku-4-5']).toBeDefined();
    });
    it('aliases resolve to same provider', () => {
        expect(MODEL_REGISTRY['opus'].provider).toBe(MODEL_REGISTRY['claude-opus-4-6'].provider);
        expect(MODEL_REGISTRY['sonnet'].provider).toBe(MODEL_REGISTRY['claude-sonnet-4-6'].provider);
    });
    it('all entries have required fields', () => {
        for (const [name, meta] of Object.entries(MODEL_REGISTRY)) {
            expect(meta.provider, `${name} missing provider`).toBeDefined();
            expect(meta.modelId, `${name} missing modelId`).toBeTruthy();
            expect(meta.tier, `${name} missing tier`).toBeTruthy();
            expect(meta.maxTokens, `${name} missing maxTokens`).toBeGreaterThan(0);
            expect(meta.pricing.input, `${name} missing pricing.input`).toBeGreaterThan(0);
            expect(meta.pricing.output, `${name} missing pricing.output`).toBeGreaterThan(0);
        }
    });
    it('opus is most expensive', () => {
        expect(MODEL_REGISTRY['opus'].pricing.input).toBeGreaterThan(MODEL_REGISTRY['sonnet'].pricing.input);
        expect(MODEL_REGISTRY['sonnet'].pricing.input).toBeGreaterThan(MODEL_REGISTRY['haiku'].pricing.input);
    });
});
describe('resolveModel', () => {
    it('resolves alias to metadata', () => {
        const meta = resolveModel('opus');
        expect(meta).not.toBeNull();
        expect(meta.provider).toBe('anthropic');
        expect(meta.tier).toBe('opus');
    });
    it('resolves full model ID', () => {
        const meta = resolveModel('claude-sonnet-4-6');
        expect(meta).not.toBeNull();
        expect(meta.tier).toBe('sonnet');
    });
    it('returns null for unknown model', () => {
        expect(resolveModel('gpt-5')).toBeNull();
        expect(resolveModel('unknown-model')).toBeNull();
    });
});
describe('getTierPricing', () => {
    it('returns correct pricing for opus', () => {
        const pricing = getTierPricing('opus');
        expect(pricing.input).toBe(15);
        expect(pricing.output).toBe(75);
    });
    it('returns correct pricing for haiku', () => {
        const pricing = getTierPricing('haiku');
        expect(pricing.input).toBe(1);
        expect(pricing.output).toBe(5);
    });
    it('returns sonnet fallback for unknown tier', () => {
        // Cast to test fallback behavior
        const pricing = getTierPricing('unknown');
        expect(pricing.input).toBe(3);
        expect(pricing.output).toBe(15);
    });
});
//# sourceMappingURL=model-registry.test.js.map