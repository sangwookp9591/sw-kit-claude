/**
 * aing Evidence Gate (Hard Limit 1 enforcement)
 * Checks whether minimum evidence exists before allowing task completion.
 * @module scripts/guardrail/evidence-gate
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
/**
 * Check whether at least one passing evidence entry exists.
 * Best-effort: returns ok:true on any filesystem/parse error (graceful fallback).
 */
export function hasMinimumEvidence(projectDir) {
    try {
        const dir = projectDir || process.cwd();
        const stateDir = join(dir, '.aing', 'state');
        if (!existsSync(stateDir)) {
            // No state directory at all — graceful fallback
            return { ok: true };
        }
        let files;
        try {
            files = readdirSync(stateDir).filter(f => f.startsWith('evidence-') && f.endsWith('.json'));
        }
        catch {
            // Cannot read directory — graceful fallback
            return { ok: true };
        }
        if (files.length === 0) {
            return { ok: false, reason: '증거 파일이 없습니다. npm test, tsc --noEmit 등을 실행하세요.' };
        }
        // Scan all evidence files for at least one passing entry
        let totalEntries = 0;
        let hasPass = false;
        for (const file of files) {
            try {
                const raw = readFileSync(join(stateDir, file), 'utf-8');
                const chain = JSON.parse(raw);
                const entries = chain.entries ?? [];
                totalEntries += entries.length;
                if (entries.some(e => e.result === 'pass')) {
                    hasPass = true;
                    break;
                }
            }
            catch {
                // Parse failure on individual file — skip, continue checking others
                continue;
            }
        }
        if (hasPass) {
            return { ok: true };
        }
        if (totalEntries === 0) {
            return { ok: false, reason: '증거 항목이 비어 있습니다. npm test, tsc --noEmit 등을 실행하세요.' };
        }
        return { ok: false, reason: '통과(pass)된 증거가 없습니다. 테스트/빌드를 성공적으로 실행하세요.' };
    }
    catch {
        // Top-level catch: any unexpected error — graceful fallback
        return { ok: true };
    }
}
//# sourceMappingURL=evidence-gate.js.map