/**
 * Score an agent's specialization for a given domain.
 * Formula: completionRate * 0.4 + avgReviewScore * 0.4 + domainExperience * 0.2
 * confidence: min(taskCount * 10, 100) — 10+ 태스크면 100%
 */
export function scoreSpecialization(performance, domain) {
    const domainTaskCount = performance.domains[domain] ?? 0;
    const totalTasks = performance.totalTasks;
    // cold-start: less than 3 tasks → very low confidence
    const taskCount = totalTasks;
    const confidence = Math.min(taskCount * 10, 100);
    // domainExperience: ratio of domain tasks vs total tasks, 0-100
    const domainExperience = totalTasks > 0 ? Math.round((domainTaskCount / totalTasks) * 100) : 0;
    const score = Math.round(performance.completionRate * 0.4 +
        performance.avgReviewScore * 0.4 +
        domainExperience * 0.2);
    return {
        agent: performance.agent,
        domain,
        score,
        confidence,
        taskCount,
    };
}
/**
 * Rank all agents by their specialization score for a domain.
 * Agents with cold-start (taskCount < 3) are ranked last.
 */
export function recommendAgent(performances, domain) {
    const scored = performances.map(p => scoreSpecialization(p, domain));
    return scored
        .sort((a, b) => {
        const aColdStart = a.taskCount < 3;
        const bColdStart = b.taskCount < 3;
        if (aColdStart !== bColdStart)
            return aColdStart ? 1 : -1;
        return b.score - a.score;
    })
        .map(s => ({ agent: s.agent, score: s.score }));
}
//# sourceMappingURL=specialization-scorer.js.map