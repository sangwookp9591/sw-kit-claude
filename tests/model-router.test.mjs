import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { routeModel, getCostMode } from '../dist/scripts/routing/model-router.js';

describe('Model Router', () => {
  it('should return agent default when no signals', () => {
    const result = routeModel('klay');
    assert.equal(result.model, 'opus');
    assert.equal(result.reason, 'agent-default');
  });

  it('should return sonnet for unknown agents', () => {
    const result = routeModel('unknown-agent');
    assert.equal(result.model, 'sonnet');
  });

  it('should stay opus for high complexity (jay defaults opus)', () => {
    const result = routeModel('jay', { fileCount: 25, domainCount: 4 });
    assert.equal(result.model, 'opus');
  });

  it('should stay opus for security signals (jay defaults opus)', () => {
    const result = routeModel('jay', { hasSecurity: true });
    assert.equal(result.model, 'opus');
  });

  it('should stay opus for architecture changes (derek defaults opus)', () => {
    const result = routeModel('derek', { hasArchChange: true });
    assert.equal(result.model, 'opus');
  });

  it('should escalate sonnet agents to opus for security signals', () => {
    const result = routeModel('willji', { hasSecurity: true });
    assert.equal(result.model, 'opus');
    assert.equal(result.escalated, true);
    assert.match(result.reason, /security/);
  });

  it('should honor user forceModel override', () => {
    const result = routeModel('klay', { hasSecurity: true }, { forceModel: 'haiku' });
    assert.equal(result.model, 'haiku');
    assert.equal(result.reason, 'user-override');
  });

  it('should downgrade klay to sonnet in plan-review context', () => {
    const result = routeModel('klay', {}, { context: 'plan-review' });
    assert.equal(result.model, 'sonnet');
    assert.equal(result.reason, 'plan-review-optimization');
  });

  it('should downgrade sam to haiku in verify context for non-high', () => {
    const result = routeModel('sam', { fileCount: 2 }, { context: 'verify' });
    assert.equal(result.model, 'haiku');
  });

  it('should keep sam opus in verify context for high complexity', () => {
    const result = routeModel('sam', { fileCount: 25, domainCount: 4 }, { context: 'verify' });
    assert.equal(result.model, 'opus');
  });

  it('should apply budget cost mode downgrade', () => {
    const result = routeModel('klay', { fileCount: 2 }, { costMode: 'budget' });
    assert.equal(result.model, 'sonnet'); // opus→sonnet in budget
  });

  it('should not downgrade when risk-escalated even in budget mode', () => {
    const result = routeModel('jay', { hasSecurity: true }, { costMode: 'budget' });
    assert.equal(result.model, 'opus'); // escalated, not downgraded
  });

  it('should apply balanced mode: opus→sonnet for low complexity', () => {
    const result = routeModel('klay', { fileCount: 1 }, { costMode: 'balanced' });
    assert.equal(result.model, 'sonnet');
  });
});

describe('getCostMode', () => {
  it('should return balanced by default', () => {
    delete process.env.SWKIT_COST_MODE;
    assert.equal(getCostMode(), 'balanced');
  });
});
