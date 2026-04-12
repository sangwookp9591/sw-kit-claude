/**
 * Unit tests for scripts/research/opus-baseline.ts
 * Covers: parseReplayLines, aggregateByAgent, formatRankingMarkdown
 */
import { describe, it, expect } from 'vitest';
import {
  parseReplayLines,
  aggregateByAgent,
  formatRankingMarkdown,
  normalizeAgentName,
  tierForAgent,
} from '../../../scripts/research/opus-baseline.js';

describe('normalizeAgentName', () => {
  it('strips oh-my-claudecode: prefix and lowercases', () => {
    expect(normalizeAgentName('oh-my-claudecode:critic')).toBe('critic');
    expect(normalizeAgentName('Explore')).toBe('explore');
    expect(normalizeAgentName('klay')).toBe('klay');
  });
});

describe('tierForAgent', () => {
  it('returns opus for known opus agents', () => {
    expect(tierForAgent('klay')).toBe('opus');
    expect(tierForAgent('jay')).toBe('opus');
  });
  it('falls back to sonnet for unknown agents', () => {
    expect(tierForAgent('unknown_agent_xyz')).toBe('sonnet');
  });
  it('returns sonnet for willji (lightweight)', () => {
    expect(tierForAgent('willji')).toBe('sonnet');
  });
  it('maps OMC opus roles to opus', () => {
    expect(tierForAgent('critic')).toBe('opus');
    expect(tierForAgent('planner')).toBe('opus');
    expect(tierForAgent('architect')).toBe('opus');
    expect(tierForAgent('analyst')).toBe('opus');
    expect(tierForAgent('code-reviewer')).toBe('opus');
  });
  it('maps OMC haiku roles to haiku', () => {
    expect(tierForAgent('explore')).toBe('haiku');
    expect(tierForAgent('writer')).toBe('haiku');
  });
  it('preserves fallback behavior for unmapped OMC roles', () => {
    expect(tierForAgent('executor')).toBe('sonnet');
    expect(tierForAgent('unknown-foo')).toBe('sonnet');
  });
  it('normalizes oh-my-claudecode: prefix before tier lookup', () => {
    expect(tierForAgent(normalizeAgentName('oh-my-claudecode:critic'))).toBe('opus');
    expect(tierForAgent(normalizeAgentName('oh-my-claudecode:explore'))).toBe('haiku');
  });
});

describe('parseReplayLines', () => {
  it('extracts agent_stop events with agent_type and duration_ms', () => {
    const lines = [
      JSON.stringify({ t: 0, agent: 'a1', agent_type: 'klay', event: 'agent_start' }),
      JSON.stringify({ t: 0, agent: 'a1', agent_type: 'klay', event: 'agent_stop', duration_ms: 1000 }),
    ];
    const events = parseReplayLines(lines);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ agent_type: 'klay', duration_ms: 1000 });
  });

  it('ignores system events without agent_type', () => {
    const lines = [
      JSON.stringify({ t: 0, agent: 'system', event: 'keyword_detected', keyword: 'ralplan' }),
      JSON.stringify({ t: 0, agent: 'system', event: 'mode_change', mode_from: 'none', mode_to: 'ralph' }),
    ];
    expect(parseReplayLines(lines)).toHaveLength(0);
  });

  it('ignores malformed JSON lines', () => {
    const lines = ['not json', '', JSON.stringify({ event: 'agent_stop', agent_type: 'jay', duration_ms: 500 })];
    const events = parseReplayLines(lines);
    expect(events).toHaveLength(1);
    expect(events[0].duration_ms).toBe(500);
  });

  it('ignores agent_stop without duration_ms', () => {
    const lines = [JSON.stringify({ event: 'agent_stop', agent_type: 'jay' })];
    expect(parseReplayLines(lines)).toHaveLength(0);
  });
});

describe('aggregateByAgent', () => {
  it('sums duration for a single agent across multiple calls', () => {
    const events = [
      { agent_type: 'klay', duration_ms: 1000 },
      { agent_type: 'klay', duration_ms: 2000 },
    ];
    const map = aggregateByAgent(events);
    const klay = map.get('klay')!;
    expect(klay.calls).toBe(2);
    expect(klay.totalDurationMs).toBe(3000);
    expect(klay.tier).toBe('opus');
    // opus output price = 75 per 1M tokens. cost proxy = 3000 * 75 = 225000 (relative units)
    expect(klay.costProxy).toBe(3000 * 75);
  });

  it('normalizes oh-my-claudecode: prefix', () => {
    const events = [
      { agent_type: 'oh-my-claudecode:critic', duration_ms: 500 },
      { agent_type: 'critic', duration_ms: 500 },
    ];
    const map = aggregateByAgent(events);
    expect(map.size).toBe(1);
    expect(map.get('critic')!.calls).toBe(2);
    expect(map.get('critic')!.totalDurationMs).toBe(1000);
  });

  it('falls back to sonnet pricing for unknown agents', () => {
    const events = [{ agent_type: 'unknown_xyz', duration_ms: 1000 }];
    const map = aggregateByAgent(events);
    const a = map.get('unknown_xyz')!;
    expect(a.tier).toBe('sonnet');
    // sonnet output = 15
    expect(a.costProxy).toBe(1000 * 15);
  });
});

describe('formatRankingMarkdown', () => {
  it('includes warning header, Top 5 section, and full table', () => {
    const events = [
      { agent_type: 'klay', duration_ms: 1000 },
      { agent_type: 'jay', duration_ms: 500 },
    ];
    const map = aggregateByAgent(events);
    const md = formatRankingMarkdown(map, {
      measuredAt: '2026-04-12T00:00:00.000Z',
      sourceFiles: ['agent-replay-x.jsonl'],
      totalCalls: 2,
    });
    expect(md).toContain('한계');
    expect(md).toContain('Top 5');
    expect(md).toContain('klay');
    expect(md).toContain('jay');
    expect(md).toContain('agent-replay-x.jsonl');
    expect(md).toContain('2026-04-12T00:00:00.000Z');
  });
});
