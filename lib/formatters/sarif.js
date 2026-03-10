"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SARIFFormatter = void 0;
class SARIFFormatter {
    toolVersion;
    constructor(version = '1.0.0') {
        this.toolVersion = version;
    }
    format(findings) {
        const rules = this.buildRules(findings);
        const results = this.buildResults(findings);
        return {
            $schema: 'https://raw.githubusercontent.com/oasis-tcs/sarif-spec/master/Schemata/sarif-schema-2.1.0.json',
            version: '2.1.0',
            runs: [{
                    tool: {
                        driver: {
                            name: 'GHA Security Scanner',
                            version: this.toolVersion,
                            informationUri: 'https://github.com/your-org/gha-security-scanner',
                            rules
                        }
                    },
                    results,
                    invocations: [{
                            executionSuccessful: true
                        }]
                }]
        };
    }
    buildRules(findings) {
        const uniqueRules = new Map();
        for (const f of findings) {
            if (!uniqueRules.has(f.ruleId)) {
                uniqueRules.set(f.ruleId, f);
            }
        }
        return Array.from(uniqueRules.values()).map(f => ({
            id: f.ruleId,
            name: f.title,
            shortDescription: { text: f.title },
            fullDescription: { text: f.description },
            defaultConfiguration: {
                level: this.mapSeverity(f.severity),
                rank: this.mapRank(f.severity)
            },
            help: {
                text: `${f.remediation}\n\nReferences:\n${f.references.join('\n')}`,
                markdown: `**Remediation:** ${f.remediation}\n\n**References:**\n${f.references.map(r => `- ${r}`).join('\n')}`
            },
            properties: {
                category: f.category,
                severity: f.severity
            }
        }));
    }
    buildResults(findings) {
        return findings.map(f => {
            const result = {
                ruleId: f.ruleId,
                level: this.mapSeverity(f.severity),
                message: { text: f.description },
                locations: [{
                        physicalLocation: {
                            artifactLocation: { uri: f.position.file },
                            region: {
                                startLine: f.position.line,
                                startColumn: f.position.column
                            }
                        }
                    }]
            };
            if (f.suggestedCode && f.currentCode) {
                result.fixes = [{
                        description: { text: `Replace with: ${f.suggestedCode}` },
                        artifactChanges: [{
                                artifactLocation: { uri: f.position.file },
                                replacements: [{
                                        deletedRegion: {
                                            startLine: f.position.line,
                                            startColumn: f.position.column,
                                            endLine: f.position.line,
                                            endColumn: f.position.column + f.currentCode.length
                                        },
                                        insertedContent: { text: f.suggestedCode }
                                    }]
                            }]
                    }];
            }
            return result;
        });
    }
    mapSeverity(severity) {
        switch (severity) {
            case 'CRITICAL':
            case 'HIGH': return 'error';
            case 'MEDIUM': return 'warning';
            default: return 'note';
        }
    }
    mapRank(severity) {
        switch (severity) {
            case 'CRITICAL': return 100;
            case 'HIGH': return 75;
            case 'MEDIUM': return 50;
            case 'LOW': return 25;
            default: return 10;
        }
    }
}
exports.SARIFFormatter = SARIFFormatter;
//# sourceMappingURL=sarif.js.map