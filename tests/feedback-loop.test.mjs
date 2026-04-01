import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, rmSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { recordFeedback, getAgentPerformance, getAllPerformances } from '../dist/scripts/agent-intelligence/feedback-loop.js';

const TEST_DIR = join(tmpdir(), `aing-feedback-test-${Date.now()}`);

before(() => {
  mkdirSync(TEST_DIR, { recursive: true });
});

after(() => {
  rmSync(TEST_DIR, { recursive: true, force: true });
});

describe('recordFeedback', () => {
  it('JSONL 파일에 피드백을 기록한다', () => {
    const feedback = {
      agent: 'builder',
      task: '빌드 작업',
      timestamp: new Date().toISOString(),
      metrics: { taskCompleted: true, reviewScore: 85, duration: 1200 },
    };
    recordFeedback(TEST_DIR, feedback);

    const feedbackFile = join(TEST_DIR, '.aing/agent-feedback/builder.json');
    assert.ok(existsSync(feedbackFile), 'feedback 파일이 생성되어야 한다');
  });

  it('여러 피드백을 append한다', () => {
    const feedbacks = [
      { agent: 'tester', task: 'build 테스트', timestamp: new Date().toISOString(), metrics: { taskCompleted: true, testsPassed: 10, testsFailed: 0 } },
      { agent: 'tester', task: 'implement 구현', timestamp: new Date().toISOString(), metrics: { taskCompleted: false, reviewScore: 60 } },
    ];
    for (const f of feedbacks) recordFeedback(TEST_DIR, f);

    const content = readFileSync(join(TEST_DIR, '.aing/agent-feedback/tester.json'), 'utf8');
    const lines = content.trim().split('\n').filter(Boolean);
    assert.strictEqual(lines.length, 2);
  });
});

describe('getAgentPerformance', () => {
  it('존재하지 않는 에이전트는 빈 성과를 반환한다', () => {
    const perf = getAgentPerformance(TEST_DIR, 'nonexistent-agent');
    assert.strictEqual(perf.totalTasks, 0);
    assert.strictEqual(perf.completionRate, 0);
    assert.strictEqual(perf.avgReviewScore, 0);
    assert.deepStrictEqual(perf.domains, {});
  });

  it('completionRate를 올바르게 집계한다', () => {
    const agent = 'perf-agent';
    const tasks = [
      { agent, task: '빌드 작업', timestamp: new Date().toISOString(), metrics: { taskCompleted: true, reviewScore: 90 } },
      { agent, task: '구현 작업', timestamp: new Date().toISOString(), metrics: { taskCompleted: true, reviewScore: 80 } },
      { agent, task: '리서치 작업', timestamp: new Date().toISOString(), metrics: { taskCompleted: false } },
      { agent, task: 'build 작업', timestamp: new Date().toISOString(), metrics: { taskCompleted: true, reviewScore: 70 } },
    ];
    for (const t of tasks) recordFeedback(TEST_DIR, t);

    const perf = getAgentPerformance(TEST_DIR, agent);
    assert.strictEqual(perf.totalTasks, 4);
    assert.strictEqual(perf.completionRate, 75); // 3/4 = 75%
    assert.strictEqual(perf.avgReviewScore, 80); // (90+80+70)/3 = 80
  });

  it('domains를 올바르게 분류한다', () => {
    const agent = 'domain-agent';
    const tasks = [
      { agent, task: 'research 조사', timestamp: new Date().toISOString(), metrics: { taskCompleted: true } },
      { agent, task: '리서치 작업', timestamp: new Date().toISOString(), metrics: { taskCompleted: true } },
      { agent, task: 'code review 작업', timestamp: new Date().toISOString(), metrics: { taskCompleted: true } },
      { agent, task: '빌드 build 작업', timestamp: new Date().toISOString(), metrics: { taskCompleted: true } },
    ];
    for (const t of tasks) recordFeedback(TEST_DIR, t);

    const perf = getAgentPerformance(TEST_DIR, agent);
    assert.strictEqual(perf.domains['research'], 2);
    assert.strictEqual(perf.domains['review'], 1);
    assert.strictEqual(perf.domains['build'], 1);
  });
});

describe('getAllPerformances', () => {
  it('빈 디렉토리면 빈 배열을 반환한다', () => {
    const emptyDir = join(tmpdir(), `aing-empty-${Date.now()}`);
    mkdirSync(emptyDir, { recursive: true });
    const result = getAllPerformances(emptyDir);
    assert.deepStrictEqual(result, []);
    rmSync(emptyDir, { recursive: true, force: true });
  });

  it('모든 에이전트 성과를 반환한다', () => {
    const multiDir = join(tmpdir(), `aing-multi-${Date.now()}`);
    mkdirSync(multiDir, { recursive: true });
    recordFeedback(multiDir, { agent: 'alpha', task: '작업', timestamp: new Date().toISOString(), metrics: { taskCompleted: true } });
    recordFeedback(multiDir, { agent: 'beta', task: '작업', timestamp: new Date().toISOString(), metrics: { taskCompleted: false } });

    const perfs = getAllPerformances(multiDir);
    assert.strictEqual(perfs.length, 2);
    const agents = perfs.map(p => p.agent).sort();
    assert.deepStrictEqual(agents, ['alpha', 'beta']);
    rmSync(multiDir, { recursive: true, force: true });
  });
});
