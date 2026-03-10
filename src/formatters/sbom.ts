import * as crypto from 'crypto';
import { SHAResolver } from '../core/types';

interface WorkflowDependency {
  name: string;
  version: string;
  resolvedSha: string;
  repository: string;
}

export class SBOMGenerator {
  async generate(
    workflowFiles: string[], 
    shaResolver: SHAResolver
  ): Promise<any> {
    const dependencies: WorkflowDependency[] = [];
    
    for (const file of workflowFiles) {
      const fs = await import('fs/promises');
      const content = await fs.readFile(file, 'utf-8');
      const actions = this.extractActions(content);
      
      for (const action of actions) {
        const dep = await this.analyzeAction(action, shaResolver);
        if (dep) dependencies.push(dep);
      }
    }
    
    const uniqueDeps = Array.from(
      new Map(dependencies.map(d => [d.name, d])).values()
    );
    
    return {
      bomFormat: 'CycloneDX',
      specVersion: '1.5',
      serialNumber: `urn:uuid:${crypto.randomUUID()}`,
      version: 1,
      metadata: {
        timestamp: new Date().toISOString(),
        tools: [{
          vendor: 'GHA Security Scanner',
          name: 'workflow-sbom-generator',
          version: '1.0.0'
        }]
      },
      components: uniqueDeps.map(dep => ({
        type: 'library',
        name: dep.name,
        version: dep.version,
        purl: `pkg:github/${dep.name}@${dep.resolvedSha}`,
        hashes: [{ alg: 'SHA-1', content: dep.resolvedSha }],
        externalReferences: [{
          type: 'vcs',
          url: `https://github.com/${dep.name}`
        }]
      }))
    };
  }
  
  private extractActions(yamlContent: string): string[] {
    const actionPattern = /uses:\s*([^@\s]+)@([^\s]+)/g;
    const matches: string[] = [];
    let match;
    
    while ((match = actionPattern.exec(yamlContent)) !== null) {
      matches.push(`${match[1]}@${match[2]}`);
    }
    
    return [...new Set(matches)];
  }
  
  private async analyzeAction(
    actionRef: string, 
    shaResolver: SHAResolver
  ): Promise<WorkflowDependency | null> {
    const resolved = await shaResolver.resolve(actionRef);
    if (!resolved) return null;
    
    return {
      name: resolved.action,
      version: resolved.versionTag,
      resolvedSha: resolved.resolvedSha,
      repository: `https://github.com/${resolved.owner}/${resolved.repo}`
    };
  }
}