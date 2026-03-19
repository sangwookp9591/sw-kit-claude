/**
 * sw-kit Multi-Agent Pipeline v1.0.0
 * Automated agent chain: Scout → Archie → Bolt → Shield → Proof
 * Harness Engineering: Orchestrate axis — full automation.
 * @module scripts/pipeline/agent-pipeline
 */

import { readStateOrDefault, writeState } from '../core/state.mjs';
import { createLogger } from '../core/logger.mjs';
import { routeToAgent } from '../routing/model-router.mjs';
import { updateProgress } from '../guardrail/progress-tracker.mjs';
import { join } from 'node:path';

const log = createLogger('pipeline');

/**
 * Pipeline stage definitions.
 * Each stage maps to an agent with specific responsibilities.
 */
const PIPELINE_STAGES = [
  {
    id: 'explore',
    agent: 'explorer',
    name: 'Scout',
    emoji: '🔍',
    description: '코드베이스 탐색 및 구조 파악',
    pdcaStage: 'plan',
    intent: 'explore'
  },
  {
    id: 'plan',
    agent: 'planner',
    name: 'Archie',
    emoji: '📋',
    description: '작업 계획 수립 및 분해',
    pdcaStage: 'plan',
    intent: 'plan'
  },
  {
    id: 'execute',
    agent: 'executor',
    name: 'Bolt',
    emoji: '⚡',
    description: '코드 구현 및 수정',
    pdcaStage: 'do',
    intent: 'execute'
  },
  {
    id: 'review',
    agent: 'reviewer',
    name: 'Shield',
    emoji: '🛡️',
    description: '코드 리뷰 및 품질 검증',
    pdcaStage: 'check',
    intent: 'review'
  },
  {
    id: 'verify',
    agent: 'verifier',
    name: 'Proof',
    emoji: '✅',
    description: '증거 체인으로 완료 증명',
    pdcaStage: 'review',
    intent: 'verify'
  }
];

function getPipelinePath(projectDir) {
  return join(projectDir || process.cwd(), '.sw-kit', 'state', 'pipeline-state.json');
}

/**
 * Initialize a new pipeline run.
 * @param {string} feature - Feature name
 * @param {string} task - Task description
 * @param {object} [options]
 * @param {boolean} [options.skipExplore] - Skip exploration phase
 * @param {string} [projectDir]
 * @returns {{ ok: boolean, pipeline: object }}
 */
export function initPipeline(feature, task, options = {}, projectDir) {
  const stages = options.skipExplore
    ? PIPELINE_STAGES.filter(s => s.id !== 'explore')
    : [...PIPELINE_STAGES];

  const pipeline = {
    id: `pipe-${Date.now()}`,
    feature,
    task,
    status: 'running',
    currentStageIndex: 0,
    stages: stages.map(s => ({
      ...s,
      status: 'pending',
      startedAt: null,
      completedAt: null,
      result: null
    })),
    startedAt: new Date().toISOString(),
    completedAt: null,
    rollbackPoint: null
  };

  const result = writeState(getPipelinePath(projectDir), pipeline);
  if (result.ok) {
    log.info(`Pipeline initialized: ${feature}`, { stages: stages.length, task });
    updateProgress({
      feature,
      stage: stages[0].pdcaStage,
      stepCurrent: 0,
      stepTotal: stages.length,
      remaining: stages.map(s => `${s.emoji} ${s.name}: ${s.description}`),
      lastAction: 'Pipeline initialized'
    }, projectDir);
  }

  return { ok: result.ok, pipeline };
}

/**
 * Get current pipeline state.
 * @param {string} [projectDir]
 * @returns {object|null}
 */
export function getPipelineState(projectDir) {
  return readStateOrDefault(getPipelinePath(projectDir), null);
}

/**
 * Advance pipeline to next stage.
 * @param {string} result - Result of current stage ('pass'|'fail')
 * @param {object} [data] - Stage output data
 * @param {string} [projectDir]
 * @returns {{ ok: boolean, nextStage?: object, completed?: boolean, message: string }}
 */
export function advancePipeline(result, data, projectDir) {
  const pipelinePath = getPipelinePath(projectDir);
  const pipeline = readStateOrDefault(pipelinePath, null);
  if (!pipeline || pipeline.status !== 'running') {
    return { ok: false, message: '활성 파이프라인이 없습니다.' };
  }

  const currentStage = pipeline.stages[pipeline.currentStageIndex];
  currentStage.status = result === 'pass' ? 'completed' : 'failed';
  currentStage.completedAt = new Date().toISOString();
  currentStage.result = { outcome: result, data };

  // If review (Shield) fails with critical issues → trigger rollback
  if (currentStage.id === 'review' && result === 'fail') {
    pipeline.status = 'rollback-needed';
    writeState(pipelinePath, pipeline);
    return {
      ok: true,
      message: `${currentStage.emoji} ${currentStage.name}: Critical 이슈 발견. 롤백이 필요합니다. "/swkit rollback"을 실행하세요.`
    };
  }

  // Advance to next stage
  pipeline.currentStageIndex++;

  if (pipeline.currentStageIndex >= pipeline.stages.length) {
    // Pipeline complete
    pipeline.status = 'completed';
    pipeline.completedAt = new Date().toISOString();
    writeState(pipelinePath, pipeline);

    updateProgress({
      feature: pipeline.feature,
      stage: 'completed',
      stepCurrent: pipeline.stages.length,
      stepTotal: pipeline.stages.length,
      completed: pipeline.stages.map(s => `${s.emoji} ${s.name}: ${s.result?.outcome || 'done'}`),
      lastAction: 'Pipeline completed!'
    }, projectDir);

    return { ok: true, completed: true, message: `🎉 파이프라인 완료! 모든 단계가 통과되었습니다.` };
  }

  const nextStage = pipeline.stages[pipeline.currentStageIndex];
  nextStage.status = 'active';
  nextStage.startedAt = new Date().toISOString();

  // Save rollback point before execute stage
  if (nextStage.id === 'execute') {
    pipeline.rollbackPoint = new Date().toISOString();
  }

  writeState(pipelinePath, pipeline);

  const completed = pipeline.stages.filter(s => s.status === 'completed');
  const remaining = pipeline.stages.filter(s => s.status === 'pending');

  updateProgress({
    feature: pipeline.feature,
    stage: nextStage.pdcaStage,
    stepCurrent: pipeline.currentStageIndex,
    stepTotal: pipeline.stages.length,
    completed: completed.map(s => `${s.emoji} ${s.name}`),
    remaining: remaining.map(s => `${s.emoji} ${s.name}: ${s.description}`),
    lastAction: `${nextStage.emoji} ${nextStage.name} 시작`
  }, projectDir);

  // Get optimal model for next stage
  const routing = routeToAgent(nextStage.intent);

  return {
    ok: true,
    nextStage: { ...nextStage, model: routing.model },
    message: `${nextStage.emoji} ${nextStage.name} (${routing.model}) — ${nextStage.description}`
  };
}

/**
 * Format pipeline status for display.
 * @param {string} [projectDir]
 * @returns {string}
 */
export function formatPipelineStatus(projectDir) {
  const pipeline = getPipelineState(projectDir);
  if (!pipeline) return '[sw-kit Pipeline] 활성 파이프라인이 없습니다.';

  const lines = [
    `[sw-kit Pipeline] ${pipeline.feature}`,
    `Status: ${pipeline.status}`,
    ''
  ];

  for (let i = 0; i < pipeline.stages.length; i++) {
    const s = pipeline.stages[i];
    const icon = s.status === 'completed' ? '✓' :
                 s.status === 'active' ? '►' :
                 s.status === 'failed' ? '✗' : '○';
    const tag = i === pipeline.currentStageIndex && pipeline.status === 'running' ? ' ← NOW' : '';
    lines.push(`  ${icon} ${s.emoji} ${s.name}: ${s.description}${tag}`);
  }

  return lines.join('\n');
}

/**
 * Get pipeline stage definitions.
 */
export function getStages() {
  return [...PIPELINE_STAGES];
}
