/**
 * sw-kit Display — Colorful terminal output with cute team visualization
 * @module scripts/core/display
 */

// ANSI color codes
const C = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  italic: '\x1b[3m',

  // Team colors
  purple: '\x1b[35m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[95m',
  orange: '\x1b[38;5;208m',
  pink: '\x1b[38;5;213m',
  lime: '\x1b[38;5;154m',
  sky: '\x1b[38;5;117m',

  // Backgrounds
  bgPurple: '\x1b[45m',
  bgCyan: '\x1b[46m',
  bgGreen: '\x1b[42m',
};

// ANSI text icons (no emoji — terminal-safe, Willji design)
const icon = {
  star:   `${C.purple}*${C.reset}`,
  target: `${C.blue}@${C.reset}`,
  tri:    `${C.sky}^${C.reset}`,
  gear:   `${C.orange}~${C.reset}`,
  db:     `${C.yellow}#${C.reset}`,
  lock:   `${C.green}+${C.reset}`,
  pen:    `${C.pink}%%${C.reset}`,
  screen: `${C.cyan}[]${C.reset}`,
  spark:  `${C.lime}**${C.reset}`,
  wand:   `${C.magenta}~*${C.reset}`,
  chart:  `${C.cyan}|#|${C.reset}`,
  brain:  `${C.purple}{o}${C.reset}`,
  route:  `${C.orange}>>>${C.reset}`,
  chain:  `${C.green}<->${C.reset}`,
  heart:  `${C.lime}<3${C.reset}`,
};

const AGENTS = {
  sam:     { icon: icon.star,   color: C.purple, name: 'Sam', role: 'CTO / Lead', desc: 'Project oversight, final review, evidence chain', model: 'opus' },
  able:    { icon: icon.target, color: C.blue, name: 'Able', role: 'PM / Planning', desc: 'Requirements analysis, task decomposition', model: 'sonnet' },
  klay:    { icon: icon.tri,    color: C.sky, name: 'Klay', role: 'Architect / Explorer', desc: 'System design, codebase scanning', model: 'opus' },
  jay:     { icon: icon.gear,   color: C.orange, name: 'Jay', role: 'Backend / API', desc: 'API and server logic implementation', model: 'sonnet' },
  jerry:   { icon: icon.db,     color: C.yellow, name: 'Jerry', role: 'Backend / DB', desc: 'Database and infrastructure', model: 'sonnet' },
  milla:   { icon: icon.lock,   color: C.green, name: 'Milla', role: 'Security / Review', desc: 'Security audit and code review', model: 'sonnet' },
  willji:  { icon: icon.pen,    color: C.pink, name: 'Willji', role: 'Designer / UI-UX', desc: 'Component design, layout, design tokens', model: 'sonnet' },
  derek:   { icon: icon.screen, color: C.cyan, name: 'Derek', role: 'Frontend / Build', desc: 'Screen implementation, state management', model: 'sonnet' },
  rowan:   { icon: icon.spark,  color: C.lime, name: 'Rowan', role: 'Frontend / Motion', desc: 'Animations, micro-interactions, UX polish', model: 'sonnet' },
  iron:    { icon: icon.wand,   color: C.magenta, name: 'Iron', role: 'Wizard', desc: 'Guided magic for non-developers', model: 'sonnet' },
};

const INNOVATIONS = [
  { icon: icon.chart, name: 'Context Budget', color: C.cyan, desc: 'Token tracking and optimization' },
  { icon: icon.brain, name: 'Cross-Session Learning', color: C.purple, desc: 'Success pattern auto-capture' },
  { icon: icon.route, name: 'Adaptive Routing', color: C.orange, desc: 'Complexity-based model selection' },
  { icon: icon.chain, name: 'Evidence Chain', color: C.green, desc: 'Structured completion proof' },
  { icon: icon.heart, name: 'Self-Healing', color: C.lime, desc: 'Auto failure detection and recovery' },
];

/**
 * Generate the sw-kit banner
 */
export function banner() {
  return `
${C.bold}${C.purple}  ┌─────────────────────────────────────────────┐${C.reset}
${C.bold}${C.purple}  │${C.reset}  ${C.bold}${C.pink}sw-kit${C.reset} ${C.dim}v1.3.0${C.reset}  ${C.italic}Harness Engineering Agent${C.reset}  ${C.bold}${C.purple}│${C.reset}
${C.bold}${C.purple}  │${C.reset}                                             ${C.bold}${C.purple}│${C.reset}
${C.bold}${C.purple}  │${C.reset}  ${C.dim}개발자에게는 최고의 도우미${C.reset}                ${C.bold}${C.purple}│${C.reset}
${C.bold}${C.purple}  │${C.reset}  ${C.dim}비개발자에게는 최고의 마술사${C.reset} ${C.magenta}~*${C.reset}          ${C.bold}${C.purple}│${C.reset}
${C.bold}${C.purple}  └─────────────────────────────────────────────┘${C.reset}`;
}

/**
 * Generate the team visualization (grouped by department)
 */
export function teamDisplay() {
  const groups = [
    { label: `${C.purple}CTO${C.reset}`, members: ['sam'] },
    { label: `${C.blue}Planning${C.reset}`, members: ['able', 'klay'] },
    { label: `${C.orange}Backend${C.reset}`, members: ['jay', 'jerry', 'milla'] },
    { label: `${C.pink}Design${C.reset}`, members: ['willji'] },
    { label: `${C.cyan}Frontend${C.reset}`, members: ['derek', 'rowan'] },
    { label: `${C.magenta}Magic${C.reset}`, members: ['iron'] },
  ];

  const lines = [
    '',
    `${C.bold}  sw-kit Agent Team${C.reset}`,
    `${C.dim}  ───────────────────────────────────────${C.reset}`,
  ];

  for (const group of groups) {
    lines.push(`  ${C.bold}${group.label}${C.reset}`);
    for (const key of group.members) {
      const agent = AGENTS[key];
      if (!agent) continue;
      const modelTag = `${C.dim}[${agent.model}]${C.reset}`;
      lines.push(
        `    ${agent.icon} ${agent.color}${C.bold}${agent.name}${C.reset} ${C.dim}${agent.role}${C.reset} ${modelTag}`
      );
    }
  }

  return lines.join('\n');
}

/**
 * Generate innovations display
 */
export function innovationsDisplay() {
  const lines = [
    '',
    `${C.bold}  5 Innovations${C.reset}`,
    `${C.dim}  ───────────────────────────────────────${C.reset}`,
  ];

  for (const inn of INNOVATIONS) {
    lines.push(`  ${inn.icon} ${inn.color}${C.bold}${inn.name}${C.reset} — ${C.dim}${inn.desc}${C.reset}`);
  }

  return lines.join('\n');
}

/**
 * Generate PDCA stage flow visualization
 */
export function pdcaFlow(currentStage) {
  const stages = [
    { key: 'plan', icon: `${C.blue}P${C.reset}`, color: C.blue },
    { key: 'do', icon: `${C.orange}D${C.reset}`, color: C.orange },
    { key: 'check', icon: `${C.cyan}C${C.reset}`, color: C.cyan },
    { key: 'act', icon: `${C.yellow}A${C.reset}`, color: C.yellow },
    { key: 'review', icon: `${C.green}R${C.reset}`, color: C.green },
  ];

  const parts = stages.map(s => {
    const active = s.key === currentStage;
    if (active) {
      return `${s.color}${C.bold}[${s.icon} ${s.key.toUpperCase()}]${C.reset}`;
    }
    return `${C.dim}${s.icon} ${s.key}${C.reset}`;
  });

  return `  ${parts.join(` ${C.dim}→${C.reset} `)}`;
}

/**
 * Generate commands help
 */
export function commandsHelp() {
  const cmds = [
    { cmd: '/swkit start <name>', desc: 'PDCA cycle start', icon: `${C.orange}>>${C.reset}` },
    { cmd: '/swkit auto <f> <task>', desc: 'Full pipeline auto-run', icon: `${C.green}|>${C.reset}` },
    { cmd: '/swkit status', desc: 'Dashboard', icon: icon.chart },
    { cmd: '/swkit next', desc: 'Advance stage', icon: `${C.sky}>|${C.reset}` },
    { cmd: '/swkit tdd start', desc: 'TDD Red-Green-Refactor', icon: `${C.red}(R)${C.reset}` },
    { cmd: '/swkit tdd check <p|f>', desc: 'TDD result/transition', icon: `${C.green}(G)${C.reset}` },
    { cmd: '/swkit task create', desc: 'Task checklist', icon: `${C.blue}[-]${C.reset}` },
    { cmd: '/swkit task check', desc: 'Subtask done', icon: `${C.green}[x]${C.reset}` },
    { cmd: '/swkit explore <target>', desc: 'Klay codebase scan', icon: icon.tri },
    { cmd: '/swkit plan <task>', desc: 'Able+Klay planning', icon: icon.target },
    { cmd: '/swkit execute <task>', desc: 'Jay+Derek build', icon: icon.gear },
    { cmd: '/swkit review', desc: 'Milla security review', icon: icon.lock },
    { cmd: '/swkit verify', desc: 'Sam final verdict', icon: icon.star },
    { cmd: '/swkit wizard', desc: 'Iron magic mode', icon: icon.wand },
    { cmd: '/swkit rollback', desc: 'Checkpoint rollback', icon: `${C.orange}<>>${C.reset}` },
    { cmd: '/swkit learn show', desc: 'Learning history', icon: icon.brain },
    { cmd: '/swkit help', desc: 'This help', icon: `${C.sky}[?]${C.reset}` },
  ];

  const lines = [
    '',
    `${C.bold}  Commands${C.reset}`,
    `${C.dim}  ───────────────────────────────────────${C.reset}`,
  ];

  for (const c of cmds) {
    lines.push(`  ${c.icon} ${C.cyan}${c.cmd}${C.reset}`);
    lines.push(`     ${C.dim}${c.desc}${C.reset}`);
  }

  return lines.join('\n');
}

/**
 * Generate full help output
 */
export function fullHelp() {
  return [
    banner(),
    teamDisplay(),
    innovationsDisplay(),
    commandsHelp(),
    '',
    `${C.dim}  ───────────────────────────────────────${C.reset}`,
    `  ${C.dim}GitHub: ${C.reset}${C.sky}sangwookp9591/sw-kit-claude${C.reset}`,
    `  ${C.dim}Install: ${C.reset}${C.sky}/plugin marketplace add sangwookp9591/sw-kit-claude${C.reset}`,
    '',
  ].join('\n');
}

export { C, AGENTS, INNOVATIONS };
