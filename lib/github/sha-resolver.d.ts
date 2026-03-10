import { SHAResolver, ResolvedAction } from '../core/types';
export declare class GitHubSHAResolver implements SHAResolver {
    private octokit;
    private cache;
    private cacheFile;
    private readonly CACHE_TTL;
    constructor(token?: string, cacheDir?: string);
    initialize(): Promise<void>;
    resolve(actionRef: string): Promise<ResolvedAction | null>;
    getLatestRelease(owner: string, repo: string): Promise<string | null>;
    private buildResolved;
    private persistCache;
}
//# sourceMappingURL=sha-resolver.d.ts.map