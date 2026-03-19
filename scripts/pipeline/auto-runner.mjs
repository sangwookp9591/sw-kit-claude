/**
 * sw-kit Auto Runner v1.3.0
 * Runtime execution of the full pipeline using CC native team tools.
 * Generates the exact TeamCreate→TaskCreate→Task(spawn) sequence.
 * @module scripts/pipeline/auto-runner
 */

import { selectTeam, generateWorkerPrompt, formatTeamSelection } from './team-orchestrator.mjs';
import { createCheckpoint } from './rollback.mjs';
import { updateProgress } from '../guardrail/progress-tracker.mjs';
import { createPlan } from '../task/plan-manager.mjs';
import { startPdca } from '../pdca/pdca-engine.mjs';
import { readStateOrDefault, writeState } from '../core/state.mjs';
import { createLogger } from '../core/logger.mjs';
import { join } from 'node:path';

const log = createLogger('auto-runner');

/**
 * Generate the full auto-run instruction set.
 * This produces the EXACT sequence of CC native tool calls the lead agent should execute.
 * @param {object} params
 * @param {string} params.feature - Feature name
 * @param {string} params.task - Task description
 * @param {object} [params.signals] - Complexity signals for team selection
 * @param {string} [projectDir]
 * @returns {object} Run plan with tool call sequence
 */
export function generateAutoRun(params, projectDir) {
  const dir = projectDir || process.cwd();
  const { feature, task, signals } = params;

  // 1. Select optimal team
  const selection = selectTeam(signals || {});
  const { team, preset } = selection;
  const teamSlug = feature.toLowerCase().replace(/[^a-z0-9]+/g, '-');

  // 2. Start PDCA
  startPdca(feature, dir);

  // 3. Create plan + tasks
  const steps = team.workers.map(w => `${w.role}: ${task}`);
  createPlan({ feature, goal: task, steps }, dir);

  // 4. Create checkpoint before execution
  createCheckpoint('pre-auto', dir);

  // 5. Build execution plan
  const runPlan = {
    feature,
    task,
    teamSlug,
    preset,
    selection: formatTeamSelection(selection),
    phases: []
  };

  // Phase 1: Create Team
  runPlan.phases.push({
    phase: 'create-team',
    description: '팀 생성',
    toolCalls: [{
      tool: 'TeamCreate',
      params: {
        team_name: teamSlug,
        description: `sw-kit auto: ${task}`
      }
    }]
  });

  // Phase 2: Create Tasks + Pre-assign
  const taskCalls = [];
  team.workers.forEach((worker, i) => {
    taskCalls.push({
      tool: 'TaskCreate',
      params: {
        subject: `[${worker.name}] ${worker.role}`,
        description: `${task}\n\nAgent: ${worker.agent}\nModel: ${worker.model}\nRole: ${worker.role}`,
        activeForm: `${worker.name} working on ${feature}`
      }
    });
  });

  // Add dependency: last worker (Proof) depends on all others
  if (team.workers.length > 1) {
    const lastIdx = team.workers.length;
    const blockIds = team.workers.slice(0, -1).map((_, i) => String(i + 1));
    taskCalls.push({
      tool: 'TaskUpdate',
      params: { taskId: String(lastIdx), addBlockedBy: blockIds }
    });
  }

  // Pre-assign owners
  team.workers.forEach((worker, i) => {
    taskCalls.push({
      tool: 'TaskUpdate',
      params: { taskId: String(i + 1), owner: worker.name }
    });
  });

  runPlan.phases.push({
    phase: 'create-tasks',
    description: `${team.workers.length}개 태스크 생성 + 할당`,
    toolCalls: taskCalls
  });

  // Phase 3: Spawn Workers (parallel)
  const spawnCalls = team.workers.map(worker => ({
    tool: 'Task',
    params: {
      subagent_type: `sw-kit:${worker.agent}`,
      team_name: teamSlug,
      name: worker.name,
      model: worker.model,
      prompt: generateWorkerPrompt({
        teamName: teamSlug,
        workerName: worker.name,
        role: worker.role,
        agent: worker.agent,
        tasks: [`${task}`]
      })
    },
    note: 'SPAWN IN PARALLEL — do not wait between workers'
  }));

  runPlan.phases.push({
    phase: 'spawn-workers',
    description: `${team.workers.length}명 워커 병렬 스폰`,
    toolCalls: spawnCalls
  });

  // Phase 4: Monitor
  runPlan.phases.push({
    phase: 'monitor',
    description: '워커 모니터링 (메시지 자동 수신 + TaskList 폴링)',
    toolCalls: [{ tool: 'TaskList', params: {}, note: '진행 상황 확인' }]
  });

  // Phase 5: Shutdown
  const shutdownCalls = team.workers.map(worker => ({
    tool: 'SendMessage',
    params: {
      to: worker.name,
      message: JSON.stringify({ type: 'shutdown_request', reason: 'All work complete' })
    }
  }));
  shutdownCalls.push({
    tool: 'TeamDelete',
    params: { team_name: teamSlug },
    note: 'ONLY after all shutdown_responses received'
  });

  runPlan.phases.push({
    phase: 'shutdown',
    description: '팀 종료 (순차: shutdown_request → response → TeamDelete)',
    toolCalls: shutdownCalls
  });

  // Save run plan
  const runPlanPath = join(dir, '.sw-kit', 'state', `auto-run-${teamSlug}.json`);
  writeState(runPlanPath, runPlan);

  updateProgress({
    feature,
    stage: 'plan',
    stepCurrent: 0,
    stepTotal: runPlan.phases.length,
    remaining: runPlan.phases.map(p => p.description),
    lastAction: `Auto pipeline planned: ${preset} (${team.workers.length}명)`
  }, dir);

  log.info('Auto run plan generated', { feature, preset, workers: team.workers.length });

  return runPlan;
}

/**
 * Format auto-run plan for display.
 * @param {object} runPlan
 * @returns {string}
 */
export function formatAutoRun(runPlan) {
  const lines = [
    `[sw-kit Auto] 🚀 ${runPlan.feature}`,
    '',
    runPlan.selection,
    '',
    '── Execution Plan ──'
  ];

  for (const phase of runPlan.phases) {
    const icon = {
      'create-team': '🏠',
      'create-tasks': '📋',
      'spawn-workers': '⚡',
      'monitor': '👀',
      'shutdown': '🏁'
    }[phase.phase] || '📌';

    lines.push(`  ${icon} ${phase.description} (${phase.toolCalls.length} calls)`);
  }

  const totalCalls = runPlan.phases.reduce((s, p) => s + p.toolCalls.length, 0);
  lines.push('');
  lines.push(`Total: ${totalCalls} tool calls, ${runPlan.phases.length} phases`);

  return lines.join('\n');
}
