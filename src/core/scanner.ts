import { parseWorkflow } from '../utils/yaml-parser';
import { Finding, ScannerConfig, SHAResolver } from './types';
import { UnpinnedActionRule } from '../rules/pinning';
import { DangerousTriggerRule } from '../rules/triggers';
import { OverprivilegedTokenRule } from '../rules/permissions';

export class WorkflowScanner {
  private config: ScannerConfig;
  private shaResolver: SHAResolver;
  private rules = [
    UnpinnedActionRule,
    DangerousTriggerRule,
    OverprivilegedTokenRule
  ];
  
  constructor(config: ScannerConfig) {
    this.config = config;
    this.shaResolver = config.shaResolver;
  }
  
  async scanFile(filePath: string): Promise<Finding[]> {
    try {
      const workflow = await parseWorkflow(filePath);
      return this.scanWorkflow(workflow);
    } catch (error: any) {
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
  
  private async scanWorkflow(workflow: any): Promise<Finding[]> {
    const allFindings: Finding[] = [];
    
    for (const rule of this.rules) {
      try {
        const findings = rule.detect(workflow, {
          shaResolver: this.shaResolver,
          config: this.config
        });
        allFindings.push(...findings);
      } catch (error: any) {
        console.error(`Rule ${rule.id} failed:`, error.message);
      }
    }
    
    // Enrich with SHA resolutions
    for (const finding of allFindings) {
      if (finding.ruleId === 'GHA-001' && finding.metadata?.action) {
        const resolved = await this.shaResolver.resolve(
          `${finding.metadata.action}@${finding.metadata.currentRef}`
        );
        if (resolved) {
          finding.resolvedSha = resolved.resolvedSha;
          finding.suggestedCode = `uses: ${finding.metadata.action}@${resolved.resolvedSha} # ${resolved.versionTag}`;
        }
      }
    }
    
    return allFindings;
  }
}