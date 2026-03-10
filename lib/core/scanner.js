"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkflowScanner = void 0;
const yaml_parser_1 = require("../utils/yaml-parser");
const pinning_1 = require("../rules/pinning");
const triggers_1 = require("../rules/triggers");
const permissions_1 = require("../rules/permissions");
class WorkflowScanner {
    config;
    shaResolver;
    rules = [
        pinning_1.UnpinnedActionRule,
        triggers_1.DangerousTriggerRule,
        permissions_1.OverprivilegedTokenRule
    ];
    constructor(config) {
        this.config = config;
        this.shaResolver = config.shaResolver;
    }
    async scanFile(filePath) {
        try {
            const workflow = await (0, yaml_parser_1.parseWorkflow)(filePath);
            return this.scanWorkflow(workflow);
        }
        catch (error) {
            return [{
                    ruleId: 'PARSE-ERROR',
                    title: 'Workflow Parse Error',
                    description: `Failed to parse: ${error.message}`,
                    severity: 'HIGH',
                    category: 'RUNNER',
                    position: { line: 1, column: 1, file: filePath },
                    remediation: 'Check YAML syntax',
                    references: []
                }];
        }
    }
    async scanWorkflow(workflow) {
        const allFindings = [];
        for (const rule of this.rules) {
            try {
                const findings = rule.detect(workflow, {
                    shaResolver: this.shaResolver,
                    config: this.config
                });
                allFindings.push(...findings);
            }
            catch (error) {
                console.error(`Rule ${rule.id} failed:`, error.message);
            }
        }
        // Enrich with SHA resolutions
        for (const finding of allFindings) {
            if (finding.ruleId === 'GHA-001' && finding.metadata?.action) {
                const resolved = await this.shaResolver.resolve(`${finding.metadata.action}@${finding.metadata.currentRef}`);
                if (resolved) {
                    finding.resolvedSha = resolved.resolvedSha;
                    finding.suggestedCode = `uses: ${finding.metadata.action}@${resolved.resolvedSha} # ${resolved.versionTag}`;
                }
            }
        }
        return allFindings;
    }
}
exports.WorkflowScanner = WorkflowScanner;
//# sourceMappingURL=scanner.js.map