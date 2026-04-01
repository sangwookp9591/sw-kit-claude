/**
 * aing Harness Pattern Transfer — Cross-project pattern sharing
 * Export, import, and match harness patterns across projects.
 * @module scripts/harness/pattern-transfer
 */

import { join } from 'node:path';
import { createLogger } from '../core/logger.js';
import { readStateOrDefault, writeState } from '../core/state.js';
import { getPatterns, registerPattern } from './harness-gallery.js';
import type { GalleryEntry } from './harness-types.js';

const log = createLogger('pattern-transfer');

// ─── Types ───────────────────────────────────────────────────────

export interface TransferablePattern {
  id: string;
  source: string;        // project name (basename of projectDir)
  pattern: GalleryEntry;
  applicability: number; // 0-100
}

// ─── Paths ───────────────────────────────────────────────────────

function transferPath(projectDir: string): string {
  return join(projectDir, '.aing', 'harness-gallery', 'transferred.json');
}

function projectName(projectDir: string): string {
  return projectDir.split('/').filter(Boolean).pop() ?? 'unknown';
}

// ─── Export ──────────────────────────────────────────────────────

/**
 * Export all gallery patterns from a project as transferable patterns.
 * applicability defaults to 100 for patterns with a positive success record,
 * 70 otherwise.
 */
export function exportPatterns(projectDir: string): TransferablePattern[] {
  const patterns = getPatterns(projectDir);
  const source = projectName(projectDir);

  return patterns.map(p => {
    const total = p.successCount + p.failCount;
    const applicability = total > 0
      ? Math.min(100, Math.round((p.successCount / total) * 100))
      : 70;

    return { id: p.id, source, pattern: p, applicability };
  });
}

// ─── Import ──────────────────────────────────────────────────────

/**
 * Import a transferable pattern into the target project's gallery.
 * Returns true if successfully saved, false otherwise.
 */
export function importPattern(projectDir: string, transfer: TransferablePattern): boolean {
  try {
    // Mark the entry as user-sourced with origin metadata in description
    const entry: GalleryEntry = {
      ...transfer.pattern,
      source: 'user',
      description: `[${transfer.source}에서 이전] ${transfer.pattern.description}`,
    };

    registerPattern(entry, projectDir);

    // Track imported transfer records
    const existing = readStateOrDefault(transferPath(projectDir), []) as TransferablePattern[];
    const idx = existing.findIndex(t => t.id === transfer.id);
    if (idx >= 0) {
      existing[idx] = transfer;
    } else {
      existing.push(transfer);
    }
    writeState(transferPath(projectDir), existing);

    log.info('Pattern imported', { id: transfer.id, source: transfer.source });
    return true;
  } catch (err) {
    log.warn('Pattern import failed', { id: transfer.id, error: (err as Error).message });
    return false;
  }
}

// ─── Match ───────────────────────────────────────────────────────

/**
 * Match a task description against a set of transferable patterns.
 * Returns patterns sorted by computed applicability (keyword overlap).
 */
export function matchPatterns(task: string, patterns: TransferablePattern[]): TransferablePattern[] {
  const lower = task.toLowerCase();
  const taskWords = lower.split(/\s+/).filter(w => w.length > 1);

  return patterns
    .map(tp => {
      const keywordScore = tp.pattern.keywords.reduce((acc, kw) => {
        const kwLower = kw.toLowerCase();
        if (lower.includes(kwLower)) return acc + 3;
        if (taskWords.some(w => kwLower.includes(w))) return acc + 1;
        return acc;
      }, 0);

      const nameScore = tp.pattern.name.toLowerCase().split(/\s+/).some(w => lower.includes(w)) ? 5 : 0;
      const domainScore = lower.includes(tp.pattern.domain.toLowerCase()) ? 4 : 0;
      const descScore = tp.pattern.description.toLowerCase().split(/\s+/).some(w => lower.includes(w) && w.length > 2) ? 2 : 0;

      const rawScore = keywordScore + nameScore + domainScore + descScore;
      if (rawScore === 0) return null;
      const applicability = Math.min(100, Math.round(tp.applicability * 0.6 + rawScore * 4));

      return { ...tp, applicability };
    })
    .filter((tp): tp is TransferablePattern => tp !== null)
    .sort((a, b) => b.applicability - a.applicability);
}
