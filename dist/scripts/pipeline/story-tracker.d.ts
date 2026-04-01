/**
 * aing Story Tracker — PRD-driven acceptance criteria tracking.
 * Tracks user stories with acceptance criteria through pipeline stages.
 * Stories are only marked complete when ALL criteria are verified with evidence.
 * @module scripts/pipeline/story-tracker
 */
export interface UserStory {
    id: string;
    title: string;
    description: string;
    acceptanceCriteria: string[];
    priority: number;
    passes: boolean;
    verifiedAt?: string;
    notes?: string;
    evidence?: string[];
}
export interface PRDState {
    feature: string;
    createdAt: string;
    updatedAt: string;
    stories: UserStory[];
}
export interface PRDStatus {
    total: number;
    completed: number;
    pending: number;
    allComplete: boolean;
    nextStory: UserStory | null;
    incompleteIds: string[];
}
/**
 * Create a new PRD with user stories.
 */
export declare function createPRD(feature: string, stories: Omit<UserStory, 'passes'>[], projectDir: string): PRDState;
/**
 * Read current PRD state. Returns null if no PRD exists.
 */
export declare function readPRD(projectDir: string): PRDState | null;
/**
 * Get PRD completion status.
 */
export declare function getPRDStatus(projectDir: string): PRDStatus;
/**
 * Mark a story as complete with evidence.
 * Requires evidence array — empty evidence is rejected.
 */
export declare function markStoryComplete(projectDir: string, storyId: string, evidence: string[], notes?: string): boolean;
/**
 * Revert a story to incomplete (e.g., after failed verification).
 */
export declare function revertStory(projectDir: string, storyId: string, reason: string): boolean;
/**
 * Delete PRD tracking state (cleanup after completion).
 */
export declare function deletePRD(projectDir: string): void;
//# sourceMappingURL=story-tracker.d.ts.map