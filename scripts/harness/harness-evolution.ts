/**
 * aing Harness Evolution — Version tracking + A/B comparison
 * Snapshots harness configurations and tracks metrics over time.
 * @module scripts/harness/harness-evolution
 */

import { existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { createLogger } from '../core/logger.js';
import { readStateOrDefault, writeState } from '../core/state.js';
import { sanitizeFeature } from '../core/path-utils.js';
import type {
  HarnessConfig,
  HarnessVersion,
  HarnessMetrics,
  VersionComparison,
} from './harness-types.js';

const log = createLogger('harness-evolution');

// ─── Paths ──────────────────────────────────────────────────────

function historyDir(projectDir: string, feature: string): string {
  return join(projectDir, '.aing', 'harness-history', sanitizeFeature(feature));
}

function versionPath(projectDir: string, feature: string, version: number): string {
  return join(historyDir(projectDir, feature), `v${version}.json`);
}

function indexPath(projectDir: string, feature: string): string {
  return join(historyDir(projectDir, feature), 'versions.json');
}

// ─── Snapshot ───────────────────────────────────────────────────

export function snapshotHarness(
  feature: string,
  config: HarnessConfig,
  projectDir: string,
): string {
  const dir = historyDir(projectDir, feature);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

  const versions = getVersionList(projectDir, feature);
  const nextVersion = versions.length > 0 ? Math.max(...versions.map(v => v.version)) + 1 : 1;

  const snapshot: HarnessVersion = {
    id: `${sanitizeFeature(feature)}-v${nextVersion}`,
    feature,
    version: nextVersion,
    config: {
      ...config,
      // Strip file contents to save space
      agents: config.agents.map(a => ({
        ...a,
        role: a.role.slice(0, 3),
        principles: a.principles.slice(0, 3),
      })),
    },
    createdAt: new Date().toISOString(),
  };

  writeState(versionPath(projectDir, feature, nextVersion), snapshot);

  // Update index
  versions.push(snapshot);
  writeState(indexPath(projectDir, feature), versions);

  log.info('Harness snapshot created', { feature, version: nextVersion });
  return snapshot.id;
}

// ─── Record Metrics ─────────────────────────────────────────────

export function recordMetrics(
  feature: string,
  versionId: string,
  metrics: HarnessMetrics,
  projectDir: string,
): void {
  const versions = getVersionList(projectDir, feature);
  const version = versions.find(v => v.id === versionId);
  if (!version) {
    log.warn('Version not found for metrics', { feature, versionId });
    return;
  }

  version.metrics = metrics;

  // Update both the version file and index
  writeState(versionPath(projectDir, feature, version.version), version);
  writeState(indexPath(projectDir, feature), versions);

  log.info('Metrics recorded', { feature, versionId, quality: metrics.quality });
}

// ─── Compare Versions ───────────────────────────────────────────

export function compareVersions(
  feature: string,
  v1Num: number,
  v2Num: number,
  projectDir: string,
): VersionComparison | null {
  const versions = getVersionList(projectDir, feature);
  const v1 = versions.find(v => v.version === v1Num);
  const v2 = versions.find(v => v.version === v2Num);

  if (!v1 || !v2) {
    log.warn('Version not found for comparison', { feature, v1: v1Num, v2: v2Num });
    return null;
  }

  const structureDiff: string[] = [];

  // Compare agent count
  const a1 = v1.config.agents.length;
  const a2 = v2.config.agents.length;
  if (a1 !== a2) structureDiff.push(`에이전트 수: ${a1} → ${a2}`);

  // Compare pattern
  if (v1.config.pattern !== v2.config.pattern) {
    structureDiff.push(`패턴: ${v1.config.pattern} → ${v2.config.pattern}`);
  }

  // Compare execution mode
  if (v1.config.executionMode !== v2.config.executionMode) {
    structureDiff.push(`실행 모드: ${v1.config.executionMode} → ${v2.config.executionMode}`);
  }

  // Compare agent names
  const names1 = new Set(v1.config.agents.map(a => a.name));
  const names2 = new Set(v2.config.agents.map(a => a.name));
  const added = [...names2].filter(n => !names1.has(n));
  const removed = [...names1].filter(n => !names2.has(n));
  if (added.length) structureDiff.push(`추가 에이전트: ${added.join(', ')}`);
  if (removed.length) structureDiff.push(`제거 에이전트: ${removed.join(', ')}`);

  // Compare metrics
  const metricsDelta: Partial<Record<keyof HarnessMetrics, number>> = {};
  if (v1.metrics && v2.metrics) {
    if (v1.metrics.quality !== undefined && v2.metrics.quality !== undefined) {
      metricsDelta.quality = v2.metrics.quality - v1.metrics.quality;
    }
    if (v1.metrics.tokens !== undefined && v2.metrics.tokens !== undefined) {
      metricsDelta.tokens = v2.metrics.tokens - v1.metrics.tokens;
    }
    if (v1.metrics.duration !== undefined && v2.metrics.duration !== undefined) {
      metricsDelta.duration = v2.metrics.duration - v1.metrics.duration;
    }
  }

  // Determine verdict
  let verdict: 'improved' | 'regressed' | 'neutral' = 'neutral';
  if (metricsDelta.quality !== undefined) {
    verdict = metricsDelta.quality > 0 ? 'improved' : metricsDelta.quality < 0 ? 'regressed' : 'neutral';
  }

  return { v1, v2, structureDiff, metricsDelta, verdict };
}

// ─── Auto-evolution Suggestions ─────────────────────────────────

export interface EvolutionSuggestion {
  area: string;           // 'agents' | 'routing' | 'pipeline'
  suggestion: string;
  evidence: string;       // metrics diff
  confidence: number;     // 0-100
}

export function suggestEvolution(
  feature: string,
  projectDir: string,
): EvolutionSuggestion[] {
  const versions = getVersionList(projectDir, feature);

  // Need at least 2 versions with metrics to compare
  const withMetrics = versions.filter(v => v.metrics !== undefined);
  if (withMetrics.length < 2) {
    log.info('Not enough versioned metrics for evolution suggestion', { feature, count: withMetrics.length });
    return [];
  }

  // Use the two most recent metric-bearing versions
  const v1 = withMetrics[withMetrics.length - 2];
  const v2 = withMetrics[withMetrics.length - 1];
  const m1 = v1.metrics!;
  const m2 = v2.metrics!;

  const suggestions: EvolutionSuggestion[] = [];

  const qualityDelta = m2.quality - m1.quality;
  const tokensDelta = m2.tokens - m1.tokens;
  const durationDelta = m2.duration - m1.duration;

  // quality 상승 + tokens 감소 → "이 패턴 유지" 제안
  if (qualityDelta > 0 && tokensDelta < 0) {
    suggestions.push({
      area: 'agents',
      suggestion: `v${v2.version} 에이전트 구성을 유지하세요. 품질 향상과 토큰 절감이 동시에 달성되었습니다.`,
      evidence: `quality: +${qualityDelta}, tokens: ${Math.round(tokensDelta / 1000)}k`,
      confidence: Math.min(95, 60 + qualityDelta * 2 + Math.abs(tokensDelta) / 1000),
    });
  }

  // quality 하락 → "이전 버전 에이전트 구성으로 롤백" 제안
  if (qualityDelta < 0) {
    suggestions.push({
      area: 'agents',
      suggestion: `v${v1.version} 에이전트 구성으로 롤백하세요. 품질이 하락했습니다.`,
      evidence: `quality: ${qualityDelta}, v${v1.version} quality=${m1.quality} → v${v2.version} quality=${m2.quality}`,
      confidence: Math.min(95, 50 + Math.abs(qualityDelta) * 3),
    });
  }

  // routing 제안: duration 증가가 크면 병렬화 추천
  if (durationDelta > 5000) {
    suggestions.push({
      area: 'routing',
      suggestion: '실행 시간이 증가했습니다. 에이전트를 병렬 실행 모드(fanout)로 전환을 고려하세요.',
      evidence: `duration: +${Math.round(durationDelta / 1000)}s (v${v1.version}→v${v2.version})`,
      confidence: 60,
    });
  }

  // pipeline 제안: tokens 급증 시 파이프라인 최적화 추천
  if (tokensDelta > 50000) {
    suggestions.push({
      area: 'pipeline',
      suggestion: '토큰 소비가 급증했습니다. 중간 결과물 캐싱 또는 스테이지 분리를 고려하세요.',
      evidence: `tokens: +${Math.round(tokensDelta / 1000)}k (v${v1.version}→v${v2.version})`,
      confidence: 55,
    });
  }

  log.info('Evolution suggestions generated', { feature, count: suggestions.length });
  return suggestions;
}

// ─── Auto-Compare ──────────────────────────────────────────────

export interface AutoCompareResult {
  comparison: VersionComparison | null;
  suggestions: EvolutionSuggestion[];
  verdict: 'improved' | 'regressed' | 'neutral' | 'insufficient-data';
}

/**
 * Auto-compare latest two versions and generate improvement suggestions.
 * Combines compareVersions + suggestEvolution into a single call.
 */
export function autoCompare(feature: string, projectDir: string): AutoCompareResult {
  const versions = getVersionList(projectDir, feature);

  if (versions.length < 2) {
    return {
      comparison: null,
      suggestions: [],
      verdict: 'insufficient-data',
    };
  }

  const latest = versions[versions.length - 1];
  const previous = versions[versions.length - 2];
  const comparison = compareVersions(feature, previous.version, latest.version, projectDir);
  const suggestions = suggestEvolution(feature, projectDir);

  const verdict = comparison?.verdict ?? 'neutral';

  log.info('Auto-compare complete', { feature, verdict, suggestions: suggestions.length });

  return { comparison, suggestions, verdict };
}

// ─── History ────────────────────────────────────────────────────

export function getVersionList(projectDir: string, feature: string): HarnessVersion[] {
  const path = indexPath(projectDir, feature);
  return readStateOrDefault(path, []) as HarnessVersion[];
}

export function getLatestVersion(projectDir: string, feature: string): HarnessVersion | null {
  const versions = getVersionList(projectDir, feature);
  return versions.length > 0 ? versions[versions.length - 1] : null;
}

// ─── Display ────────────────────────────────────────────────────

export function formatHistory(feature: string, versions: HarnessVersion[]): string {
  const lines: string[] = [
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
    `  aing harness log: ${feature}`,
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
    '',
    '  Ver  Agents  Pattern        Quality  Tokens   Date',
    '  ───  ──────  ───────        ───────  ──────   ────',
  ];

  for (const v of versions) {
    const agents = String(v.config.agents.length).padEnd(8);
    const pattern = v.config.pattern.padEnd(15);
    const quality = v.metrics?.quality !== undefined ? String(v.metrics.quality).padEnd(9) : '-'.padEnd(9);
    const tokens = v.metrics?.tokens !== undefined ? `${Math.round(v.metrics.tokens / 1000)}k`.padEnd(9) : '-'.padEnd(9);
    const date = v.createdAt.slice(0, 10);
    lines.push(`  v${v.version}   ${agents}${pattern}${quality}${tokens}${date}`);
  }

  lines.push('');
  lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  return lines.join('\n');
}

export function formatComparison(comp: VersionComparison): string {
  const icon = comp.verdict === 'improved' ? '↑' : comp.verdict === 'regressed' ? '↓' : '→';
  const lines: string[] = [
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
    `  aing harness log: v${comp.v1.version} vs v${comp.v2.version} ${icon}`,
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
    '',
  ];

  if (comp.structureDiff.length) {
    lines.push('  구조 변경:');
    for (const diff of comp.structureDiff) lines.push(`    ${diff}`);
    lines.push('');
  }

  if (Object.keys(comp.metricsDelta).length) {
    lines.push('  메트릭 비교:');
    if (comp.metricsDelta.quality !== undefined) {
      const sign = comp.metricsDelta.quality > 0 ? '+' : '';
      lines.push(`    품질: ${sign}${comp.metricsDelta.quality}`);
    }
    if (comp.metricsDelta.tokens !== undefined) {
      const sign = comp.metricsDelta.tokens > 0 ? '+' : '';
      lines.push(`    토큰: ${sign}${Math.round(comp.metricsDelta.tokens / 1000)}k`);
    }
    if (comp.metricsDelta.duration !== undefined) {
      const sign = comp.metricsDelta.duration > 0 ? '+' : '';
      lines.push(`    시간: ${sign}${comp.metricsDelta.duration}ms`);
    }
    lines.push('');
  }

  lines.push(`  판정: ${comp.verdict.toUpperCase()}`);
  lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  return lines.join('\n');
}
