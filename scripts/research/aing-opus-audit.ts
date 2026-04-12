#!/usr/bin/env node
/**
 * aing Opus Audit — 4-way Decision Map (Phase A, read-only static analyzer)
 *
 * Maps each aing agent across 5 model decision sources and classifies it:
 *   JUSTIFIED   — all 4 ACTIVE sources agree on opus
 *   DIVERGENT   — frontmatter opus + active sources mix opus & sonnet
 *   ORPHAN_OPUS — only frontmatter says opus, every other active source is sonnet/missing
 *   DEAD_REF    — AGENT_DEFAULTS has entries but routeModel() has 0 callsites (reported once)
 *
 * Active decision sources (4): frontmatter, AGENT_TIERS, team-orchestrator, CLAUDE.md roster.
 * AGENT_DEFAULTS is shown for visibility but EXCLUDED from classification (dead code).
 *
 * Output: .aing/research/aing-opus-audit.md
 *
 * @module scripts/research/aing-opus-audit
 */
import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

export type ModelValue = 'opus' | 'sonnet' | 'haiku';
export type Classification = 'JUSTIFIED' | 'DIVERGENT' | 'ORPHAN_OPUS';

export interface AgentSources {
  frontmatter: ModelValue | null;
  agentDefaults: ModelValue | null;
  agentTiers: ModelValue | null;
  orchestrator: ModelValue | null;
  roster: ModelValue | null;
}

export interface AgentRecord {
  name: string;
  sources: AgentSources;
  classification: Classification;
}

export interface AuditReport {
  timestamp: string;
  agents: AgentRecord[];
  deadRefCount: number;
  deadRefTotal: number;
}

// ---------- Pure Parsers ----------

export function parseFrontmatterModel(content: string): ModelValue | null {
  const fm = content.match(/^---\n([\s\S]*?)\n---/);
  if (!fm) return null;
  const m = fm[1].match(/^model:\s*(\w+)\s*$/m);
  if (!m) return null;
  const v = m[1].toLowerCase();
  return v === 'opus' || v === 'sonnet' || v === 'haiku' ? v : null;
}

function extractObjectBlock(source: string, declRegex: RegExp): string | null {
  const m = source.match(declRegex);
  if (!m) return null;
  const start = source.indexOf('{', m.index! + m[0].length - 1);
  if (start < 0) return null;
  let depth = 0;
  for (let i = start; i < source.length; i++) {
    if (source[i] === '{') depth++;
    else if (source[i] === '}') {
      depth--;
      if (depth === 0) return source.slice(start + 1, i);
    }
  }
  return null;
}

export function parseAgentDefaults(source: string): Record<string, ModelValue> {
  const block = extractObjectBlock(source, /AGENT_DEFAULTS[^=]*=\s*\{/);
  if (!block) return {};
  const out: Record<string, ModelValue> = {};
  const re = /(?:^|[\s,])['"]?(\w+)['"]?\s*:\s*['"](opus|sonnet|haiku)['"]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(block)) !== null) {
    out[m[1].toLowerCase()] = m[2] as ModelValue;
  }
  return out;
}

const RANK: Record<ModelValue, number> = { haiku: 0, sonnet: 1, opus: 2 };

function upgrade(prev: ModelValue | undefined, next: ModelValue): ModelValue {
  if (!prev) return next;
  return RANK[next] > RANK[prev] ? next : prev;
}

export function parseAgentTiers(source: string): Record<string, ModelValue> {
  const block = extractObjectBlock(source, /AGENT_TIERS[^=]*=\s*\{/);
  if (!block) return {};
  const out: Record<string, ModelValue> = {};
  const re = /agent:\s*['"](\w+)['"][^}]*?model:\s*['"](opus|sonnet|haiku)['"]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(block)) !== null) {
    const agent = m[1].toLowerCase();
    out[agent] = upgrade(out[agent], m[2] as ModelValue);
  }
  return out;
}

export function parseOrchestratorHardcoded(source: string): Record<string, ModelValue> {
  const out: Record<string, ModelValue> = {};
  const re = /name:\s*['"](\w+)['"][^}]*?model:\s*['"](opus|sonnet|haiku)['"]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(source)) !== null) {
    const agent = m[1].toLowerCase();
    out[agent] = upgrade(out[agent], m[2] as ModelValue);
  }
  return out;
}

export function parseRosterFromClaudeMd(content: string): Record<string, ModelValue> {
  const idx = content.indexOf('## Agent Team Roster');
  if (idx < 0) return {};
  const after = content.slice(idx);
  const out: Record<string, ModelValue> = {};
  const re = /(\w+)\(([^)]*?)\/(opus|sonnet|haiku)\)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(after)) !== null) {
    out[m[1].toLowerCase()] = m[3] as ModelValue;
  }
  return out;
}

// ---------- Classifier ----------

export function classifyAgent(s: AgentSources): Classification {
  if (s.frontmatter !== 'opus') return 'JUSTIFIED';
  const others: Array<ModelValue | null> = [s.agentTiers, s.orchestrator, s.roster];
  const otherOpus = others.filter((v) => v === 'opus').length;
  if (otherOpus === others.length) return 'JUSTIFIED';
  if (otherOpus === 0) return 'ORPHAN_OPUS';
  return 'DIVERGENT';
}

// ---------- Markdown formatter ----------

function fmt(v: ModelValue | null): string {
  return v ?? '—';
}

export function formatAuditMarkdown(report: AuditReport): string {
  const groups = {
    JUSTIFIED: report.agents.filter((a) => a.classification === 'JUSTIFIED'),
    DIVERGENT: report.agents.filter((a) => a.classification === 'DIVERGENT'),
    ORPHAN_OPUS: report.agents.filter((a) => a.classification === 'ORPHAN_OPUS'),
  };

  const lines: string[] = [];
  lines.push('# aing Opus Audit — 4-way Decision Map');
  lines.push('');
  lines.push('> 한계: 구조 분석. 호출 빈도 미반영. 비용 임팩트 순위 아님.');
  lines.push('> 활성 결정 지점 4개: frontmatter, AGENT_TIERS, team-orchestrator, CLAUDE.md');
  lines.push('> AGENT_DEFAULTS는 죽은 코드 (routeModel() callsite 0건)');
  lines.push('>');
  lines.push(`> 측정 시점: ${report.timestamp}`);
  lines.push(`> 분석 에이전트: ${report.agents.length}개`);
  lines.push('');
  lines.push('## Summary');
  lines.push(`- 🟢 JUSTIFIED: ${groups.JUSTIFIED.length}개`);
  lines.push(`- 🟡 DIVERGENT: ${groups.DIVERGENT.length}개`);
  lines.push(`- 🔴 ORPHAN_OPUS: ${groups.ORPHAN_OPUS.length}개 (다운그레이드 후보)`);
  lines.push(`- ⚠️ DEAD_REF: AGENT_DEFAULTS ${report.deadRefCount}/${report.deadRefTotal} entry → routeModel() 미사용`);
  lines.push('');

  const headerActive = '| Agent | frontmatter | AGENT_TIERS | orchestrator | CLAUDE.md |';
  const sepActive = '|---|---|---|---|---|';
  const rowActive = (a: AgentRecord) =>
    `| ${a.name} | ${fmt(a.sources.frontmatter)} | ${fmt(a.sources.agentTiers)} | ${fmt(a.sources.orchestrator)} | ${fmt(a.sources.roster)} |`;

  lines.push('## 🔴 ORPHAN_OPUS (다운그레이드 후보)');
  if (groups.ORPHAN_OPUS.length === 0) lines.push('_없음_');
  else {
    lines.push(headerActive);
    lines.push(sepActive);
    for (const a of groups.ORPHAN_OPUS) lines.push(rowActive(a));
  }
  lines.push('');

  lines.push('## 🟡 DIVERGENT');
  if (groups.DIVERGENT.length === 0) lines.push('_없음_');
  else {
    lines.push(headerActive);
    lines.push(sepActive);
    for (const a of groups.DIVERGENT) lines.push(rowActive(a));
  }
  lines.push('');

  lines.push('## 🟢 JUSTIFIED');
  if (groups.JUSTIFIED.length === 0) lines.push('_없음_');
  else {
    lines.push(headerActive);
    lines.push(sepActive);
    for (const a of groups.JUSTIFIED) lines.push(rowActive(a));
  }
  lines.push('');

  lines.push('## 전체 매핑 표');
  lines.push('| Agent | frontmatter | AGENT_DEFAULTS (DEAD) | AGENT_TIERS | orchestrator | CLAUDE.md | 분류 |');
  lines.push('|---|---|---|---|---|---|---|');
  for (const a of report.agents) {
    lines.push(
      `| ${a.name} | ${fmt(a.sources.frontmatter)} | ${fmt(a.sources.agentDefaults)} | ${fmt(a.sources.agentTiers)} | ${fmt(a.sources.orchestrator)} | ${fmt(a.sources.roster)} | ${a.classification} |`,
    );
  }
  lines.push('');

  lines.push('## 데이터 소스 파일');
  lines.push('- agents/*.md (21 files)');
  lines.push('- scripts/routing/model-router.ts:89-108 (AGENT_DEFAULTS, DEAD)');
  lines.push('- scripts/pipeline/agent-tiers.ts:26-53 (AGENT_TIERS)');
  lines.push('- scripts/pipeline/team-orchestrator.ts:76-129 (hardcoded)');
  lines.push('- CLAUDE.md (## Agent Team Roster)');
  lines.push('');

  return lines.join('\n');
}

// ---------- I/O entrypoint ----------

export function main(repoRoot: string): string {
  const agentsDir = join(repoRoot, 'agents');
  const routerSrc = readFileSync(join(repoRoot, 'scripts/routing/model-router.ts'), 'utf8');
  const tiersSrc = readFileSync(join(repoRoot, 'scripts/pipeline/agent-tiers.ts'), 'utf8');
  const orcSrc = readFileSync(join(repoRoot, 'scripts/pipeline/team-orchestrator.ts'), 'utf8');
  const claudeMd = readFileSync(join(repoRoot, 'CLAUDE.md'), 'utf8');

  const agentDefaults = parseAgentDefaults(routerSrc);
  const agentTiers = parseAgentTiers(tiersSrc);
  const orchestrator = parseOrchestratorHardcoded(orcSrc);
  const roster = parseRosterFromClaudeMd(claudeMd);

  const agentNames = readdirSync(agentsDir)
    .filter((f) => f.endsWith('.md'))
    .map((f) => basename(f, '.md'))
    .sort();

  const agents: AgentRecord[] = agentNames.map((name) => {
    const fmContent = readFileSync(join(agentsDir, `${name}.md`), 'utf8');
    const key = name.toLowerCase();
    const sources: AgentSources = {
      frontmatter: parseFrontmatterModel(fmContent),
      agentDefaults: agentDefaults[key] ?? null,
      agentTiers: agentTiers[key] ?? null,
      orchestrator: orchestrator[key] ?? null,
      roster: roster[key] ?? null,
    };
    return { name, sources, classification: classifyAgent(sources) };
  });

  const report: AuditReport = {
    timestamp: new Date().toISOString(),
    agents,
    deadRefCount: Object.keys(agentDefaults).length,
    deadRefTotal: agents.length,
  };

  const md = formatAuditMarkdown(report);
  const outDir = join(repoRoot, '.aing/research');
  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
  const outPath = join(outDir, 'aing-opus-audit.md');
  writeFileSync(outPath, md, 'utf8');
  return outPath;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const here = dirname(fileURLToPath(import.meta.url));
  const repoRoot = join(here, '..', '..');
  const out = main(repoRoot);
  console.log(`audit written -> ${out}`);
}
