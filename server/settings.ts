import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

export interface Settings {
  ai: {
    command: string;
    personaPrompt: string;
  };
  linters: Record<string, string>;
  fileWatch: {
    debounceMs: number;
  };
}

const SETTINGS_DIR = join(homedir(), '.ariadne-flow');
const SETTINGS_PATH = join(SETTINGS_DIR, 'settings.json');

const DEFAULTS: Settings = {
  ai: {
    command: 'claude',
    personaPrompt:
      'You are a senior code reviewer. Be direct. Focus on bugs, security issues, and performance problems.',
  },
  linters: {
    python: 'ruff check --output-format=json "{file}"',
    javascript: 'eslint --format=json "{file}"',
    typescript: 'eslint --format=json "{file}"',
  },
  fileWatch: {
    debounceMs: 300,
  },
};

function deepMerge(defaults: Settings, partial: Partial<Settings>): Settings {
  return {
    ai: {
      ...defaults.ai,
      ...(partial.ai ?? {}),
    },
    linters: {
      ...defaults.linters,
      ...(partial.linters ?? {}),
    },
    fileWatch: {
      ...defaults.fileWatch,
      ...(partial.fileWatch ?? {}),
    },
  };
}

export function loadSettings(): Settings {
  try {
    const raw = readFileSync(SETTINGS_PATH, 'utf-8');
    const partial = JSON.parse(raw) as Partial<Settings>;
    return deepMerge(DEFAULTS, partial);
  } catch {
    // File doesn't exist or is invalid — create default and return it
    saveSettings(DEFAULTS);
    return { ...DEFAULTS };
  }
}

export function saveSettings(settings: Settings): void {
  if (!existsSync(SETTINGS_DIR)) {
    mkdirSync(SETTINGS_DIR, { recursive: true });
  }
  writeFileSync(SETTINGS_PATH, JSON.stringify(settings, null, 2), 'utf-8');
}
