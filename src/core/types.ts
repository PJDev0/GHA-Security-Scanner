export type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
export type Category = 'PINNING' | 'TRIGGERS' | 'PERMISSIONS' | 'INJECTION' | 'SECRETS' | 'ARTIFACTS' | 'RUNNER';

export interface Position {
  line: number;
  column: number;
  file: string;
}

export interface Finding {
  ruleId: string;
  title: string;
  description: string;
  severity: Severity;
  category: Category;
  position: Position;
  remediation: string;
  references: string[];
  currentCode?: string;
  suggestedCode?: string;
  resolvedSha?: string;
  metadata?: Record<string, any>;
}

export interface SecurityRule {
  id: string;
  title: string;
  description: string;
  severity: Severity;
  category: Category;
  detect(workflow: ParsedWorkflow, context: ScanContext): Finding[];
}

export interface ParsedWorkflow {
  content: string;
  document: any;  // Added this - was missing!
  filePath: string;
  lineMap: Map<number, string>;
  getLineNumber: (path: string[]) => number | null;
  getColumn: (path: string[]) => number | null;
}

export interface ScannerConfig {
  severityThreshold: Severity;
  autoFix: boolean;
  generateSbom: boolean;
  shaResolver: SHAResolver;  // Added this - was missing!
  customRules?: string[];
  ignorePaths?: string[];
  requiredReviewers?: string[];
}

export interface ScanContext {
  shaResolver: SHAResolver;
  config: ScannerConfig;
  githubClient?: GitHubClient;
}

export interface SHAResolver {
  resolve(actionRef: string): Promise<ResolvedAction | null>;
  getLatestRelease(owner: string, repo: string): Promise<string | null>;
}

export interface ResolvedAction {
  owner: string;
  repo: string;
  currentRef: string;
  resolvedSha: string;
  versionTag: string;
  isPinned: boolean;
  action: string;
  releaseDate?: string;
}

export interface GitHubClient {
  createPullRequest(params: PRParams): Promise<string>;
  getFileContent(path: string, ref?: string): Promise<string>;
  updateCheckRun(findings: Finding[]): Promise<void>;
}

export interface PRParams {
  title: string;
  body: string;
  head: string;
  base: string;
  changes: Array<{
    path: string;
    content: string;
  }>;
}

export interface CacheEntry {
  sha: string;
  tag: string;
  timestamp: number;
  etag?: string;
}