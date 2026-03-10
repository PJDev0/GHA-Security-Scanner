"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GitHubSHAResolver = void 0;
const rest_1 = require("@octokit/rest");
const fs = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
class GitHubSHAResolver {
    octokit;
    cache;
    cacheFile;
    CACHE_TTL = 24 * 60 * 60 * 1000;
    constructor(token, cacheDir = '.gha-scanner') {
        this.octokit = new rest_1.Octokit({
            auth: token,
            throttle: {
                onRateLimit: (retryAfter) => retryAfter <= 60,
                onSecondaryRateLimit: () => false
            }
        });
        this.cache = new Map();
        this.cacheFile = path.join(cacheDir, 'sha-cache.json');
    }
    async initialize() {
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
        }
        catch {
            // No cache yet
        }
    }
    async resolve(actionRef) {
        const match = actionRef.match(/^([a-z0-9-]+\/[a-z0-9-]+)(?:\/(.+))?@(.+)$/i);
        if (!match)
            return null;
        const [, ownerRepo, subPath, ref] = match;
        const [owner, repo] = ownerRepo.split('/');
        const cacheKey = `${owner}/${repo}@${ref}`;
        const cached = this.cache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
            return this.buildResolved(ownerRepo, subPath, ref, cached.sha, cached.tag);
        }
        try {
            let sha;
            let tag = ref;
            if (/^[a-f0-9]{40}$/i.test(ref)) {
                sha = ref.toLowerCase();
            }
            else {
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
                }
                catch {
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
        }
        catch (error) {
            console.error(`Failed to resolve ${actionRef}:`, error.message);
            return null;
        }
    }
    async getLatestRelease(owner, repo) {
        try {
            const { data: release } = await this.octokit.repos.getLatestRelease({ owner, repo });
            const resolved = await this.resolve(`${owner}/${repo}@${release.tag_name}`);
            return resolved?.resolvedSha || null;
        }
        catch {
            return null;
        }
    }
    buildResolved(ownerRepo, subPath, currentRef, resolvedSha, versionTag) {
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
    async persistCache() {
        const obj = Object.fromEntries(this.cache);
        await fs.writeFile(this.cacheFile, JSON.stringify(obj, null, 2));
    }
}
exports.GitHubSHAResolver = GitHubSHAResolver;
//# sourceMappingURL=sha-resolver.js.map