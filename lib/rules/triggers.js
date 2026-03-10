"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DangerousTriggerRule = void 0;
exports.DangerousTriggerRule = {
    id: 'GHA-002',
    title: 'Dangerous Workflow Trigger',
    description: 'Workflow uses pull_request_target or workflow_run with potential for untrusted code execution',
    severity: 'CRITICAL',
    category: 'TRIGGERS',
    detect(workflow) {
        const findings = [];
        const on = workflow.document.on;
        if (!on)
            return findings;
        const triggers = Array.isArray(on) ? on : typeof on === 'object' ? Object.keys(on) : [on];
        const dangerousTriggers = ['pull_request_target', 'workflow_run'];
        for (const trigger of triggers) {
            if (typeof trigger === 'string' && dangerousTriggers.includes(trigger)) {
                findings.push(...analyzeDangerousTrigger(trigger, workflow));
            }
        }
        return findings;
    }
};
function analyzeDangerousTrigger(trigger, workflow) {
    const findings = [];
    const hasUntrustedCheckout = checkUntrustedCheckout(workflow.document);
    const hasWritePermissions = checkWritePermissions(workflow.document);
    if (hasUntrustedCheckout || hasWritePermissions) {
        let description = `Workflow uses "${trigger}" trigger which runs in the context of the base repository with access to secrets.`;
        if (hasUntrustedCheckout) {
            description += ' Combined with checkout of untrusted PR code, this allows arbitrary code execution with repository secrets.';
        }
        findings.push({
            ruleId: 'GHA-002',
            title: `Dangerous trigger: ${trigger}`,
            description,
            severity: 'CRITICAL',
            category: 'TRIGGERS',
            position: { line: 1, column: 1, file: workflow.filePath },
            remediation: 'Replace pull_request_target with pull_request trigger, or use workflow_run with strict path filtering.',
            references: [
                'https://securitylab.github.com/research/github-actions-preventing-pwn-requests/'
            ],
            currentCode: `on:\n  ${trigger}:`,
            suggestedCode: 'on:\n  pull_request:\n    paths-ignore:\n      - ".github/workflows/**"',
            metadata: { trigger, hasUntrustedCheckout, hasWritePermissions }
        });
    }
    return findings;
}
function checkUntrustedCheckout(document) {
    if (!document.jobs)
        return false;
    const checkoutPattern = /\$\{\{\s*github\.event\.pull_request\.(head\.sha|number)\s*\}\}/;
    for (const job of Object.values(document.jobs)) {
        const j = job;
        if (!j.steps)
            continue;
        for (const step of j.steps) {
            if (step.uses?.includes('checkout')) {
                const ref = step.with?.ref || '';
                if (checkoutPattern.test(ref))
                    return true;
            }
            if (step.run && checkoutPattern.test(step.run))
                return true;
        }
    }
    return false;
}
function checkWritePermissions(document) {
    if (!document.permissions)
        return true;
    if (document.permissions === 'write-all')
        return true;
    const writePerms = ['contents', 'actions', 'security-events'];
    return writePerms.some(perm => document.permissions[perm] === 'write' || document.permissions[perm] === 'admin');
}
//# sourceMappingURL=triggers.js.map