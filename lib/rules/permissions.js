"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OverprivilegedTokenRule = void 0;
exports.OverprivilegedTokenRule = {
    id: 'GHA-003',
    title: 'Overprivileged GITHUB_TOKEN',
    description: 'GITHUB_TOKEN has excessive permissions',
    severity: 'HIGH',
    category: 'PERMISSIONS',
    detect(workflow) {
        const findings = [];
        const permissions = workflow.document.permissions;
        if (!permissions) {
            findings.push({
                ruleId: 'GHA-003',
                title: 'Missing explicit permissions',
                description: 'Workflow does not declare explicit permissions. Defaults to write-all.',
                severity: 'HIGH',
                category: 'PERMISSIONS',
                position: { line: 1, column: 1, file: workflow.filePath },
                remediation: 'Add minimal permissions at workflow level.',
                references: ['https://docs.github.com/en/actions/security-guides/automatic-token-authentication'],
                currentCode: '# No permissions block',
                suggestedCode: 'permissions:\n  contents: read'
            });
            return findings;
        }
        if (permissions === 'write-all') {
            findings.push({
                ruleId: 'GHA-003',
                title: 'Explicit write-all permissions',
                description: 'Workflow explicitly grants write-all permissions.',
                severity: 'HIGH',
                category: 'PERMISSIONS',
                position: { line: 1, column: 1, file: workflow.filePath },
                remediation: 'Replace with specific minimal permissions.',
                references: ['https://docs.github.com/en/actions/security-guides/automatic-token-authentication'],
                currentCode: 'permissions: write-all',
                suggestedCode: 'permissions:\n  contents: read'
            });
        }
        return findings;
    }
};
//# sourceMappingURL=permissions.js.map