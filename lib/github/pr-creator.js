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
exports.AutoFixer = void 0;
const fs = __importStar(require("fs/promises"));
class AutoFixer {
    octokit;
    context;
    constructor(octokit, context) {
        this.octokit = octokit;
        this.context = context;
    }
    async createFixPR(filePath, findings) {
        const fixable = findings.filter(f => f.ruleId === 'GHA-001' && f.suggestedCode && f.resolvedSha && f.currentCode);
        if (fixable.length === 0)
            return false;
        const content = await fs.readFile(filePath, 'utf-8');
        let fixedContent = content;
        for (const finding of fixable) {
            if (finding.currentCode && finding.suggestedCode) {
                // Escape special regex characters
                const escaped = finding.currentCode.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                fixedContent = fixedContent.replace(new RegExp(escaped, 'g'), finding.suggestedCode);
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
                sha: fileData.sha,
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
        }
        catch (error) {
            console.error('Failed to create PR:', error.message);
            return false;
        }
    }
}
exports.AutoFixer = AutoFixer;
//# sourceMappingURL=pr-creator.js.map