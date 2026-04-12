/**
 * Unit tests for scripts/research/aing-opus-audit.ts
 * Pure parser + classifier coverage. No filesystem I/O.
 */
import { describe, it, expect } from 'vitest';
import {
  parseFrontmatterModel,
  parseAgentDefaults,
  parseAgentTiers,
  parseOrchestratorHardcoded,
  parseRosterFromClaudeMd,
  classifyAgent,
  formatAuditMarkdown,
  type AgentSources,
} from '../../../scripts/research/aing-opus-audit.js';

describe('parseFrontmatterModel', () => {
  it('extracts model from valid frontmatter', () => {
    const md = `---\nname: iron\nmodel: opus\n---\nbody`;
    expect(parseFrontmatterModel(md)).toBe('opus');
  });

  it('returns null when no frontmatter', () => {
    expect(parseFrontmatterModel('no frontmatter here')).toBeNull();
  });

  it('returns null when model field absent', () => {
    expect(parseFrontmatterModel('---\nname: foo\n---')).toBeNull();
  });

  it('handles sonnet value', () => {
    expect(parseFrontmatterModel('---\nmodel: sonnet\n---')).toBe('sonnet');
  });
});

describe('parseAgentDefaults', () => {
  it('extracts AGENT_DEFAULTS object literal entries', () => {
    const src = `
const AGENT_DEFAULTS: Record<string, ModelTier> = {
  able: 'opus',
  jay: 'opus',
  willji: 'sonnet',
};
`;
    const result = parseAgentDefaults(src);
    expect(result.able).toBe('opus');
    expect(result.jay).toBe('opus');
    expect(result.willji).toBe('sonnet');
  });

  it('returns empty object when block not found', () => {
    expect(parseAgentDefaults('// nothing here')).toEqual({});
  });
});

describe('parseAgentTiers', () => {
  it('extracts AGENT_TIERS agent → model from entries', () => {
    const src = `
export const AGENT_TIERS: Record<string, AgentTierEntry> = {
  explore: { agent: 'klay', tier: 1, model: 'haiku', description: 'x' },
  'backend-impl': { agent: 'jay', tier: 2, model: 'opus', description: 'y' },
};
`;
    const result = parseAgentTiers(src);
    // AGENT_TIERS keys are pipeline-roles, but we want agent → model mapping
    expect(result.klay).toBe('haiku');
    expect(result.jay).toBe('opus');
  });

  it('keeps highest-capability model when an agent appears multiple times', () => {
    const src = `
export const AGENT_TIERS: Record<string, AgentTierEntry> = {
  a: { agent: 'sam', tier: 1, model: 'haiku', description: '' },
  b: { agent: 'sam', tier: 4, model: 'opus', description: '' },
};
`;
    expect(parseAgentTiers(src).sam).toBe('opus');
  });
});

describe('parseOrchestratorHardcoded', () => {
  it('extracts { name: ..., model: ... } pairs from worker arrays', () => {
    const src = `
const TEAM_PRESETS = {
  squad: {
    workers: [
      { name: 'jay', agent: 'executor', model: 'sonnet', role: 'x' },
      { name: 'sam', agent: 'sam', model: 'haiku', role: 'y' },
    ],
  },
};
`;
    const result = parseOrchestratorHardcoded(src);
    expect(result.jay).toBe('sonnet');
    expect(result.sam).toBe('haiku');
  });

  it('upgrades to highest model when same agent appears in multiple presets', () => {
    const src = `
{ name: 'klay', agent: 'planner', model: 'sonnet', role: '' },
{ name: 'klay', agent: 'planner', model: 'opus', role: '' },
`;
    expect(parseOrchestratorHardcoded(src).klay).toBe('opus');
  });
});

describe('parseRosterFromClaudeMd', () => {
  it('parses Name(Role/model) tokens from roster line', () => {
    const md = `## Agent Team Roster\n\nSam(CTO/opus) Able(PM/sonnet) Iron(Web Frontend/sonnet)\n`;
    const result = parseRosterFromClaudeMd(md);
    expect(result.sam).toBe('opus');
    expect(result.able).toBe('sonnet');
    expect(result.iron).toBe('sonnet');
  });

  it('returns empty object when roster section missing', () => {
    expect(parseRosterFromClaudeMd('# nothing')).toEqual({});
  });
});

describe('classifyAgent', () => {
  const base = (over: Partial<AgentSources> = {}): AgentSources => ({
    frontmatter: null,
    agentDefaults: null,
    agentTiers: null,
    orchestrator: null,
    roster: null,
    ...over,
  });

  it('JUSTIFIED when all 4 active sources opus', () => {
    const s = base({ frontmatter: 'opus', agentTiers: 'opus', orchestrator: 'opus', roster: 'opus' });
    expect(classifyAgent(s)).toBe('JUSTIFIED');
  });

  it('ORPHAN_OPUS when only frontmatter is opus and others are sonnet/missing', () => {
    const s = base({ frontmatter: 'opus', agentTiers: 'sonnet', orchestrator: 'sonnet', roster: null });
    expect(classifyAgent(s)).toBe('ORPHAN_OPUS');
  });

  it('ORPHAN_OPUS when only frontmatter is opus and others entirely missing', () => {
    const s = base({ frontmatter: 'opus' });
    expect(classifyAgent(s)).toBe('ORPHAN_OPUS');
  });

  it('DIVERGENT when frontmatter opus and at least one other active source is also opus alongside sonnet', () => {
    const s = base({ frontmatter: 'opus', agentTiers: 'opus', orchestrator: 'sonnet', roster: 'sonnet' });
    expect(classifyAgent(s)).toBe('DIVERGENT');
  });

  it('JUSTIFIED ignores AGENT_DEFAULTS (dead code) — even if it disagrees', () => {
    const s = base({
      frontmatter: 'opus',
      agentDefaults: 'sonnet',
      agentTiers: 'opus',
      orchestrator: 'opus',
      roster: 'opus',
    });
    expect(classifyAgent(s)).toBe('JUSTIFIED');
  });

  it('non-opus frontmatter is not ORPHAN_OPUS', () => {
    const s = base({ frontmatter: 'sonnet' });
    expect(classifyAgent(s)).toBe('JUSTIFIED');
  });
});

describe('formatAuditMarkdown', () => {
  it('renders all required section headers', () => {
    const md = formatAuditMarkdown({
      timestamp: '2026-04-12T00:00:00.000Z',
      agents: [
        {
          name: 'iron',
          sources: {
            frontmatter: 'opus',
            agentDefaults: 'opus',
            agentTiers: 'opus',
            orchestrator: 'sonnet',
            roster: 'sonnet',
          },
          classification: 'ORPHAN_OPUS',
        },
      ],
      deadRefCount: 13,
      deadRefTotal: 21,
    });
    expect(md).toContain('# aing Opus Audit');
    expect(md).toContain('## Summary');
    expect(md).toContain('🔴 ORPHAN_OPUS');
    expect(md).toContain('iron');
    expect(md).toContain('AGENT_DEFAULTS');
  });
});
