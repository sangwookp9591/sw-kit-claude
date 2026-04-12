#!/usr/bin/env node
/**
 * Phase A — Opus cost ranking (read-only proxy).
 * Input: .omc/state/agent-replay-*.jsonl + .omc/state/subagent-tracking.json
 * Output: .aing/research/opus-cost-ranking.md
 *
 * LIMITATION: cost_proxy = duration_ms × output_price. It is NOT a token count.
 * Use for relative ranking ONLY, not absolute cost claims.
 */
import { readFileSync, readdirSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { MODEL_REGISTRY, type ModelTier } from '../routing/model-router.js';

// Local copy of AGENT_DEFAULTS (not exported from model-router.ts; see plan).
const AGENT_DEFAULTS: Record<string, ModelTier> = {
  able: 'opus', klay: 'opus', sam: 'opus',
  jay: 'opus', derek: 'opus', jerry: 'opus', milla: 'opus', iron: 'opus',
  willji: 'sonnet', rowan: 'sonnet', wizard: 'sonnet',
  // OMC roles (oh-my-claudecode plugin agent catalog)
  critic: 'opus',
  planner: 'opus',
  architect: 'opus',
  analyst: 'opus',
  'code-reviewer': 'opus',
  'deep-executor': 'opus',
  'code-simplifier': 'opus',
  explore: 'haiku',
  writer: 'haiku',
  'style-reviewer': 'haiku',
  // Remaining OMC roles (executor, debugger, verifier, ...) fall through to 'sonnet'
};

export interface ParsedEvent { agent_type: string; duration_ms: number; }
export interface AgentCost {
  agent: string; tier: ModelTier; calls: number;
  totalDurationMs: number; costProxy: number;
}

export function normalizeAgentName(name: string): string {
  const segs = name.split(':');
  return segs[segs.length - 1].toLowerCase();
}

export function tierForAgent(normalized: string): ModelTier {
  return AGENT_DEFAULTS[normalized] ?? 'sonnet';
}

export function parseReplayLines(lines: string[]): ParsedEvent[] {
  const out: ParsedEvent[] = [];
  for (const line of lines) {
    if (!line.trim()) continue;
    let obj: any;
    try { obj = JSON.parse(line); } catch { continue; }
    if (obj?.event !== 'agent_stop') continue;
    if (typeof obj.agent_type !== 'string' || typeof obj.duration_ms !== 'number') continue;
    out.push({ agent_type: obj.agent_type, duration_ms: obj.duration_ms });
  }
  return out;
}

export function aggregateByAgent(events: ParsedEvent[]): Map<string, AgentCost> {
  const map = new Map<string, AgentCost>();
  for (const e of events) {
    const agent = normalizeAgentName(e.agent_type);
    const tier = tierForAgent(agent);
    const outputPrice = MODEL_REGISTRY[tier]?.pricing.output ?? 15;
    const cur = map.get(agent) ?? { agent, tier, calls: 0, totalDurationMs: 0, costProxy: 0 };
    cur.calls += 1;
    cur.totalDurationMs += e.duration_ms;
    cur.costProxy = cur.totalDurationMs * outputPrice;
    map.set(agent, cur);
  }
  return map;
}

interface FormatMeta { measuredAt: string; sourceFiles: string[]; totalCalls: number; }

export function formatRankingMarkdown(map: Map<string, AgentCost>, meta: FormatMeta): string {
  const sorted = [...map.values()].sort((a, b) => b.costProxy - a.costProxy);
  const top5 = sorted.slice(0, 5);
  const row = (r: AgentCost, i: number) =>
    `| ${i + 1} | ${r.agent} | ${r.tier} | ${r.calls} | ${r.totalDurationMs} | ${r.costProxy.toLocaleString()} |`;
  const header = `| Rank | Agent | Tier | Calls | Total Duration (ms) | Cost Proxy (relative) |\n|------|-------|------|-------|---------------------|------------------------|`;
  return [
    `# Opus 비용 ranking (상대 프록시)`,
    ``,
    `> ⚠️ 한계: duration_ms × output_price 기반 추정. 토큰 수 아님. 절대 비용이 아닌 ranking 비교용.`,
    `>`,
    `> 측정 시점: ${meta.measuredAt}`,
    `> 데이터 소스: ${meta.sourceFiles.length}개 replay 로그 + subagent-tracking.json`,
    `> 총 에이전트 호출: ${meta.totalCalls}건`,
    ``,
    `## Top 5 비용 주도 에이전트`,
    ``,
    header,
    ...top5.map(row),
    ``,
    `## 전체 에이전트 표`,
    ``,
    header,
    ...sorted.map(row),
    ``,
    `## 데이터 소스 파일`,
    ``,
    ...meta.sourceFiles.map((f) => `- ${f}`),
    ``,
  ].join('\n');
}

// ---------------- CLI entry (read-only) ----------------

function loadReplayFiles(stateDir: string): { lines: string[]; files: string[] } {
  if (!existsSync(stateDir)) return { lines: [], files: [] };
  const files = readdirSync(stateDir)
    .filter((f) => f.startsWith('agent-replay-') && f.endsWith('.jsonl'))
    .map((f) => join(stateDir, f));
  const lines: string[] = [];
  for (const f of files) lines.push(...readFileSync(f, 'utf8').split('\n'));
  return { lines, files };
}

function loadSubagentTracking(stateDir: string): ParsedEvent[] {
  const p = join(stateDir, 'subagent-tracking.json');
  if (!existsSync(p)) return [];
  try {
    const obj = JSON.parse(readFileSync(p, 'utf8'));
    const agents = Array.isArray(obj?.agents) ? obj.agents : [];
    return agents
      .filter((a: any) => typeof a?.agent_type === 'string' && typeof a?.duration_ms === 'number')
      .map((a: any) => ({ agent_type: a.agent_type, duration_ms: a.duration_ms }));
  } catch { return []; }
}

export function main(repoRoot: string = process.cwd()): string {
  const stateDir = join(repoRoot, '.omc', 'state');
  const { lines, files } = loadReplayFiles(stateDir);
  const replayEvents = parseReplayLines(lines);
  const trackingEvents = loadSubagentTracking(stateDir);
  const all = [...replayEvents, ...trackingEvents];
  const map = aggregateByAgent(all);
  const md = formatRankingMarkdown(map, {
    measuredAt: new Date().toISOString(),
    sourceFiles: [...files.map((f) => f.replace(repoRoot + '/', '')), '.omc/state/subagent-tracking.json'],
    totalCalls: all.length,
  });
  const outDir = join(repoRoot, '.aing', 'research');
  mkdirSync(outDir, { recursive: true });
  const outPath = join(outDir, 'opus-cost-ranking.md');
  writeFileSync(outPath, md, 'utf8');
  return outPath;
}

// Run when invoked directly (tsx / node)
const isMain = (() => {
  try {
    const thisFile = fileURLToPath(import.meta.url);
    return process.argv[1] && (process.argv[1] === thisFile || dirname(process.argv[1]) === dirname(thisFile));
  } catch { return false; }
})();

if (isMain) {
  const out = main();
  console.log(`Wrote ${out}`);
}
