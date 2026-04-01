/**
 * aing Story Tracker — PRD-driven acceptance criteria tracking.
 * Tracks user stories with acceptance criteria through pipeline stages.
 * Stories are only marked complete when ALL criteria are verified with evidence.
 * @module scripts/pipeline/story-tracker
 */
import { readState, writeState, updateState, deleteState } from '../core/state.js';
import { join } from 'node:path';
import { createLogger } from '../core/logger.js';
const log = createLogger('story-tracker');
// ---------------------------------------------------------------------------
// Path
// ---------------------------------------------------------------------------
function prdPath(projectDir) {
    return join(projectDir, '.aing', 'state', 'prd-tracking.json');
}
// ---------------------------------------------------------------------------
// CRUD Operations
// ---------------------------------------------------------------------------
/**
 * Create a new PRD with user stories.
 */
export function createPRD(feature, stories, projectDir) {
    const prd = {
        feature,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        stories: stories.map((s, i) => ({
            ...s,
            id: s.id || `US-${String(i + 1).padStart(3, '0')}`,
            passes: false,
        })),
    };
    const result = writeState(prdPath(projectDir), prd);
    if (!result.ok) {
        log.error('Failed to create PRD', { error: result.error });
        throw new Error(result.error);
    }
    log.info('PRD created', { feature, storyCount: prd.stories.length });
    return prd;
}
/**
 * Read current PRD state. Returns null if no PRD exists.
 */
export function readPRD(projectDir) {
    const result = readState(prdPath(projectDir));
    if (!result.ok)
        return null;
    return result.data;
}
/**
 * Get PRD completion status.
 */
export function getPRDStatus(projectDir) {
    const prd = readPRD(projectDir);
    if (!prd) {
        return { total: 0, completed: 0, pending: 0, allComplete: false, nextStory: null, incompleteIds: [] };
    }
    const completed = prd.stories.filter(s => s.passes);
    const pending = prd.stories.filter(s => !s.passes);
    const sorted = [...pending].sort((a, b) => a.priority - b.priority);
    return {
        total: prd.stories.length,
        completed: completed.length,
        pending: pending.length,
        allComplete: pending.length === 0,
        nextStory: sorted[0] ?? null,
        incompleteIds: pending.map(s => s.id),
    };
}
/**
 * Mark a story as complete with evidence.
 * Requires evidence array — empty evidence is rejected.
 */
export function markStoryComplete(projectDir, storyId, evidence, notes) {
    if (!evidence || evidence.length === 0) {
        log.error('Cannot mark story complete without evidence', { storyId });
        return false;
    }
    const result = updateState(prdPath(projectDir), null, (data) => {
        const prd = data;
        if (!prd?.stories)
            return data;
        const story = prd.stories.find(s => s.id === storyId);
        if (!story) {
            log.error('Story not found', { storyId });
            return data;
        }
        story.passes = true;
        story.verifiedAt = new Date().toISOString();
        story.evidence = evidence;
        if (notes)
            story.notes = notes;
        prd.updatedAt = new Date().toISOString();
        log.info('Story marked complete', { storyId, evidenceCount: evidence.length });
        return prd;
    });
    return result.ok;
}
/**
 * Revert a story to incomplete (e.g., after failed verification).
 */
export function revertStory(projectDir, storyId, reason) {
    const result = updateState(prdPath(projectDir), null, (data) => {
        const prd = data;
        if (!prd?.stories)
            return data;
        const story = prd.stories.find(s => s.id === storyId);
        if (!story)
            return data;
        story.passes = false;
        story.verifiedAt = undefined;
        story.notes = `Reverted: ${reason}`;
        prd.updatedAt = new Date().toISOString();
        log.info('Story reverted', { storyId, reason });
        return prd;
    });
    return result.ok;
}
/**
 * Delete PRD tracking state (cleanup after completion).
 */
export function deletePRD(projectDir) {
    deleteState(prdPath(projectDir));
    log.info('PRD tracking cleared');
}
//# sourceMappingURL=story-tracker.js.map