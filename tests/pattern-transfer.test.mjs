import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import {
  exportPatterns,
  importPattern,
  matchPatterns,
} from '../dist/scripts/harness/pattern-transfer.js';
import { getPatterns } from '../dist/scripts/harness/harness-gallery.js';

const TEST_DIR = join(import.meta.dirname, '.test-pattern-transfer-tmp');
const TARGET_DIR = join(import.meta.dirname, '.test-pattern-transfer-target-tmp');

describe('pattern-transfer: export / import / match', () => {
  before(() => {
    mkdirSync(TEST_DIR, { recursive: true });
    mkdirSync(TARGET_DIR, { recursive: true });
  });

  after(() => {
    rmSync(TEST_DIR, { recursive: true, force: true });
    rmSync(TARGET_DIR, { recursive: true, force: true });
  });

  it('exportPatterns returns transferable patterns with source set', () => {
    const transferred = exportPatterns(TEST_DIR);
    assert.ok(Array.isArray(transferred), 'should return an array');
    assert.ok(transferred.length > 0, 'should export at least builtin patterns');

    for (const tp of transferred) {
      assert.ok(typeof tp.id === 'string', 'id must be string');
      assert.ok(typeof tp.source === 'string', 'source must be string');
      assert.ok(typeof tp.applicability === 'number', 'applicability must be number');
      assert.ok(tp.applicability >= 0 && tp.applicability <= 100, 'applicability in [0,100]');
      assert.ok(tp.pattern, 'pattern entry must exist');
    }
  });

  it('importPattern round-trip: exported pattern appears in target gallery', () => {
    const exported = exportPatterns(TEST_DIR);
    assert.ok(exported.length > 0, 'needs at least one pattern to import');

    const toImport = exported[0];
    const ok = importPattern(TARGET_DIR, toImport);
    assert.equal(ok, true, 'importPattern should return true on success');

    const targetPatterns = getPatterns(TARGET_DIR);
    const found = targetPatterns.find(p => p.id === toImport.id);
    assert.ok(found, 'imported pattern should appear in target gallery');
    assert.ok(found.description.includes(toImport.source), 'description should mention source project');
  });

  it('importPattern is idempotent — re-importing same pattern does not duplicate', () => {
    const exported = exportPatterns(TEST_DIR);
    const toImport = exported[0];

    importPattern(TARGET_DIR, toImport);
    importPattern(TARGET_DIR, toImport);

    const targetPatterns = getPatterns(TARGET_DIR);
    const matches = targetPatterns.filter(p => p.id === toImport.id);
    assert.equal(matches.length, 1, 'should not duplicate on re-import');
  });

  it('matchPatterns returns sorted results with applicability > 0', () => {
    const exported = exportPatterns(TEST_DIR);

    // "code review" should match the code-review pattern from builtins
    const results = matchPatterns('코드 리뷰 PR 보안 검토', exported);
    assert.ok(Array.isArray(results), 'should return array');

    if (results.length > 0) {
      for (let i = 1; i < results.length; i++) {
        assert.ok(
          results[i - 1].applicability >= results[i].applicability,
          'results should be sorted descending by applicability',
        );
      }
      for (const r of results) {
        assert.ok(r.applicability > 0, 'all returned results have applicability > 0');
      }
    }
  });

  it('matchPatterns returns empty array for unrelated task', () => {
    // Build a pattern list with a single well-known keyword
    const fakePattern = {
      id: 'test-only',
      source: 'test',
      applicability: 80,
      pattern: {
        id: 'test-only',
        name: 'alpha',
        domain: 'alpha',
        pattern: 'pipeline',
        executionMode: 'sub-agent',
        agentCount: 1,
        agents: ['alpha-agent'],
        description: 'alpha only',
        keywords: ['alpha'],
        complexity: { min: 1, max: 5 },
        successCount: 0,
        failCount: 0,
        createdAt: '2026-01-01',
        source: 'builtin',
      },
    };
    // Task has zero overlap with keyword 'alpha'
    const results = matchPatterns('completely unrelated task zzzq', [fakePattern]);
    assert.equal(results.length, 0, 'no patterns should match a task with zero keyword overlap');
  });

  it('matchPatterns ranks best match first for research task', () => {
    const exported = exportPatterns(TEST_DIR);
    const results = matchPatterns('research survey 조사 보고서', exported);

    if (results.length > 0) {
      const top = results[0];
      assert.ok(
        top.pattern.domain === 'research' || top.pattern.keywords.some(k => ['리서치', 'research', '조사'].includes(k)),
        'top result should be research-related',
      );
    }
  });
});
