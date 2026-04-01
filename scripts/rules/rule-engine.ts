/**
 * aing Project Rules — Rule Engine
 * Applies ProjectRule patterns against diff content.
 * @module scripts/rules/rule-engine
 */

import type { ProjectRule, RuleMatch } from './rule-types.js';

/**
 * Apply rules to diff content.
 * Each rule's pattern is matched against added lines in the diff.
 */
export function applyRules(rules: ProjectRule[], diff: string): RuleMatch[] {
  const matches: RuleMatch[] = [];

  if (!diff || rules.length === 0) return matches;

  const addedLines = extractAddedLines(diff);

  for (const rule of rules) {
    let regex: RegExp;
    try {
      regex = new RegExp(rule.pattern, 'g');
    } catch {
      // Invalid regex — skip rule silently
      continue;
    }

    for (const line of addedLines) {
      regex.lastIndex = 0;
      const result = regex.exec(line);
      if (result !== null) {
        matches.push({
          rule,
          line: line.trim().slice(0, 200),
          match: result[0],
        });
      }
    }
  }

  return matches;
}

function extractAddedLines(diff: string): string[] {
  return diff.split('\n')
    .filter(line => line.startsWith('+') && !line.startsWith('+++'))
    .map(line => line.slice(1));
}
