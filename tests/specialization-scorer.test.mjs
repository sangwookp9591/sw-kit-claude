import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { scoreSpecialization, recommendAgent } from '../dist/scripts/agent-intelligence/specialization-scorer.js';

/** @returns {import('../dist/scripts/agent-intelligence/feedback-loop.js').AgentPerformance} */
function makePerf(agent, { totalTasks = 0, completionRate = 0, avgReviewScore = 0, domains = {} } = {}) {
  return { agent, totalTasks, completionRate, avgReviewScore, domains };
}

describe('scoreSpecialization', () => {
  it('기본 스코어 산출 — formula: completionRate*0.4 + avgReviewScore*0.4 + domainExp*0.2', () => {
    const perf = makePerf('builder', {
      totalTasks: 10,
      completionRate: 80,
      avgReviewScore: 90,
      domains: { build: 5, general: 5 },
    });
    const spec = scoreSpecialization(perf, 'build');
    // domainExperience = 5/10 * 100 = 50
    // score = 80*0.4 + 90*0.4 + 50*0.2 = 32 + 36 + 10 = 78
    assert.strictEqual(spec.score, 78);
    assert.strictEqual(spec.domain, 'build');
    assert.strictEqual(spec.agent, 'builder');
  });

  it('confidence = min(totalTasks * 10, 100)', () => {
    const perf5 = makePerf('a', { totalTasks: 5 });
    assert.strictEqual(scoreSpecialization(perf5, 'build').confidence, 50);

    const perf10 = makePerf('b', { totalTasks: 10 });
    assert.strictEqual(scoreSpecialization(perf10, 'build').confidence, 100);

    const perf20 = makePerf('c', { totalTasks: 20 });
    assert.strictEqual(scoreSpecialization(perf20, 'build').confidence, 100);
  });

  it('cold-start: taskCount < 3 → confidence < 30', () => {
    const perf = makePerf('newbie', { totalTasks: 2 });
    const spec = scoreSpecialization(perf, 'build');
    assert.ok(spec.confidence < 30, `confidence should be < 30, got ${spec.confidence}`);
  });

  it('도메인 태스크 0개면 domainExperience = 0', () => {
    const perf = makePerf('researcher', {
      totalTasks: 10,
      completionRate: 100,
      avgReviewScore: 100,
      domains: { research: 10 },
    });
    const spec = scoreSpecialization(perf, 'build');
    // domainExperience = 0/10*100 = 0
    // score = 100*0.4 + 100*0.4 + 0*0.2 = 80
    assert.strictEqual(spec.score, 80);
  });

  it('totalTasks = 0이면 score = 0, confidence = 0', () => {
    const perf = makePerf('empty-agent');
    const spec = scoreSpecialization(perf, 'build');
    assert.strictEqual(spec.score, 0);
    assert.strictEqual(spec.confidence, 0);
  });
});

describe('recommendAgent', () => {
  it('스코어 내림차순으로 정렬한다', () => {
    const performances = [
      makePerf('low-scorer', { totalTasks: 10, completionRate: 50, avgReviewScore: 50, domains: { build: 5 } }),
      makePerf('high-scorer', { totalTasks: 10, completionRate: 90, avgReviewScore: 90, domains: { build: 8 } }),
      makePerf('mid-scorer', { totalTasks: 10, completionRate: 70, avgReviewScore: 70, domains: { build: 5 } }),
    ];
    const result = recommendAgent(performances, 'build');
    assert.strictEqual(result[0].agent, 'high-scorer');
    assert.strictEqual(result[result.length - 1].agent, 'low-scorer');
  });

  it('cold-start 에이전트(taskCount < 3)는 뒤로 밀린다', () => {
    const performances = [
      makePerf('cold-start', { totalTasks: 1, completionRate: 100, avgReviewScore: 100, domains: { build: 1 } }),
      makePerf('experienced', { totalTasks: 5, completionRate: 60, avgReviewScore: 60, domains: { build: 2 } }),
    ];
    const result = recommendAgent(performances, 'build');
    assert.strictEqual(result[0].agent, 'experienced');
    assert.strictEqual(result[result.length - 1].agent, 'cold-start');
  });

  it('빈 performances 배열이면 빈 배열을 반환한다', () => {
    const result = recommendAgent([], 'build');
    assert.deepStrictEqual(result, []);
  });

  it('score 필드가 포함된다', () => {
    const performances = [
      makePerf('agent-x', { totalTasks: 10, completionRate: 80, avgReviewScore: 70, domains: { research: 5 } }),
    ];
    const result = recommendAgent(performances, 'research');
    assert.ok(typeof result[0].score === 'number');
    assert.ok(result[0].score >= 0 && result[0].score <= 100);
  });
});
