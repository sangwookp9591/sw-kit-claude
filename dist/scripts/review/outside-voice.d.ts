export interface AdversarialPromptContext {
    planContent?: string;
    feature?: string;
    branch?: string;
}
export interface OutsideVoiceResult {
    status?: string;
    findings?: string[];
    source?: string;
}
/**
 * Build the adversarial review prompt for a subagent.
 */
export declare function buildAdversarialPrompt(context: AdversarialPromptContext): string;
/**
 * Record outside voice result.
 */
export declare function recordOutsideVoice(result: OutsideVoiceResult, projectDir?: string): void;
import { type CodexTier } from '../multi-ai/cli-bridge.js';
/**
 * Build a review plan that includes all available AI voters.
 * Claude is always included; Codex and Gemini are added when their CLIs are on $PATH.
 * When codex-plugin-cc is installed, the plan includes plugin command hints.
 */
export declare function buildMultiAIReviewPlan(context: AdversarialPromptContext): MultiAIReviewPlan;
/**
 * Extended review plan with Codex integration tier info.
 */
export interface MultiAIReviewPlan {
    available: string[];
    voterCount: number;
    prompt: string;
    codexTier?: CodexTier;
}
//# sourceMappingURL=outside-voice.d.ts.map