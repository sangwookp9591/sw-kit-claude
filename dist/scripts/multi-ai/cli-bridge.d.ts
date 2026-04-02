interface AskOptions {
    timeout?: number;
}
interface AskResult {
    ok: boolean;
    response?: string;
    error?: string;
    source: string;
    timedOut?: boolean;
}
interface Bridge {
    name: string;
    command: string;
    isAvailable: () => boolean;
    ask: (prompt: string, opts?: AskOptions) => AskResult;
}
/**
 * Create a bridge for a CLI AI tool.
 */
export declare function createBridge(name: string, command: string): Bridge;
/** OpenAI Codex CLI bridge */
export declare const codex: Bridge;
/** Google Gemini CLI bridge */
export declare const gemini: Bridge;
/**
 * Codex integration tier — determines the best available Codex path.
 *
 * 'plugin'  — codex-plugin-cc installed as Claude Code plugin
 *             → structured JSON output, background jobs, review gate
 * 'cli'     — codex CLI on $PATH (used by cli-bridge)
 *             → raw text output via -p flag
 * 'none'    — no Codex integration available
 */
export type CodexTier = 'plugin' | 'cli' | 'none';
interface CodexDetectionResult {
    tier: CodexTier;
    hasPlugin: boolean;
    hasCli: boolean;
    pluginCommands: string[];
}
/**
 * Detect the best available Codex integration tier.
 * Checks for codex-plugin-cc first (structured output), then CLI fallback.
 */
export declare function detectCodexTier(): CodexDetectionResult;
/**
 * Reset cached detection (for testing or after plugin install).
 */
export declare function resetCodexDetection(): void;
/**
 * Build a delegation suggestion message when Codex is available.
 * Returns null if Codex is not available.
 */
export declare function buildCodexDelegationSuggestion(taskType: 'review' | 'adversarial-review' | 'rescue'): string | null;
/**
 * Return only the bridges whose CLI tool is actually installed.
 */
export declare function getAvailableBridges(): Bridge[];
/**
 * Build a terse, bug-focused review prompt from a diff.
 */
export declare function buildReviewPrompt(diff: string, instructions?: string): string;
export {};
//# sourceMappingURL=cli-bridge.d.ts.map