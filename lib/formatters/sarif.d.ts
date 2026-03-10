import { Finding } from '../core/types';
export interface SARIFReport {
    $schema: string;
    version: string;
    runs: [SARIFRun];
}
interface SARIFRun {
    tool: {
        driver: {
            name: string;
            version: string;
            informationUri: string;
            rules: SARIFRule[];
        };
    };
    results: SARIFResult[];
    invocations: [
        {
            executionSuccessful: boolean;
        }
    ];
}
interface SARIFRule {
    id: string;
    name: string;
    shortDescription: {
        text: string;
    };
    fullDescription: {
        text: string;
    };
    defaultConfiguration: {
        level: 'error' | 'warning' | 'note';
        rank: number;
    };
    help: {
        text: string;
        markdown: string;
    };
    properties: {
        category: string;
        severity: string;
    };
}
interface SARIFResult {
    ruleId: string;
    level: 'error' | 'warning' | 'note';
    message: {
        text: string;
    };
    locations: [
        {
            physicalLocation: {
                artifactLocation: {
                    uri: string;
                };
                region: {
                    startLine: number;
                    startColumn: number;
                };
            };
        }
    ];
    fixes?: [
        {
            description: {
                text: string;
            };
            artifactChanges: [
                {
                    artifactLocation: {
                        uri: string;
                    };
                    replacements: [
                        {
                            deletedRegion: {
                                startLine: number;
                                startColumn: number;
                                endLine: number;
                                endColumn: number;
                            };
                            insertedContent: {
                                text: string;
                            };
                        }
                    ];
                }
            ];
        }
    ];
}
export declare class SARIFFormatter {
    private toolVersion;
    constructor(version?: string);
    format(findings: Finding[]): SARIFReport;
    private buildRules;
    private buildResults;
    private mapSeverity;
    private mapRank;
}
export {};
//# sourceMappingURL=sarif.d.ts.map