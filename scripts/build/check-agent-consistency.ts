#!/usr/bin/env node

/**
 * Agent Prompt Consistency Check
 *
 * Verifies that each agents/*.md file reflects the Hard Limits
 * defined in CLAUDE.md. Keywords are extracted from
 * `<!-- harness-keyword: ... -->` comments in CLAUDE.md, falling
 * back to a hardcoded set when no such comments exist.
 *
 * An agent file passes a keyword check if it either:
 *   1. Contains the keyword directly, OR
 *   2. Contains an inheritance phrase like "CLAUDE.md 참조" or
 *      "Hard Limits 준수"
 *
 * Exit 0 = all agents consistent.
 * Exit 1 = inconsistencies found (report printed to stderr).
 *
 * Usage:
 *   npx tsx scripts/build/check-agent-consistency.ts
 *
 * @module scripts/build/check-agent-consistency
 */

import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, '..', '..');
const CLAUDE_MD = join(ROOT, 'CLAUDE.md');
const AGENTS_DIR = join(ROOT, 'agents');

/** Hard Limit rule with associated keywords */
interface HardLimitRule {
  name: string;
  keywords: string[];
}

/** A single violation: agent file missing a hard limit */
interface Violation {
  agentFile: string;
  ruleName: string;
  missingKeywords: string[];
}

/** Phrases that indicate the agent inherits all Hard Limits from CLAUDE.md */
const INHERITANCE_PHRASES = [
  'CLAUDE.md 참조',
  'Hard Limits 준수',
  'Hard Limits 적용',
  'CLAUDE.md 준수',
  'Hard Limits 상속',
];

/**
 * Default fallback keywords when CLAUDE.md has no harness-keyword comments.
 */
const FALLBACK_RULES: HardLimitRule[] = [
  { name: '증거 없이 완료 주장 금지', keywords: ['증거', 'evidence'] },
  { name: 'Agent() 호출 시 description 필수', keywords: ['description'] },
  { name: '팀 사이즈 분석 필수', keywords: ['Solo', 'Duo', 'Squad', 'Full'] },
  { name: 'TDD 강제', keywords: ['TDD', 'RED', 'GREEN', 'test'] },
  { name: '완료 보고서 필수', keywords: ['보고서', 'report', 'verdict'] },
];

/**
 * Parse `<!-- harness-keyword: ruleName | kw1, kw2, kw3 -->` from CLAUDE.md.
 * Returns empty array if none found.
 */
function parseHarnessKeywords(content: string): HardLimitRule[] {
  const pattern = /<!--\s*harness-keyword:\s*(.+?)\s*\|\s*(.+?)\s*-->/g;
  const rules: HardLimitRule[] = [];
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(content)) !== null) {
    const name = match[1].trim();
    const keywords = match[2].split(',').map((k) => k.trim()).filter(Boolean);
    if (keywords.length > 0) {
      rules.push({ name, keywords });
    }
  }

  return rules;
}

/**
 * Check whether content satisfies a rule.
 * A rule is satisfied if at least one keyword is found (case-insensitive).
 */
function checkRule(content: string, rule: HardLimitRule): string[] {
  const lower = content.toLowerCase();
  const found = rule.keywords.some((kw) => lower.includes(kw.toLowerCase()));
  return found ? [] : rule.keywords;
}

/**
 * Check whether content contains an inheritance phrase.
 */
function hasInheritance(content: string): boolean {
  const lower = content.toLowerCase();
  return INHERITANCE_PHRASES.some((phrase) => lower.includes(phrase.toLowerCase()));
}

function main(): void {
  // 1. Read CLAUDE.md and extract rules
  const claudeContent = readFileSync(CLAUDE_MD, 'utf8');
  let rules = parseHarnessKeywords(claudeContent);

  if (rules.length === 0) {
    console.log('No <!-- harness-keyword: ... --> comments found in CLAUDE.md. Using fallback rules.');
    rules = FALLBACK_RULES;
  } else {
    console.log(`Parsed ${rules.length} harness-keyword rules from CLAUDE.md.`);
  }

  // 2. Discover agent files
  const agentFiles = readdirSync(AGENTS_DIR)
    .filter((f) => f.endsWith('.md'))
    .sort();

  if (agentFiles.length === 0) {
    console.log('No agent .md files found in agents/. Nothing to check.');
    process.exit(0);
  }

  console.log(`Checking ${agentFiles.length} agent files against ${rules.length} Hard Limit rules.\n`);

  // 3. Check each agent file
  const violations: Violation[] = [];

  for (const file of agentFiles) {
    const content = readFileSync(join(AGENTS_DIR, file), 'utf8');

    // If the agent inherits all Hard Limits, skip keyword checks
    if (hasInheritance(content)) {
      continue;
    }

    for (const rule of rules) {
      const missing = checkRule(content, rule);
      if (missing.length > 0) {
        violations.push({
          agentFile: file,
          ruleName: rule.name,
          missingKeywords: missing,
        });
      }
    }
  }

  // 4. Report
  if (violations.length === 0) {
    console.log(`All ${agentFiles.length} agent files are consistent with Hard Limits.`);
    process.exit(0);
  }

  // Group by agent file for cleaner output
  const byAgent = new Map<string, Violation[]>();
  for (const v of violations) {
    const list = byAgent.get(v.agentFile) ?? [];
    list.push(v);
    byAgent.set(v.agentFile, list);
  }

  console.error('Agent consistency violations detected:\n');

  for (const [agentFile, fileViolations] of byAgent) {
    console.error(`  agents/${agentFile}:`);
    for (const v of fileViolations) {
      console.error(`    - Missing rule "${v.ruleName}" (expected one of: ${v.missingKeywords.join(', ')})`);
    }
    console.error('');
  }

  console.error(`Total: ${violations.length} violation(s) across ${byAgent.size} agent file(s).`);
  console.error('');
  console.error('Fix options:');
  console.error('  1. Add missing keywords to the agent .md file, OR');
  console.error('  2. Add an inheritance phrase (e.g., "Hard Limits 준수") to the agent .md file.');
  process.exit(1);
}

main();
