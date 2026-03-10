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
const core = __importStar(require("@actions/core"));
const github = __importStar(require("@actions/github"));
const fs = __importStar(require("fs/promises"));
const scanner_1 = require("../core/scanner");
const sha_resolver_1 = require("../github/sha-resolver");
const sarif_1 = require("../formatters/sarif");
const sbom_1 = require("../formatters/sbom");
const pr_creator_1 = require("../github/pr-creator");
const artifact_1 = require("@actions/artifact");
const rest_1 = require("@octokit/rest");
async function run() {
    try {
        const token = core.getInput('github-token', { required: true });
        const scanPath = core.getInput('scan-path');
        const severityThreshold = core.getInput('severity-threshold');
        const autoFix = core.getBooleanInput('auto-fix');
        const generateSbom = core.getBooleanInput('generate-sbom');
        const failOnDetection = core.getBooleanInput('fail-on-detection');
        const octokit = new rest_1.Octokit({ auth: token });
        const context = github.context;
        core.info('Initializing GHA Security Scanner...');
        const shaResolver = new sha_resolver_1.GitHubSHAResolver(token);
        await shaResolver.initialize();
        const scanner = new scanner_1.WorkflowScanner({
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
        let allFindings = [];
        let fixCount = 0;
        for (const file of workflowFiles) {
            core.info(`Scanning: ${file}`);
            const findings = await scanner.scanFile(file);
            allFindings.push(...findings);
            if (autoFix && findings.some((f) => f.ruleId === 'GHA-001')) {
                const fixer = new pr_creator_1.AutoFixer(octokit, context);
                const fixed = await fixer.createFixPR(file, findings);
                if (fixed)
                    fixCount++;
            }
        }
        // Generate SARIF
        const sarifFormatter = new sarif_1.SARIFFormatter();
        const sarifReport = sarifFormatter.format(allFindings);
        const sarifPath = 'security-report.sarif';
        await fs.writeFile(sarifPath, JSON.stringify(sarifReport, null, 2));
        core.setOutput('report-path', sarifPath);
        // Generate SBOM
        let sbomPath = '';
        if (generateSbom) {
            const sbomGen = new sbom_1.SBOMGenerator();
            const sbom = await sbomGen.generate(workflowFiles, shaResolver);
            sbomPath = 'workflow-sbom.json';
            await fs.writeFile(sbomPath, JSON.stringify(sbom, null, 2));
            core.setOutput('sbom-path', sbomPath);
            // Upload with correct Artifact v4 API
            const artifact = new artifact_1.DefaultArtifactClient();
            await artifact.uploadArtifact(`workflow-sbom-${context.runId}`, [sbomPath], '.', { retentionDays: 30 });
        }
        // Set outputs
        const critical = allFindings.filter((f) => f.severity === 'CRITICAL').length;
        const high = allFindings.filter((f) => f.severity === 'HIGH').length;
        core.setOutput('findings-count', allFindings.length.toString());
        core.setOutput('critical-count', critical.toString());
        core.setOutput('high-count', high.toString());
        // Summary
        await core.summary
            .addHeading('Workflow Security Scan Results')
            .addTable([
            [{ data: 'Severity', header: true }, { data: 'Count', header: true }],
            ['Critical', critical.toString()],
            ['High', high.toString()],
            ['Medium', allFindings.filter((f) => f.severity === 'MEDIUM').length.toString()],
            ['Low', allFindings.filter((f) => f.severity === 'LOW').length.toString()]
        ])
            .write();
        // Fail if threshold exceeded
        const severityRank = {
            CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1, INFO: 0
        };
        const thresholdRank = severityRank[severityThreshold];
        const violations = allFindings.filter((f) => severityRank[f.severity] >= thresholdRank);
        if (violations.length > 0 && failOnDetection) {
            core.setFailed(`Security scan failed: ${violations.length} ${severityThreshold}+ severity issues found.`);
        }
    }
    catch (error) {
        core.setFailed(`Action failed: ${error.message}`);
    }
}
async function findWorkflowFiles(pattern) {
    const glob = await Promise.resolve().then(() => __importStar(require('fast-glob')));
    return glob.default(pattern, {
        dot: true,
        ignore: ['**/node_modules/**', '**/.git/**', '**/dist/**']
    });
}
run();
//# sourceMappingURL=index.js.map