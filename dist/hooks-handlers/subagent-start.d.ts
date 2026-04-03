/**
 * aing SubagentStart Hook Handler v2.0.0
 * Tracks agent spawn events: name, subagent_type, model, timestamp.
 * Appends to .aing/state/agent-trace.json and reports active agent count.
 *
 * Claude Code SubagentStart hook input:
 *   { agent_id, agent_type, session_id, cwd, hook_event_name }
 *   - agent_type = subagent_type passed to Agent() (e.g. "aing:jay")
 *   - agent_id = unique Claude Code agent identifier
 */
export {};
//# sourceMappingURL=subagent-start.d.ts.map