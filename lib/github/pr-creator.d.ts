import { Octokit } from '@octokit/rest';
import { Context } from '@actions/github/lib/context';
import { Finding } from '../core/types';
export declare class AutoFixer {
    private octokit;
    private context;
    constructor(octokit: Octokit, context: Context);
    createFixPR(filePath: string, findings: Finding[]): Promise<boolean>;
}
//# sourceMappingURL=pr-creator.d.ts.map