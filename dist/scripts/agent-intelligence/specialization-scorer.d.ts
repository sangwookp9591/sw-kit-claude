/**
 * aing Agent Specialization Scorer
 * Computes domain specialization scores and recommends agents for tasks.
 * @module scripts/agent-intelligence/specialization-scorer
 */
import type { AgentPerformance } from './feedback-loop.js';
export interface SpecializationScore {
    agent: string;
    domain: string;
    score: number;
    confidence: number;
    taskCount: number;
}
/**
 * Score an agent's specialization for a given domain.
 * Formula: completionRate * 0.4 + avgReviewScore * 0.4 + domainExperience * 0.2
 * confidence: min(taskCount * 10, 100) — 10+ 태스크면 100%
 */
export declare function scoreSpecialization(performance: AgentPerformance, domain: string): SpecializationScore;
/**
 * Rank all agents by their specialization score for a domain.
 * Agents with cold-start (taskCount < 3) are ranked last.
 */
export declare function recommendAgent(performances: AgentPerformance[], domain: string): {
    agent: string;
    score: number;
}[];
//# sourceMappingURL=specialization-scorer.d.ts.map