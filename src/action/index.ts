import * as core from '@actions/core';
import * as github from '@actions/github';
import * as fs from 'fs/promises';
import { WorkflowScanner } from '../core/scanner';
import { GitHubSHAResolver } from '../github/sha-resolver';
import { SARIFFormatter } from '../formatters/sarif';
import { SBOMGenerator } from '../formatters/sbom';
import { AutoFixer } from '../github/pr-creator';
import { DefaultArtifactClient } from '@actions/artifact';
import { Octokit } from '@octokit/rest';

async function run() {
  try {
    const token = core.getInput('github-token', { required: true });
    const scanPath = core.getInput('scan-path');
    const severityThreshold = core.getInput('severity-threshold') as any;
    const autoFix = core.getBooleanInput('auto-fix');
    const generateSbom = core.getBooleanInput('generate-sbom');
    const failOnDetection = core.getBooleanInput('fail-on-detection');
    
    const octokit = new Octokit({ auth: token });
    const context = github.context;
    
    core.info('Initializing GHA Security Scanner...');
    
    const shaResolver = new GitHubSHAResolver(token);
    await shaResolver.initialize();
    
    const scanner = new WorkflowScanner({
      severityThreshold,
      autoFix,
      generateSbom,
      shaResolver
    });
    
    const workflowFiles = await findWorkflowFiles(scanPath);
    core.info(`Found ${workflowFiles.length} workflow files`);
    
    if (workflowFiles.length === 0) {
      core.warning('No workflow files found');
      return;
    }
    
    let allFindings: any[] = [];
    let fixCount = 0;
    
    for (const file of workflowFiles) {
      core.info(`Scanning: ${file}`);
      const findings = await scanner.scanFile(file);
      allFindings.push(...findings);
      
      if (autoFix && findings.some((f: any) => f.ruleId === 'GHA-001')) {
        const fixer = new AutoFixer(octokit, context);
        const fixed = await fixer.createFixPR(file, findings);
        if (fixed) fixCount++;
      }
    }
    
    // Generate SARIF
    const sarifFormatter = new SARIFFormatter();
    const sarifReport = sarifFormatter.format(allFindings);
    const sarifPath = 'security-report.sarif';
    await fs.writeFile(sarifPath, JSON.stringify(sarifReport, null, 2));
    core.setOutput('report-path', sarifPath);
    
    // Generate SBOM
    let sbomPath = '';
    if (generateSbom) {
      const sbomGen = new SBOMGenerator();
      const sbom = await sbomGen.generate(workflowFiles, shaResolver);
      sbomPath = 'workflow-sbom.json';
      await fs.writeFile(sbomPath, JSON.stringify(sbom, null, 2));
      core.setOutput('sbom-path', sbomPath);
      
      // Upload with correct Artifact v4 API
      const artifact = new DefaultArtifactClient();
      await artifact.uploadArtifact(
        `workflow-sbom-${context.runId}`,
        [sbomPath],
        '.',
        { retentionDays: 30 }
      );
    }
    
    // Set outputs
    const critical = allFindings.filter((f: any) => f.severity === 'CRITICAL').length;
    const high = allFindings.filter((f: any) => f.severity === 'HIGH').length;
    
    core.setOutput('findings-count', allFindings.length.toString());
    core.setOutput('critical-count', critical.toString());
    core.setOutput('high-count', high.toString());
    
    // Summary
    await core.summary
      .addHeading('Workflow Security Scan Results')
      .addTable([
        [{data: 'Severity', header: true}, {data: 'Count', header: true}],
        ['Critical', critical.toString()],
        ['High', high.toString()],
        ['Medium', allFindings.filter((f: any) => f.severity === 'MEDIUM').length.toString()],
        ['Low', allFindings.filter((f: any) => f.severity === 'LOW').length.toString()]
      ])
      .write();
    
    // Fail if threshold exceeded
    const severityRank: Record<string, number> = { 
      CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1, INFO: 0 
    };
    const thresholdRank = severityRank[severityThreshold];
    const violations = allFindings.filter((f: any) => 
      severityRank[f.severity] >= thresholdRank
    );
    
    if (violations.length > 0 && failOnDetection) {
      core.setFailed(
        `Security scan failed: ${violations.length} ${severityThreshold}+ severity issues found.`
      );
    }
    
  } catch (error: any) {
    core.setFailed(`Action failed: ${error.message}`);
  }
}

async function findWorkflowFiles(pattern: string): Promise<string[]> {
  const glob = await import('fast-glob');
  return glob.default(pattern, { 
    dot: true,
    ignore: ['**/node_modules/**', '**/.git/**', '**/dist/**']
  });
}

run();