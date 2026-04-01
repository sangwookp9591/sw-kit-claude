/**
 * aing Project Rules — Rule Loader
 * Loads .aing/rules/*.json files and validates schema.
 * @module scripts/rules/rule-loader
 */

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { ProjectRule, RuleValidationResult } from './rule-types.js';

const REQUIRED_FIELDS: (keyof ProjectRule)[] = ['id', 'type', 'pattern', 'action', 'severity', 'message'];
const VALID_TYPES = new Set(['file', 'content', 'naming']);
const VALID_ACTIONS = new Set(['warn', 'error']);
const VALID_SEVERITIES = new Set(['critical', 'high', 'medium', 'low']);

export function validateRule(raw: unknown): RuleValidationResult {
  const errors: string[] = [];

  if (typeof raw !== 'object' || raw === null) {
    return { valid: false, errors: ['Rule must be a JSON object'] };
  }

  const rule = raw as Record<string, unknown>;

  for (const field of REQUIRED_FIELDS) {
    if (rule[field] === undefined || rule[field] === null) {
      errors.push(`Missing required field: ${field}`);
    }
  }

  if (rule['type'] !== undefined && !VALID_TYPES.has(rule['type'] as string)) {
    errors.push(`Invalid type: ${rule['type']}. Must be one of: file, content, naming`);
  }

  if (rule['action'] !== undefined && !VALID_ACTIONS.has(rule['action'] as string)) {
    errors.push(`Invalid action: ${rule['action']}. Must be one of: warn, error`);
  }

  if (rule['severity'] !== undefined && !VALID_SEVERITIES.has(rule['severity'] as string)) {
    errors.push(`Invalid severity: ${rule['severity']}. Must be one of: critical, high, medium, low`);
  }

  return { valid: errors.length === 0, errors };
}

export interface LoadResult {
  rules: ProjectRule[];
  errors: Array<{ file: string; error: string }>;
}

export function loadProjectRules(rulesDir: string): LoadResult {
  const rules: ProjectRule[] = [];
  const errors: Array<{ file: string; error: string }> = [];

  let entries: string[];
  try {
    entries = readdirSync(rulesDir);
  } catch {
    // Directory does not exist — no project rules
    return { rules, errors };
  }

  const jsonFiles = entries.filter(f => f.endsWith('.json'));

  for (const filename of jsonFiles) {
    const filePath = join(rulesDir, filename);
    let parsed: unknown;

    try {
      const content = readFileSync(filePath, 'utf-8');
      parsed = JSON.parse(content);
    } catch (err) {
      errors.push({
        file: filename,
        error: `JSON parse error: ${err instanceof Error ? err.message : String(err)}`,
      });
      continue;
    }

    // Accept either a single rule object or an array of rules
    const candidates = Array.isArray(parsed) ? parsed : [parsed];

    for (const candidate of candidates) {
      const validation = validateRule(candidate);
      if (!validation.valid) {
        errors.push({
          file: filename,
          error: `Validation failed: ${validation.errors.join('; ')}`,
        });
      } else {
        rules.push(candidate as ProjectRule);
      }
    }
  }

  return { rules, errors };
}
