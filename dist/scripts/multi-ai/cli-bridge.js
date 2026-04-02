/**
 * aing CLI Bridge Factory — Unified interface for external AI CLI tools.
 * Creates bridges for any CLI AI tool (Codex, Gemini, etc.)
 * that exposes a `-p` prompt flag.
 * @module scripts/multi-ai/cli-bridge
 */
import { execFileSync } from 'node:child_process';
import { createLogger } from '../core/logger.js';
const log = createLogger('cli-bridge');
/**
 * Maximum response buffer size (10 MB).
 * CLI tools can be chatty; this prevents OOM on runaway output.
 */
const MAX_BUFFER = 10 * 1024 * 1024;
/**
 * Default timeout for CLI calls (2 minutes).
 */
const DEFAULT_TIMEOUT = 120_000;
/**
 * Maximum diff length passed into review prompts (50 KB).
 * Keeps token usage bounded regardless of diff size.
 */
const MAX_DIFF_LENGTH = 50_000;
// ── Factory ────────────────────────────────────────────────────────────
/**
 * Create a bridge for a CLI AI tool.
 */
export function createBridge(name, command) {
    /**
     * Check whether the CLI tool is installed and on $PATH.
     */
    function isAvailable() {
        try {
            execFileSync('which', [command], { stdio: 'pipe' });
            return true;
        }
        catch {
            return false;
        }
    }
    /**
     * Send a prompt to the CLI tool and return the response.
     */
    function ask(prompt, opts = {}) {
        const timeout = opts.timeout || DEFAULT_TIMEOUT;
        try {
            const result = execFileSync(command, ['-p', prompt], {
                encoding: 'utf-8',
                timeout,
                maxBuffer: MAX_BUFFER,
                stdio: ['pipe', 'pipe', 'pipe'],
            });
            log.info(`${name} responded (${result.length} chars)`);
            return { ok: true, response: result.trim(), source: name };
        }
        catch (err) {
            const error = err;
            const isTimeout = !!error.killed;
            const reason = isTimeout ? 'timeout' : error.message;
            log.warn(`${name} call failed: ${reason}`);
            return {
                ok: false,
                error: reason,
                source: name,
                timedOut: isTimeout,
            };
        }
    }
    return { name, command, isAvailable, ask };
}
// ── Pre-built bridges ──────────────────────────────────────────────────
/** OpenAI Codex CLI bridge */
export const codex = createBridge('codex', 'codex');
/** Google Gemini CLI bridge */
export const gemini = createBridge('gemini', 'gemini');
// Cache detection result for the session (avoids repeated filesystem checks)
let _cachedDetection = null;
/**
 * Detect the best available Codex integration tier.
 * Checks for codex-plugin-cc first (structured output), then CLI fallback.
 */
export function detectCodexTier() {
    if (_cachedDetection)
        return _cachedDetection;
    const hasCli = codex.isAvailable();
    let hasPlugin = false;
    // Check for codex-plugin-cc by probing its companion script
    try {
        execFileSync('which', ['codex'], { stdio: 'pipe' });
        // Plugin detection: check if codex-companion.mjs is accessible
        // The plugin registers /codex:review, /codex:adversarial-review, /codex:rescue
        const pluginMarkers = [
            `${process.env.HOME}/.claude/plugins/codex`,
            `${process.env.HOME}/.claude/plugins/codex-plugin-cc`,
        ];
        for (const marker of pluginMarkers) {
            try {
                execFileSync('test', ['-d', marker], { stdio: 'pipe' });
                hasPlugin = true;
                break;
            }
            catch { /* not found, try next */ }
        }
    }
    catch { /* codex not installed at all */ }
    const tier = hasPlugin ? 'plugin' : hasCli ? 'cli' : 'none';
    const pluginCommands = hasPlugin
        ? ['/codex:review', '/codex:adversarial-review', '/codex:rescue']
        : [];
    _cachedDetection = { tier, hasPlugin, hasCli, pluginCommands };
    log.info(`Codex detection: tier=${tier}`, { hasPlugin, hasCli });
    return _cachedDetection;
}
/**
 * Reset cached detection (for testing or after plugin install).
 */
export function resetCodexDetection() {
    _cachedDetection = null;
}
/**
 * Build a delegation suggestion message when Codex is available.
 * Returns null if Codex is not available.
 */
export function buildCodexDelegationSuggestion(taskType) {
    const detection = detectCodexTier();
    if (detection.tier === 'none')
        return null;
    if (detection.tier === 'plugin') {
        const commandMap = {
            'review': '/codex:review',
            'adversarial-review': '/codex:adversarial-review',
            'rescue': '/codex:rescue',
        };
        const cmd = commandMap[taskType] || '/codex:review';
        return `[aing:codex-delegation] Codex plugin이 감지되었습니다. ${cmd} 명령으로 Codex에 위임할 수 있습니다.`;
    }
    // CLI tier — use cli-bridge
    return `[aing:codex-delegation] Codex CLI가 감지되었습니다. 리뷰를 Codex에 위임하면 독립적인 second opinion을 받을 수 있습니다.`;
}
// ── Utilities ──────────────────────────────────────────────────────────
/**
 * Return only the bridges whose CLI tool is actually installed.
 */
export function getAvailableBridges() {
    const bridges = [codex, gemini];
    return bridges.filter(b => b.isAvailable());
}
/**
 * Build a terse, bug-focused review prompt from a diff.
 */
export function buildReviewPrompt(diff, instructions) {
    return `Review this code diff. Be direct and terse. Focus on bugs, security, and logic errors.
${instructions ? `Instructions: ${instructions}\n` : ''}
DIFF:
${diff.slice(0, MAX_DIFF_LENGTH)}`;
}
//# sourceMappingURL=cli-bridge.js.map