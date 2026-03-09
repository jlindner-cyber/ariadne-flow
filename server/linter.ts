import { execSync } from 'child_process';
import { extname } from 'path';
import { loadSettings } from './settings';

export interface LintIssue {
  line: number;
  column: number;
  severity: 'error' | 'warning';
  message: string;
  rule: string;
}

type LangKey = 'python' | 'javascript' | 'typescript';

const EXT_TO_LANGUAGE: Record<string, LangKey> = {
  '.py': 'python',
  '.js': 'javascript',
  '.jsx': 'javascript',
  '.ts': 'typescript',
  '.tsx': 'typescript',
};

const DEFAULT_COMMANDS: Record<LangKey, string> = {
  python: 'ruff check --output-format=json "{file}"',
  javascript: 'eslint --format=json "{file}"',
  typescript: 'eslint --format=json "{file}"',
};

interface RuffDiagnostic {
  location: { row: number; column: number };
  message: string;
  code: string | null;
  fix: unknown;
}

interface ESLintMessage {
  line: number;
  column: number;
  severity: number;
  message: string;
  ruleId: string | null;
}

interface ESLintFileResult {
  messages: ESLintMessage[];
}

function parseRuffOutput(stdout: string): LintIssue[] {
  const diagnostics: RuffDiagnostic[] = JSON.parse(stdout);
  return diagnostics.map((d) => ({
    line: d.location.row,
    column: d.location.column,
    severity: 'error' as const,
    message: d.message,
    rule: d.code ?? 'unknown',
  }));
}

function parseESLintOutput(stdout: string): LintIssue[] {
  const results: ESLintFileResult[] = JSON.parse(stdout);
  if (!results.length || !results[0].messages) return [];
  return results[0].messages.map((m) => ({
    line: m.line,
    column: m.column,
    severity: m.severity === 2 ? ('error' as const) : ('warning' as const),
    message: m.message,
    rule: m.ruleId ?? 'unknown',
  }));
}

export function runLinter(filePath: string): LintIssue[] {
  const ext = extname(filePath);
  const language = EXT_TO_LANGUAGE[ext];
  if (!language) return [];

  const settings = loadSettings();
  const command = settings.linters[language] ?? DEFAULT_COMMANDS[language];
  const resolvedCommand = command.replace('{file}', filePath);

  let stdout: string;
  try {
    stdout = execSync(resolvedCommand, {
      timeout: 10_000,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
  } catch (err: unknown) {
    // Linters often exit non-zero when they find issues — capture stdout from the error
    const execErr = err as { stdout?: string; status?: number | null };
    if (execErr.stdout) {
      stdout = execErr.stdout;
    } else {
      console.error(`Linter command failed: ${resolvedCommand}`);
      return [];
    }
  }

  if (!stdout.trim()) return [];

  try {
    if (language === 'python') {
      return parseRuffOutput(stdout);
    }
    return parseESLintOutput(stdout);
  } catch (parseErr) {
    console.error('Failed to parse linter output:', parseErr);
    return [];
  }
}
