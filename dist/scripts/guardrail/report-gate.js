/**
 * aing Report Gate (HOOK-4 — Hard Limit 5)
 *
 * Checks whether a completion report with all 5 required sections exists
 * for the current session. If missing, auto-generates a template.
 *
 * @module scripts/guardrail/report-gate
 */
import { existsSync, readdirSync, readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
const REQUIRED_SECTIONS = ['## Team', '## Agents', '## Completeness', '## Evidence', '## Verdict'];
const REPORT_TEMPLATE = `# Session Report

## Team
(사용된 에이전트 팀 구성)

## Agents
(각 에이전트의 역할과 기여)

## Completeness
(완료된 작업 항목)

## Evidence
(테스트/빌드/린트 실행 결과)

## Verdict
ACHIEVED / INCOMPLETE / FAILED
`;
/**
 * Count completed tasks in the aing task index.
 * Returns 0 if the index cannot be read.
 */
function countCompletedTasks(projectDir) {
    try {
        const indexPath = join(projectDir, '.aing', 'tasks', '_index.json');
        if (!existsSync(indexPath))
            return 0;
        const raw = readFileSync(indexPath, 'utf-8');
        const entries = JSON.parse(raw);
        return entries.filter((e) => e.status === 'completed' || e.status === 'done').length;
    }
    catch {
        return 0;
    }
}
/**
 * Check whether an existing report file contains all required sections.
 */
function hasAllSections(filePath) {
    try {
        const content = readFileSync(filePath, 'utf-8');
        return REQUIRED_SECTIONS.every((section) => content.includes(section));
    }
    catch {
        return false;
    }
}
/**
 * Find the most recent report file in the reports directory.
 * Returns null when no reports exist.
 */
function findLatestReport(reportsDir) {
    try {
        const files = readdirSync(reportsDir)
            .filter((f) => f.endsWith('.md'))
            .map((f) => ({ name: f, path: join(reportsDir, f) }));
        if (files.length === 0)
            return null;
        // Sort lexicographically descending — session-{timestamp}.md filenames are sortable
        files.sort((a, b) => b.name.localeCompare(a.name));
        return files[0].path;
    }
    catch {
        return null;
    }
}
/**
 * Check whether a completion report with all 5 required sections exists.
 *
 * Rules:
 * - Sessions with 0 completed tasks do not require a report (ok: true).
 * - If a valid report is found in .aing/reports/, ok: true.
 * - Otherwise, generate a template and return ok: false with templatePath.
 */
export function checkCompletionReport(projectDir) {
    const dir = projectDir ?? process.cwd();
    const reportsDir = join(dir, '.aing', 'reports');
    // No completed tasks → report not required
    const completedCount = countCompletedTasks(dir);
    if (completedCount === 0) {
        return { ok: true };
    }
    // Check existing reports
    if (existsSync(reportsDir)) {
        const latestReport = findLatestReport(reportsDir);
        if (latestReport && hasAllSections(latestReport)) {
            return { ok: true };
        }
    }
    // No valid report found — generate template
    try {
        if (!existsSync(reportsDir)) {
            mkdirSync(reportsDir, { recursive: true });
        }
        const timestamp = Date.now();
        const templatePath = join(reportsDir, `session-${timestamp}.md`);
        writeFileSync(templatePath, REPORT_TEMPLATE, 'utf-8');
        return {
            ok: false,
            templatePath,
            reason: `완료된 태스크 ${completedCount}개가 있으나 완료 보고서(5개 필수 섹션)가 없습니다.`,
        };
    }
    catch {
        // Template generation failed — still warn, just without a path
        return {
            ok: false,
            reason: '완료 보고서가 없습니다. .aing/reports/ 디렉토리에 보고서를 작성하세요.',
        };
    }
}
//# sourceMappingURL=report-gate.js.map