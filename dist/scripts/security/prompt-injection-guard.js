import { createLogger } from '../core/logger.js';
const log = createLogger('injection-guard');
const INJECTION_PATTERNS = [
    // Role-override / instruction-override attempts
    /ignore\s+(all\s+)?previous\s+instructions/i,
    /disregard\s+(your\s+)?system\s+prompt/i,
    /you\s+are\s+now\s+a\s+different/i,
    /^SYSTEM:\s+override/im,
    /forget\s+(everything|all)\s+(you|your)/i,
    /new\s+instructions?:\s*$/im,
    /\bdo\s+not\s+follow\s+(any|your)\s+(previous|original)/i,
    // Base64-encoded payload detection (long base64 strings that may hide instructions)
    /[A-Za-z0-9+/=]{80,}/,
    // Unicode homoglyph attack detection (Cyrillic/Greek lookalikes mixed with Latin)
    /[\u0400-\u04FF].*[a-zA-Z]|[a-zA-Z].*[\u0400-\u04FF]/,
    /[\u0370-\u03FF].*[a-zA-Z]|[a-zA-Z].*[\u0370-\u03FF]/,
    // HTML/Markdown injection (embedded tags that could alter rendering context)
    /<script[\s>]/i,
    /<iframe[\s>]/i,
    /<object[\s>]/i,
];
export function sanitizeUserMessage(text) {
    if (!text)
        return '';
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}
export function wrapXML(text) {
    const sanitized = sanitizeUserMessage(text);
    return `<user-message trust="untrusted">\n${sanitized}\n</user-message>`;
}
export function detectInjection(text) {
    if (!text)
        return false;
    for (const pattern of INJECTION_PATTERNS) {
        if (pattern.test(text)) {
            log.warn(`Injection pattern detected: ${pattern.source}`);
            return true;
        }
    }
    return false;
}
//# sourceMappingURL=prompt-injection-guard.js.map