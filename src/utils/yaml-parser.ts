import * as yaml from 'yaml';
import * as fs from 'fs/promises';
import { ParsedWorkflow } from '../core/types';

export async function parseWorkflow(filePath: string): Promise<ParsedWorkflow> {
  const content = await fs.readFile(filePath, 'utf-8');
  const lines = content.split('\n');
  const lineMap = new Map<number, string>();
  
  lines.forEach((line, index) => {
    lineMap.set(index + 1, line);
  });

  // Parse with YAML 1.2 core schema
  const document = yaml.parse(content, {
    schema: 'core',
    merge: true,
    maxAliasCount: 100
  });

  // Simple line finder - finds line number by searching content
  const lineFinder = (searchStr: string): number => {
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes(searchStr)) {
        return i + 1;
      }
    }
    return 1;
  };

  return {
    content,
    document,
    filePath,
    lineMap,
    getLineNumber: (path: string[]) => {
      // Simple heuristic: use last path element
      const lastElement = path[path.length - 1];
      if (lastElement === 'uses') {
        // Find the action usage in content
        return lineFinder('uses:');
      }
      return 1;
    },
    getColumn: () => 1
  };
}