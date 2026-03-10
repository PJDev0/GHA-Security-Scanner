import { SecurityRule, Finding, ParsedWorkflow, ScanContext } from '../core/types';

export const UnpinnedActionRule: SecurityRule = {
  id: 'GHA-001',
  title: 'Unpinned GitHub Action',
  description: 'Action uses mutable tag instead of immutable commit SHA, enabling supply chain attacks through tag hijacking',
  severity: 'CRITICAL',
  category: 'PINNING',
  
  detect(workflow: ParsedWorkflow, _context: ScanContext): Finding[] {
    const findings: Finding[] = [];
    const actionPattern = /^([a-z0-9-]+\/[a-z0-9-]+)(?:\/([a-z0-9-]+))?@(.+)$/i;
    
    const scanNode = (node: any, path: string[]) => {
      if (!node || typeof node !== 'object') return;
      
      if (node.uses && typeof node.uses === 'string') {
        const match = node.uses.match(actionPattern);
        if (!match) return;
        
        const [, ownerRepo, subPath, ref] = match;
        const fullAction = subPath ? `${ownerRepo}/${subPath}` : ownerRepo;
        const isPinned = /^[a-f0-9]{40}$/i.test(ref);
        
        if (!isPinned) {
          const line = workflow.getLineNumber([...path, 'uses']) || 1;
          
          findings.push({
            ruleId: 'GHA-001',
            title: `Unpinned action: ${fullAction}`,
            description: `Action "${node.uses}" uses mutable reference "${ref}". Tags and branches can be force-pushed, allowing attackers to inject malicious code.`,
            severity: 'CRITICAL',
            category: 'PINNING',
            position: { line, column: 1, file: workflow.filePath },
            remediation: 'Pin to specific commit SHA. Use this tool\'s auto-fix feature to resolve the current SHA for this tag.',
            references: [
              'https://docs.github.com/en/actions/security-guides/security-hardening-for-github-actions',
              'https://www.wiz.io/blog/github-actions-security-guide'
            ],
            currentCode: `uses: ${node.uses}`,
            metadata: {
              action: fullAction,
              currentRef: ref,
              ownerRepo
            }
          });
        }
      }
      
      if (node.jobs) {
        Object.entries(node.jobs).forEach(([jobName, job]) => {
          scanNode(job, [...path, 'jobs', jobName]);
          if ((job as any).steps) {
            (job as any).steps.forEach((step: any, idx: number) => {
              scanNode(step, [...path, 'jobs', jobName, 'steps', idx.toString()]);
            });
          }
        });
      }
    };
    
    scanNode(workflow.document, []);
    return findings;
  }
};