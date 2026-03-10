import { Finding } from '../core/types';

export interface SARIFReport {
  $schema: string;
  version: string;
  runs: [SARIFRun];  // Exactly one run - GitHub requirement
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
  invocations: [{
    executionSuccessful: boolean;
  }];
}

interface SARIFRule {
  id: string;
  name: string;
  shortDescription: { text: string };
  fullDescription: { text: string };
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
  message: { text: string };
  locations: [{
    physicalLocation: {
      artifactLocation: { uri: string };
      region: {
        startLine: number;
        startColumn: number;
      };
    };
  }];
  fixes?: [{
    description: { text: string };
    artifactChanges: [{
      artifactLocation: { uri: string };
      replacements: [{
        deletedRegion: {
          startLine: number;
          startColumn: number;
          endLine: number;
          endColumn: number;
        };
        insertedContent: { text: string };
      }];
    }];
  }];
}

export class SARIFFormatter {
  private toolVersion: string;
  
  constructor(version: string = '1.0.0') {
    this.toolVersion = version;
  }
  
  format(findings: Finding[]): SARIFReport {
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
  
  private buildRules(findings: Finding[]): SARIFRule[] {
    const uniqueRules = new Map<string, Finding>();
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
  
  private buildResults(findings: Finding[]): SARIFResult[] {
    return findings.map(f => {
      const result: SARIFResult = {
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
  
  private mapSeverity(severity: string): 'error' | 'warning' | 'note' {
    switch (severity) {
      case 'CRITICAL':
      case 'HIGH': return 'error';
      case 'MEDIUM': return 'warning';
      default: return 'note';
    }
  }
  
  private mapRank(severity: string): number {
    switch (severity) {
      case 'CRITICAL': return 100;
      case 'HIGH': return 75;
      case 'MEDIUM': return 50;
      case 'LOW': return 25;
      default: return 10;
    }
  }
}