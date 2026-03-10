import { Finding, ScannerConfig } from './types';
export declare class WorkflowScanner {
    private config;
    private shaResolver;
    private rules;
    constructor(config: ScannerConfig);
    scanFile(filePath: string): Promise<Finding[]>;
    private scanWorkflow;
}
//# sourceMappingURL=scanner.d.ts.map