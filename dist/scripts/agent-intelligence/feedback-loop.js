/**
 * aing Agent Feedback Loop Engine
 * Records agent task outcomes and aggregates performance metrics.
 * @module scripts/agent-intelligence/feedback-loop
 */
import { appendFileSync, readFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
const FEEDBACK_DIR = '.aing/agent-feedback';
function feedbackPath(projectDir, agent) {
    return join(projectDir, FEEDBACK_DIR, `${agent}.json`);
}
function ensureDir(projectDir) {
    const dir = join(projectDir, FEEDBACK_DIR);
    if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
    }
}
export function recordFeedback(projectDir, feedback) {
    ensureDir(projectDir);
    const path = feedbackPath(projectDir, feedback.agent);
    appendFileSync(path, JSON.stringify(feedback) + '\n', 'utf8');
}
function parseJsonl(content) {
    const records = [];
    for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed)
            continue;
        try {
            records.push(JSON.parse(trimmed));
        }
        catch {
            // skip malformed lines
        }
    }
    return records;
}
function inferDomain(task) {
    const lower = task.toLowerCase();
    if (lower.includes('리서치') || lower.includes('research') || lower.includes('조사'))
        return 'research';
    if (lower.includes('코드 리뷰') || lower.includes('code review') || lower.includes('review'))
        return 'review';
    if (lower.includes('빌드') || lower.includes('build') || lower.includes('구현') || lower.includes('implement'))
        return 'build';
    if (lower.includes('마이그레이션') || lower.includes('migration') || lower.includes('리팩토링') || lower.includes('refactor'))
        return 'migration';
    if (lower.includes('생성') || lower.includes('generate') || lower.includes('작성') || lower.includes('write'))
        return 'generate';
    return 'general';
}
export function getAgentPerformance(projectDir, agent) {
    const path = feedbackPath(projectDir, agent);
    if (!existsSync(path)) {
        return {
            agent,
            totalTasks: 0,
            completionRate: 0,
            avgReviewScore: 0,
            domains: {},
        };
    }
    const content = readFileSync(path, 'utf8');
    const records = parseJsonl(content);
    if (records.length === 0) {
        return { agent, totalTasks: 0, completionRate: 0, avgReviewScore: 0, domains: {} };
    }
    let completed = 0;
    let reviewScoreSum = 0;
    let reviewScoreCount = 0;
    const domains = {};
    for (const r of records) {
        if (r.metrics.taskCompleted)
            completed++;
        if (r.metrics.reviewScore != null) {
            reviewScoreSum += r.metrics.reviewScore;
            reviewScoreCount++;
        }
        const domain = inferDomain(r.task);
        domains[domain] = (domains[domain] ?? 0) + 1;
    }
    return {
        agent,
        totalTasks: records.length,
        completionRate: Math.round((completed / records.length) * 100),
        avgReviewScore: reviewScoreCount > 0 ? Math.round(reviewScoreSum / reviewScoreCount) : 0,
        domains,
    };
}
export function getAllPerformances(projectDir) {
    const dir = join(projectDir, FEEDBACK_DIR);
    if (!existsSync(dir))
        return [];
    const files = readdirSync(dir).filter(f => f.endsWith('.json'));
    return files.map(file => {
        const agent = file.replace(/\.json$/, '');
        return getAgentPerformance(projectDir, agent);
    });
}
//# sourceMappingURL=feedback-loop.js.map