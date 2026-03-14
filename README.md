GitHub Actions Workflow Security Scanner

A production-ready security scanner for GitHub Actions workflows that detects supply chain vulnerabilities, enforces security best practices, and auto-remediates issues.

## Why This Matters

Recent attacks have demonstrated critical vulnerabilities in GitHub Actions workflows:

- **Shai Hulud v2 (Nov 2025)**: 25,000+ repositories compromised through `pull_request_target` abuse
- **GhostAction (Sep 2025)**: 3,325 secrets stolen via malicious workflow injections  
- **tj-actions/changed-files (Mar 2025)**: Popular action compromised via tag hijacking

**Only 3.9% of organizations properly pin GitHub Actions to immutable commit SHAs**, leaving the vast majority vulnerable to supply chain attacks.

## Features

- **GHA-001**: Detects unpinned actions using mutable tags (CRITICAL)
- **GHA-002**: Detects dangerous triggers like `pull_request_target` (CRITICAL)
- **GHA-003**: Detects overprivileged `GITHUB_TOKEN` permissions (HIGH)
- **Auto-remediation**: Automatically creates PRs to pin actions to commit SHAs
- **SARIF output**: Integrates with GitHub Advanced Security
- **SBOM generation**: Produces CycloneDX SBOMs for workflow dependencies

## Quick Start

Add this to your workflow:

```yaml
- uses: your-username/gha-security-scanner@v1
  with:
    github-token: ${{ secrets.GITHUB_TOKEN }}
    auto-fix: true

  Inputs

github-token: GitHub token for API access (required, default: ${{ github.token }})
scan-path: Glob pattern for workflow files (optional, default: .github/workflows/**/*.{yml,yaml})
severity-threshold: Minimum severity to report (optional, default: HIGH)
auto-fix: Create PRs with security fixes (optional, default: false)
generate-sbom: Generate CycloneDX SBOM (optional, default: true)
fail-on-detection: Fail workflow if issues found (optional, default: true)

Outputs

findings-count: Total security findings
critical-count: Number of critical issues
high-count: Number of high issues
report-path: Path to SARIF report
sbom-path: Path to SBOM file

Usage Example - Basic Scanning

name: Security Scan

on:
  pull_request:
    paths:
      - .github/workflows/**

jobs:
  scan:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      security-events: write
    steps:
      - uses: actions/checkout@v4
      - uses: your-username/gha-security-scanner@v1
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          severity-threshold: HIGH

Usage Example - With Auto-Remediation

- uses: your-username/gha-security-scanner@v1
  with:
    github-token: ${{ secrets.GITHUB_TOKEN }}
    auto-fix: true
    generate-sbom: true

Security Rules

GHA-001 (CRITICAL): Unpinned action using mutable tag
GHA-002 (CRITICAL): Dangerous trigger with untrusted checkout
GHA-003 (HIGH): Overprivileged GITHUB_TOKEN
GHA-004 (HIGH): Untrusted input in shell commands
GHA-005 (CRITICAL): Use of compromised action

Development

Prerequisites: Node.js 20+, npm 9+

Setup commands:
git clone https://github.com/PJDev0/gha-security-scanner.git
cd gha-security-scanner
npm install

Build commands:
npm run build
npm run package

Test command:
npm test

License

MIT
