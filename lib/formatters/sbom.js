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
exports.SBOMGenerator = void 0;
const crypto = __importStar(require("crypto"));
class SBOMGenerator {
    async generate(workflowFiles, shaResolver) {
        const dependencies = [];
        for (const file of workflowFiles) {
            const fs = await Promise.resolve().then(() => __importStar(require('fs/promises')));
            const content = await fs.readFile(file, 'utf-8');
            const actions = this.extractActions(content);
            for (const action of actions) {
                const dep = await this.analyzeAction(action, shaResolver);
                if (dep)
                    dependencies.push(dep);
            }
        }
        const uniqueDeps = Array.from(new Map(dependencies.map(d => [d.name, d])).values());
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
    extractActions(yamlContent) {
        const actionPattern = /uses:\s*([^@\s]+)@([^\s]+)/g;
        const matches = [];
        let match;
        while ((match = actionPattern.exec(yamlContent)) !== null) {
            matches.push(`${match[1]}@${match[2]}`);
        }
        return [...new Set(matches)];
    }
    async analyzeAction(actionRef, shaResolver) {
        const resolved = await shaResolver.resolve(actionRef);
        if (!resolved)
            return null;
        return {
            name: resolved.action,
            version: resolved.versionTag,
            resolvedSha: resolved.resolvedSha,
            repository: `https://github.com/${resolved.owner}/${resolved.repo}`
        };
    }
}
exports.SBOMGenerator = SBOMGenerator;
//# sourceMappingURL=sbom.js.map