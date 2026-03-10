import { Octokit } from '@octokit/rest';
import * as fs from 'fs/promises';
import * as path from 'path';
import { SHAResolver, ResolvedAction, CacheEntry } from '../core/types';

export class GitHubSHAResolver implements SHAResolver {
  private octokit: Octokit;
  private cache: Map<string, CacheEntry>;
  private cacheFile: string;
  private readonly CACHE_TTL = 24 * 60 * 60 * 1000;
  
  constructor(token?: string, cacheDir: string = '.gha-scanner') {
    this.octokit = new Octokit({ 
      auth: token,
      throttle: {
        onRateLimit: (retryAfter: number) => retryAfter <= 60,
        onSecondaryRateLimit: () => false
      }
    });
    this.cache = new Map();
    this.cacheFile = path.join(cacheDir, 'sha-cache.json');
  }
  
  async initialize(): Promise<void> {
    try {
      await fs.mkdir(path.dirname(this.cacheFile), { recursive: true });
      const data = await fs.readFile(this.cacheFile, 'utf-8');
      const parsed = JSON.parse(data);
      this.cache = new Map(Object.entries(parsed));
      
      const now = Date.now();
      for (const [key, entry] of this.cache.entries()) {
        if (now - entry.timestamp > this.CACHE_TTL) {
          this.cache.delete(key);
        }
      }
    } catch {
      // No cache yet
    }
  }
  
  async resolve(actionRef: string): Promise<ResolvedAction | null> {
    const match = actionRef.match(/^([a-z0-9-]+\/[a-z0-9-]+)(?:\/(.+))?@(.+)$/i);
    if (!match) return null;
    
    const [, ownerRepo, subPath, ref] = match;
    const [owner, repo] = ownerRepo.split('/');
    const cacheKey = `${owner}/${repo}@${ref}`;
    
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return this.buildResolved(ownerRepo, subPath, ref, cached.sha, cached.tag);
    }
    
    try {
      let sha: string;
      let tag: string = ref;
      
      if (/^[a-f0-9]{40}$/i.test(ref)) {
        sha = ref.toLowerCase();
      } else {
        try {
          const { data: refData } = await this.octokit.git.getRef({
            owner, repo, ref: `tags/${ref}`
          });
          sha = refData.object.sha;
          if (refData.object.type === 'tag') {
            const { data: tagData } = await this.octokit.git.getTag({
              owner, repo, tag_sha: refData.object.sha
            });
            sha = tagData.object.sha;
          }
        } catch {
          const { data: refData } = await this.octokit.git.getRef({
            owner, repo, ref: `heads/${ref}`
          });
          sha = refData.object.sha;
          tag = `${ref} (branch)`;
        }
      }
      
      this.cache.set(cacheKey, { sha, tag, timestamp: Date.now() });
      await this.persistCache();
      
      return this.buildResolved(ownerRepo, subPath, ref, sha, tag);
    } catch (error: any) {
      console.error(`Failed to resolve ${actionRef}:`, error.message);
      return null;
    }
  }
  
  async getLatestRelease(owner: string, repo: string): Promise<string | null> {
    try {
      const { data: release } = await this.octokit.repos.getLatestRelease({ owner, repo });
      const resolved = await this.resolve(`${owner}/${repo}@${release.tag_name}`);
      return resolved?.resolvedSha || null;
    } catch {
      return null;
    }
  }
  
  private buildResolved(
    ownerRepo: string, 
    subPath: string | undefined, 
    currentRef: string,
    resolvedSha: string,
    versionTag: string
  ): ResolvedAction {
    const [owner, repo] = ownerRepo.split('/');
    return {
      owner,
      repo,
      currentRef,
      resolvedSha,
      versionTag,
      isPinned: /^[a-f0-9]{40}$/i.test(currentRef),
      action: subPath ? `${ownerRepo}/${subPath}` : ownerRepo
    };
  }
  
  private async persistCache(): Promise<void> {
    const obj = Object.fromEntries(this.cache);
    await fs.writeFile(this.cacheFile, JSON.stringify(obj, null, 2));
  }
}