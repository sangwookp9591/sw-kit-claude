/**
 * aing Live Agent Monitor v1.0.0
 * Watches .aing/state/agent-live.jsonl for real-time agent activity.
 * Run in a separate terminal: node dist/scripts/monitor/live-monitor.js [--dir /path]
 * @module scripts/monitor/live-monitor
 */
interface LiveEvent {
    ts: string;
    agent: string;
    action: 'read' | 'write' | 'edit' | 'bash' | 'glob' | 'grep' | 'test' | 'status' | 'done' | 'error';
    target: string;
    detail?: string;
}
/**
 * Write a live event. Called by agent worker prompts via inline node -e.
 */
export declare function writeLiveEvent(projectDir: string, event: LiveEvent): void;
export {};
//# sourceMappingURL=live-monitor.d.ts.map