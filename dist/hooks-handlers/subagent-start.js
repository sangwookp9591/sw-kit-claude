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
import { readStdinJSON } from '../scripts/core/stdin.js';
import { updateState, readStateOrDefault } from '../scripts/core/state.js';
import { createLogger } from '../scripts/core/logger.js';
import { registerWorker } from '../scripts/pipeline/team-heartbeat.js';
import { join } from 'node:path';
const log = createLogger('subagent-start');
function getAgentTracePath(projectDir) {
    return join(projectDir, '.aing', 'state', 'agent-trace.json');
}
function makeAgentId(subagentType, ts) {
    const suffix = ts.replace(/[^0-9]/g, '').slice(-8);
    return `${subagentType.replace(/[^a-z0-9]/gi, '-')}-${suffix}`;
}
const parsed = await readStdinJSON();
const projectDir = process.env.PROJECT_DIR || process.cwd();
try {
    const toolInput = parsed.tool_input || {};
    // Claude Code provides agent_type at top level (e.g. "aing:jay")
    const subagentType = parsed.agent_type || toolInput.subagent_type || 'unknown';
    const model = toolInput.model || 'sonnet';
    const description = toolInput.description || '';
    const ccAgentId = parsed.agent_id || '';
    // Extract agent name from agent_type prefix
    let agentName = toolInput.name || '';
    if (!agentName && subagentType !== 'unknown') {
        agentName = subagentType.replace(/^aing:/, '');
    }
    if (!agentName || agentName === 'unknown') {
        const descMatch = description.match(/^(\w+)\s*[:\-—]/);
        if (descMatch)
            agentName = descMatch[1].toLowerCase();
        else
            agentName = 'unknown';
    }
    const spawnedAt = new Date().toISOString();
    const agentId = makeAgentId(subagentType, spawnedAt);
    const tracePath = getAgentTracePath(projectDir);
    const defaultStore = { agents: [], activeCount: 0, totalSpawned: 0 };
    // Register worker in team health tracker
    await registerWorker(agentName, description, projectDir);
    updateState(tracePath, defaultStore, (data) => {
        const store = data;
        const entry = {
            id: agentId,
            ccAgentId,
            name: agentName,
            subagentType,
            model,
            description,
            spawnedAt,
            status: 'active',
        };
        store.agents.push(entry);
        store.activeCount = store.agents.filter(a => a.status === 'active').length;
        store.totalSpawned = (store.totalSpawned || 0) + 1;
        // Keep last 100 agent entries
        if (store.agents.length > 100) {
            store.agents = store.agents.slice(-100);
        }
        return store;
    });
    // Read updated store to get active count for output
    const store = readStateOrDefault(tracePath, defaultStore);
    const activeCount = store.agents.filter(a => a.status === 'active').length;
    const context = [
        `[aing:agent-trace] SubagentStart: ${agentName} (${subagentType}) model=${model}`,
        `Active agents: ${activeCount} | Total spawned this session: ${store.totalSpawned}`,
        `[aing:context-rule] You are a SUB-AGENT. Keep work focused and efficient:`,
        `- If your task is too large, report partial results immediately via SendMessage before context runs out.`,
        `- Keep responses concise. Avoid re-reading files you've already read. Minimize unnecessary tool calls.`,
    ].join('\n');
    process.stdout.write(JSON.stringify({
        hookSpecificOutput: { additionalContext: context }
    }));
    log.info('SubagentStart tracked', { agentId, ccAgentId, agentName, subagentType, model, activeCount });
}
catch (err) {
    log.error('SubagentStart handler failed', { error: err.message });
    process.stdout.write(JSON.stringify({}));
}
//# sourceMappingURL=subagent-start.js.map