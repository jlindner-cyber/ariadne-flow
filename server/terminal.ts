import * as pty from 'node-pty';
import { readFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

interface TerminalContext {
  filePath: string;
  selectedCode?: string;
  startLine?: number;
  endLine?: number;
  lintIssues?: Array<{ message: string; line: number; severity: string }>;
}

interface Settings {
  ai?: {
    command?: string;
    personaPrompt?: string;
  };
}

interface TerminalSession {
  ptyProcess: pty.IPty;
}

let session: TerminalSession | null = null;

function loadSettings(): Settings {
  const settingsPath = join(homedir(), '.ariadne-flow', 'settings.json');
  try {
    const raw = readFileSync(settingsPath, 'utf-8');
    return JSON.parse(raw) as Settings;
  } catch {
    return {};
  }
}

function buildContextPrompt(context: TerminalContext, personaPrompt: string): string {
  const parts: string[] = [personaPrompt, ''];

  parts.push(`File: ${context.filePath}`);

  if (context.selectedCode) {
    const lineRange =
      context.startLine != null && context.endLine != null
        ? ` (lines ${context.startLine}-${context.endLine})`
        : '';
    parts.push(`\nSelected code${lineRange}:\n\`\`\`\n${context.selectedCode}\n\`\`\``);
  }

  if (context.lintIssues && context.lintIssues.length > 0) {
    parts.push('\nLinter findings:');
    for (const issue of context.lintIssues) {
      parts.push(`  - [${issue.severity}] Line ${issue.line}: ${issue.message}`);
    }
  }

  parts.push('\nPlease review and provide your analysis.');
  return parts.join('\n');
}

export function createTerminalSession(
  context: TerminalContext,
  onData: (data: string) => void,
): void {
  // Kill any existing session first
  destroyTerminalSession();

  const settings = loadSettings();
  const command = settings.ai?.command ?? 'claude';
  const personaPrompt =
    settings.ai?.personaPrompt ??
    'You are a senior code reviewer. Be direct. Focus on bugs, security issues, and performance problems.';

  const contextPrompt = buildContextPrompt(context, personaPrompt);

  const ptyProcess = pty.spawn(command, [], {
    name: 'xterm-color',
    cols: 120,
    rows: 30,
    cwd: homedir(),
    env: {
      ...process.env,
      ARIADNE_CONTEXT: JSON.stringify(context),
    } as Record<string, string>,
  });

  ptyProcess.onData((data: string) => {
    onData(data);
  });

  session = { ptyProcess };

  // After a brief delay, write the context prompt as initial input
  setTimeout(() => {
    if (session) {
      session.ptyProcess.write(contextPrompt + '\r');
    }
  }, 1000);
}

export function writeToTerminal(data: string): void {
  if (session) {
    session.ptyProcess.write(data);
  }
}

export function resizeTerminal(cols: number, rows: number): void {
  if (session) {
    session.ptyProcess.resize(cols, rows);
  }
}

export function destroyTerminalSession(): void {
  if (session) {
    try {
      session.ptyProcess.kill();
    } catch {
      // Process may already be dead
    }
    session = null;
  }
}
