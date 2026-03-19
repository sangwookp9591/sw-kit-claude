/**
 * sw-kit Dashboard v1.3.0
 * Real-time status display for hook responses.
 * @module scripts/core/dashboard
 */

import { readStateOrDefault } from './state.mjs';
import { getBudgetStatus } from './context-budget.mjs';
import { getTrackerStatus } from '../guardrail/safety-invariants.mjs';
import { C } from './display.mjs';
import { join } from 'node:path';

/**
 * Generate compact dashboard for hook additionalContext.
 * @param {string} [projectDir]
 * @returns {string} One-line status string
 */
export function compactDashboard(projectDir) {
  const dir = projectDir || process.cwd();
  const parts = [];

  // PDCA status
  const pdca = readStateOrDefault(join(dir, '.sw-kit', 'state', 'pdca-status.json'), null);
  if (pdca?.activeFeature) {
    const feat = pdca.features?.[pdca.activeFeature];
    const stageIcons = { plan: '📋', do: '⚡', check: '🔍', act: '🔄', review: '✅' };
    const icon = stageIcons[feat?.currentStage] || '📌';
    parts.push(`${icon}${pdca.activeFeature}:${feat?.currentStage || '?'}`);
  }

  // TDD phase
  const tdd = readStateOrDefault(join(dir, '.sw-kit', 'state', 'tdd-state.json'), null);
  if (tdd?.activeCycle && tdd.cycles?.[tdd.activeCycle]) {
    const phase = tdd.cycles[tdd.activeCycle].phase;
    const tddIcons = { red: '🔴', green: '🟢', refactor: '🔵' };
    parts.push(`${tddIcons[phase] || '⚪'}TDD`);
  }

  // Task progress
  const taskIndex = readStateOrDefault(join(dir, '.sw-kit', 'tasks', '_index.json'), []);
  const activeTasks = taskIndex.filter(t => t.status !== 'completed');
  if (activeTasks.length > 0) {
    parts.push(`📋${activeTasks.length} tasks`);
  }

  // Safety tracker
  const tracker = getTrackerStatus(dir);
  if (tracker) {
    parts.push(`⚙️${tracker.steps}`);
  }

  // Context budget
  const budget = getBudgetStatus();
  if (budget.total > 0) {
    parts.push(`~${budget.total}tok`);
  }

  // Pipeline status
  const pipeline = readStateOrDefault(join(dir, '.sw-kit', 'state', 'pipeline-state.json'), null);
  if (pipeline?.status === 'running') {
    const current = pipeline.stages?.[pipeline.currentStageIndex];
    parts.push(`🚀${current?.name || '?'}`);
  }

  // Circuit breaker warnings
  const circuits = readStateOrDefault(join(dir, '.sw-kit', 'state', 'circuit-breaker.json'), {});
  const openCircuits = Object.entries(circuits).filter(([_, c]) => c.state === 'open');
  if (openCircuits.length > 0) {
    parts.push(`⚠️${openCircuits.length} circuit(s) open`);
  }

  if (parts.length === 0) return '';

  return `[sw-kit] ${parts.join(' | ')}`;
}

/**
 * Generate full dashboard for /swkit status command.
 * @param {string} [projectDir]
 * @returns {string}
 */
export function fullDashboard(projectDir) {
  const dir = projectDir || process.cwd();
  const lines = [
    `${C.bold}${C.purple}[sw-kit Dashboard]${C.reset}`,
    `${C.dim}${'─'.repeat(40)}${C.reset}`
  ];

  // PDCA
  const pdca = readStateOrDefault(join(dir, '.sw-kit', 'state', 'pdca-status.json'), null);
  if (pdca?.activeFeature) {
    const feat = pdca.features?.[pdca.activeFeature];
    lines.push(`  📋 PDCA: ${pdca.activeFeature} → ${feat?.currentStage || '?'} (iter ${feat?.iteration || 0})`);
  } else {
    lines.push(`  📋 PDCA: inactive`);
  }

  // TDD
  const tdd = readStateOrDefault(join(dir, '.sw-kit', 'state', 'tdd-state.json'), null);
  if (tdd?.activeCycle) {
    const cycle = tdd.cycles?.[tdd.activeCycle];
    const icons = { red: '🔴', green: '🟢', refactor: '🔵' };
    lines.push(`  ${icons[cycle?.phase] || '⚪'} TDD: ${tdd.activeCycle} → ${cycle?.phase || '?'} (cycle #${cycle?.cycleCount || 0})`);
  }

  // Tasks
  const taskIndex = readStateOrDefault(join(dir, '.sw-kit', 'tasks', '_index.json'), []);
  const active = taskIndex.filter(t => t.status !== 'completed');
  const done = taskIndex.filter(t => t.status === 'completed');
  lines.push(`  📋 Tasks: ${active.length} active, ${done.length} completed`);

  // Safety
  const tracker = getTrackerStatus(dir);
  if (tracker) {
    lines.push(`  ⚙️ Steps: ${tracker.steps} | Files: ${tracker.fileChanges} | Errors: ${tracker.errors}`);
  }

  // Budget
  const budget = getBudgetStatus();
  lines.push(`  💰 Context: ~${budget.total} tokens (${budget.injections.length} injections)`);

  // Circuits
  const circuits = readStateOrDefault(join(dir, '.sw-kit', 'state', 'circuit-breaker.json'), {});
  const openCircuits = Object.entries(circuits).filter(([_, c]) => c.state === 'open');
  if (openCircuits.length > 0) {
    lines.push(`  ⚠️ Circuit Breakers: ${openCircuits.map(([k]) => k).join(', ')} OPEN`);
  }

  lines.push(`${C.dim}${'─'.repeat(40)}${C.reset}`);

  return lines.join('\n');
}
