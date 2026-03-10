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
exports.parseWorkflow = void 0;
const yaml = __importStar(require("yaml"));
const fs = __importStar(require("fs/promises"));
async function parseWorkflow(filePath) {
    const content = await fs.readFile(filePath, 'utf-8');
    const lines = content.split('\n');
    const lineMap = new Map();
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
    const lineFinder = (searchStr) => {
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
        getLineNumber: (path) => {
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
exports.parseWorkflow = parseWorkflow;
//# sourceMappingURL=yaml-parser.js.map