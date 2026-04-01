/**
 * aing Rule Engine Test Suite
 * Tests pattern matching, diff application, and CATEGORIES injection.
 *
 * Run: node --test tests/rule-engine.test.mjs
 */
import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

const ENGINE = '../dist/scripts/rules/rule-engine.js';
const CHECKLIST = '../dist/scripts/review/review-checklist.js';

const makeRule = (overrides = {}) => ({
  id: 'test-rule',
  type: 'content',
  pattern: 'console\\.log',
  action: 'warn',
  severity: 'low',
  message: 'No console.log',
  ...overrides,
});

describe('Rule Engine — applyRules', () => {
  it('returns empty array when diff is empty', async () => {
    const { applyRules } = await import(ENGINE);
    const result = applyRules([makeRule()], '');
    assert.deepEqual(result, []);
  });

  it('returns empty array when no rules provided', async () => {
    const { applyRules } = await import(ENGINE);
    const result = applyRules([], '+console.log("hi");');
    assert.deepEqual(result, []);
  });

  it('matches pattern in added lines', async () => {
    const { applyRules } = await import(ENGINE);
    const diff = '+console.log("debug");';
    const result = applyRules([makeRule()], diff);
    assert.equal(result.length, 1);
    assert.equal(result[0].rule.id, 'test-rule');
    assert.ok(result[0].match.includes('console.log'));
  });

  it('does not match removed lines', async () => {
    const { applyRules } = await import(ENGINE);
    const diff = '-console.log("old");';
    const result = applyRules([makeRule()], diff);
    assert.equal(result.length, 0);
  });

  it('does not match context lines (no prefix)', async () => {
    const { applyRules } = await import(ENGINE);
    const diff = ' console.log("context");';
    const result = applyRules([makeRule()], diff);
    assert.equal(result.length, 0);
  });

  it('skips rule with invalid regex pattern', async () => {
    const { applyRules } = await import(ENGINE);
    const badRule = makeRule({ pattern: '[invalid' });
    const diff = '+[invalid pattern here';
    const result = applyRules([badRule], diff);
    assert.equal(result.length, 0);
  });

  it('matches multiple rules on same line', async () => {
    const { applyRules } = await import(ENGINE);
    const rules = [
      makeRule({ id: 'rule-1', pattern: 'console\\.log' }),
      makeRule({ id: 'rule-2', pattern: 'debug' }),
    ];
    const diff = '+console.log("debug info");';
    const result = applyRules(rules, diff);
    assert.equal(result.length, 2);
  });

  it('returns match object with rule, line, and match fields', async () => {
    const { applyRules } = await import(ENGINE);
    const diff = '+const x = console.log("test");';
    const result = applyRules([makeRule()], diff);
    assert.equal(result.length, 1);
    const m = result[0];
    assert.ok('rule' in m);
    assert.ok('line' in m);
    assert.ok('match' in m);
    assert.equal(typeof m.line, 'string');
    assert.equal(typeof m.match, 'string');
  });

  it('truncates long lines to 200 chars', async () => {
    const { applyRules } = await import(ENGINE);
    const longLine = '+console.log("' + 'x'.repeat(300) + '");';
    const result = applyRules([makeRule()], longLine);
    assert.ok(result[0].line.length <= 200);
  });
});

describe('Review Checklist — injectProjectRules', () => {
  it('creates project-rules category when rule has no category', async () => {
    const { CATEGORIES, injectProjectRules } = await import(CHECKLIST);
    // Remove project-rules if it exists from previous test runs
    delete CATEGORIES['project-rules'];

    const rule = makeRule({ id: 'no-cat', pattern: 'INJECT_TEST_UNIQUE_XYZ' });
    injectProjectRules([rule]);

    assert.ok('project-rules' in CATEGORIES, 'project-rules category should be created');
    const cat = CATEGORIES['project-rules'];
    assert.ok(cat.patterns.some(p => p.desc === rule.message));
  });

  it('appends pattern to existing category when category matches', async () => {
    const { CATEGORIES, injectProjectRules } = await import(CHECKLIST);
    const before = CATEGORIES['dead-code'].patterns.length;

    const rule = makeRule({
      id: 'custom-dead',
      pattern: 'CUSTOM_DEAD_CODE_MARKER',
      category: 'dead-code',
      message: 'Custom dead code pattern',
    });
    injectProjectRules([rule]);

    assert.ok(CATEGORIES['dead-code'].patterns.length > before);
    assert.ok(CATEGORIES['dead-code'].patterns.some(p => p.desc === 'Custom dead code pattern'));
  });

  it('injected pattern is detected by runChecklist', async () => {
    const { CATEGORIES, injectProjectRules, runChecklist } = await import(CHECKLIST);
    delete CATEGORIES['project-rules'];

    const rule = makeRule({
      id: 'detect-test',
      pattern: 'AING_DETECT_MARKER_9999',
      message: 'Test marker detected',
    });
    injectProjectRules([rule]);

    const diff = '+const x = AING_DETECT_MARKER_9999;';
    const results = runChecklist(diff);
    const found = results.find(r => r.category === 'project-rules');
    assert.ok(found, 'runChecklist should find project-rules category');
    assert.ok(found.findings.some(f => f.desc === 'Test marker detected'));
  });
});
