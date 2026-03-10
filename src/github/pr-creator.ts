import { Octokit } from '@octokit/rest';
import { Context } from '@actions/github/lib/context';
import { Finding } from '../core/types';
import * as fs from 'fs/promises';

export class AutoFixer {
  private octokit: Octokit;
  private context: Context;
  
  constructor(octokit: Octokit, context: Context) {
    this.octokit = octokit;
    this.context = context;
  }
  
  async createFixPR(filePath: string, findings: Finding[]): Promise<boolean> {
    const fixable = findings.filter(f => 
      f.ruleId === 'GHA-001' && f.suggestedCode && f.resolvedSha && f.currentCode
    );
    
    if (fixable.length === 0) return false;
    
    const content = await fs.readFile(filePath, 'utf-8');
    let fixedContent = content;
    
    for (const finding of fixable) {
      if (finding.currentCode && finding.suggestedCode) {
        // Escape special regex characters
        const escaped = finding.currentCode.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        fixedContent = fixedContent.replace(
          new RegExp(escaped, 'g'), 
          finding.suggestedCode
        );
      }
    }
    
    if (fixedContent === content) {
      console.log('No changes to apply');
      return false;
    }
    
    const timestamp = Date.now();
    const branchName = `security/pin-actions-${timestamp}`;
    const { owner, repo } = this.context.repo;
    const baseRef = this.context.ref.replace('refs/heads/', '');
    
    try {
      const { data: baseBranch } = await this.octokit.git.getRef({
        owner, repo, ref: `heads/${baseRef}`
      });
      
      await this.octokit.git.createRef({
        owner, repo, 
        ref: `refs/heads/${branchName}`, 
        sha: baseBranch.object.sha
      });
      
      const { data: fileData } = await this.octokit.repos.getContent({
        owner, repo, path: filePath, ref: branchName
      });
      
      await this.octokit.repos.createOrUpdateFileContents({
        owner, repo, path: filePath,
        message: `security: Pin GitHub Actions to immutable commit SHAs\n\nFixes ${fixable.length} unpinned action(s).`,
        content: Buffer.from(fixedContent).toString('base64'),
        sha: (fileData as any).sha,
        branch: branchName
      });
      
      await this.octokit.pulls.create({
        owner, repo,
        title: 'Security: Pin GitHub Actions to immutable commit SHAs',
        head: branchName,
        base: baseRef,
        body: `This PR pins ${fixable.length} GitHub Action(s) to immutable commit SHAs.`
      });
      
      return true;
    } catch (error: any) {
      console.error('Failed to create PR:', error.message);
      return false;
    }
  }
}