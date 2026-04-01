/**
 * aing Rule Loader Test Suite
 * Tests JSON parsing, schema validation, and error handling.
 *
 * Run: node --test tests/rule-loader.test.mjs
 */
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const DIST = '../dist/scripts/rules/rule-loader.js';

describe('Rule Loader', () => {
  let tmpDir;

  before(() => {
    tmpDir = join(tmpdir(), `aing-rule-loader-test-${Date.now()}`);
    mkdirSync(tmpDir, { recursive: true });
  });

  after(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('loads valid rule from JSON file', async () => {
    const { loadProjectRules } = await import(DIST);
    const rule = {
      id: 'no-console',
      type: 'content',
      pattern: 'console\\.log',
      action: 'warn',
      severity: 'low',
      message: 'Avoid console.log in production code',
    };
    writeFileSync(join(tmpDir, 'no-console.json'), JSON.stringify(rule));

    const result = loadProjectRules(tmpDir);
    assert.equal(result.errors.length, 0);
    assert.equal(result.rules.length, 1);
    assert.equal(result.rules[0].id, 'no-console');
  });

  it('loads array of rules from a single JSON file', async () => {
    const { loadProjectRules } = await import(DIST);
    const dir = join(tmpDir, 'arr');
    mkdirSync(dir);
    const rules = [
      { id: 'r1', type: 'content', pattern: 'foo', action: 'warn', severity: 'low', message: 'msg1' },
      { id: 'r2', type: 'naming', pattern: 'bar', action: 'error', severity: 'high', message: 'msg2' },
    ];
    writeFileSync(join(dir, 'rules.json'), JSON.stringify(rules));

    const result = loadProjectRules(dir);
    assert.equal(result.errors.length, 0);
    assert.equal(result.rules.length, 2);
  });

  it('returns error for invalid JSON', async () => {
    const { loadProjectRules } = await import(DIST);
    const dir = join(tmpDir, 'invalid-json');
    mkdirSync(dir);
    writeFileSync(join(dir, 'bad.json'), '{ not valid json }');

    const result = loadProjectRules(dir);
    assert.equal(result.rules.length, 0);
    assert.equal(result.errors.length, 1);
    assert.ok(result.errors[0].error.includes('JSON parse error'));
  });

  it('returns error for rule missing required fields', async () => {
    const { loadProjectRules } = await import(DIST);
    const dir = join(tmpDir, 'missing-fields');
    mkdirSync(dir);
    // missing action, severity, message
    const incomplete = { id: 'x', type: 'content', pattern: 'foo' };
    writeFileSync(join(dir, 'incomplete.json'), JSON.stringify(incomplete));

    const result = loadProjectRules(dir);
    assert.equal(result.rules.length, 0);
    assert.ok(result.errors.length > 0);
    assert.ok(result.errors[0].error.includes('Validation failed'));
  });

  it('returns error for invalid type enum', async () => {
    const { loadProjectRules } = await import(DIST);
    const dir = join(tmpDir, 'bad-type');
    mkdirSync(dir);
    const bad = { id: 'x', type: 'unknown', pattern: 'foo', action: 'warn', severity: 'low', message: 'msg' };
    writeFileSync(join(dir, 'bad-type.json'), JSON.stringify(bad));

    const result = loadProjectRules(dir);
    assert.equal(result.rules.length, 0);
    assert.ok(result.errors[0].error.includes('Invalid type'));
  });

  it('continues loading remaining rules after one fails', async () => {
    const { loadProjectRules } = await import(DIST);
    const dir = join(tmpDir, 'mixed');
    mkdirSync(dir);
    // good file
    writeFileSync(join(dir, 'good.json'), JSON.stringify({
      id: 'good', type: 'content', pattern: 'x', action: 'warn', severity: 'low', message: 'ok',
    }));
    // bad file
    writeFileSync(join(dir, 'bad.json'), '{ broken }');

    const result = loadProjectRules(dir);
    assert.equal(result.rules.length, 1);
    assert.equal(result.errors.length, 1);
    assert.equal(result.rules[0].id, 'good');
  });

  it('returns empty result when directory does not exist', async () => {
    const { loadProjectRules } = await import(DIST);
    const result = loadProjectRules('/nonexistent/path/rules');
    assert.equal(result.rules.length, 0);
    assert.equal(result.errors.length, 0);
  });

  it('validates validateRule directly', async () => {
    const { validateRule } = await import(DIST);

    const good = { id: 'x', type: 'file', pattern: 'foo', action: 'error', severity: 'critical', message: 'msg' };
    assert.equal(validateRule(good).valid, true);

    assert.equal(validateRule(null).valid, false);
    assert.equal(validateRule('string').valid, false);

    const badAction = { ...good, action: 'noop' };
    const r = validateRule(badAction);
    assert.equal(r.valid, false);
    assert.ok(r.errors.some(e => e.includes('action')));
  });
});
