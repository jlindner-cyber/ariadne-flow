import { Parser, Language } from 'web-tree-sitter';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

const GRAMMAR_DIR = join(homedir(), '.ariadne-flow', 'grammars');
const EXT_TO_LANG: Record<string, string> = {
  '.py': 'python',
  '.js': 'javascript',
  '.ts': 'typescript',
  '.tsx': 'tsx',
  '.jsx': 'javascript',
  '.rs': 'rust',
  '.go': 'go',
  '.rb': 'ruby',
  '.java': 'java',
  '.c': 'c',
  '.cpp': 'cpp',
  '.cs': 'c_sharp',
  '.php': 'php',
  '.swift': 'swift',
  '.kt': 'kotlin',
  '.lua': 'lua',
  '.sh': 'bash',
  '.bash': 'bash',
  '.zsh': 'bash',
  '.sql': 'sql',
  '.html': 'html',
  '.css': 'css',
  '.json': 'json',
  '.yaml': 'yaml',
  '.yml': 'yaml',
  '.toml': 'toml',
  '.md': 'markdown',
};

let parserReady = false;

export async function initParser(): Promise<void> {
  if (!parserReady) {
    await Parser.init();
    parserReady = true;
  }
  if (!existsSync(GRAMMAR_DIR)) {
    mkdirSync(GRAMMAR_DIR, { recursive: true });
  }
}

export function getLangFromExtension(ext: string): string | null {
  return EXT_TO_LANG[ext] || null;
}

export async function loadLanguage(langName: string): Promise<Language> {
  const wasmPath = join(GRAMMAR_DIR, `tree-sitter-${langName}.wasm`);

  if (!existsSync(wasmPath)) {
    throw new Error(
      `Grammar not found: ${wasmPath}. Download the WASM file for "${langName}" and place it in ${GRAMMAR_DIR}/`
    );
  }

  return await Language.load(wasmPath);
}

export async function createParser(ext: string): Promise<{ parser: Parser; language: Language } | null> {
  const langName = getLangFromExtension(ext);
  if (!langName) return null;

  await initParser();
  const language = await loadLanguage(langName);
  const parser = new Parser();
  parser.setLanguage(language);
  return { parser, language };
}
