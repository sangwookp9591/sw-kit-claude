export interface AgentFeedback {
    agent: string;
    task: string;
    timestamp: string;
    metrics: {
        taskCompleted: boolean;
        reviewScore?: number;
        testsPassed?: number;
        testsFailed?: number;
        duration?: number;
    };
}
export interface AgentPerformance {
    agent: string;
    totalTasks: number;
    completionRate: number;
    avgReviewScore: number;
    domains: Record<string, number>;
}
export declare function recordFeedback(projectDir: string, feedback: AgentFeedback): void;
export declare function getAgentPerformance(projectDir: string, agent: string): AgentPerformance;
export declare function getAllPerformances(projectDir: string): AgentPerformance[];
//# sourceMappingURL=feedback-loop.d.ts.map