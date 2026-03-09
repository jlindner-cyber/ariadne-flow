# Ariadne Flow

**Visual code flow debugger with zoomable nodes, live updates, and AI-powered analysis**

Ariadne Flow visualizes any code file as an interactive node graph. Nodes represent functions, classes, loops, and conditionals — click to expand and see internal control flow. The graph live-updates as you edit the file, linter warnings overlay directly on nodes, and an embedded AI terminal provides conversational debugging without leaving the tool.

## Features

- **Zoomable node graph** — pan, zoom, expand/collapse code structures
- **Language-agnostic** — powered by Tree-sitter WASM grammars (27+ languages)
- **Live file watching** — graph updates automatically as you save
- **Linter integration** — errors and warnings overlay directly on nodes
- **AI terminal** — embedded CLI with a custom persona prompt for conversational debugging
- **Configurable settings** — AI command, persona, linters, and debounce timing via `~/.ariadne-flow/settings.json`

## Quick Start

```bash
git clone <repo-url>
cd ariadne-flow
npm install
npm run dev
# Open http://localhost:5173, enter a file path
```

Or with the CLI:

```bash
npm link
ariadne-flow path/to/file.py
```

## Supported Languages

Ariadne Flow supports 27+ languages via Tree-sitter WASM grammars. Grammars need to be placed in `~/.ariadne-flow/grammars/`.

Most common supported languages:

- Python
- JavaScript
- TypeScript
- Rust
- Go
- Ruby
- Java
- C
- C++
- C#
- Swift
- Kotlin
- Scala
- PHP
- Bash
- Lua
- Haskell
- Elixir
- Zig
- OCaml

## Settings

Ariadne Flow reads configuration from `~/.ariadne-flow/settings.json`. The file is created with defaults on first run.

```json
{
  "ai": {
    "command": "claude",
    "personaPrompt": "You are a senior code reviewer. Be direct. Focus on bugs, security issues, and performance problems."
  },
  "linters": {
    "python": "ruff check --output-format=json \"{file}\"",
    "javascript": "eslint --format=json \"{file}\"",
    "typescript": "eslint --format=json \"{file}\""
  },
  "fileWatch": {
    "debounceMs": 300
  }
}
```

| Field | Description |
|-------|-------------|
| `ai.command` | CLI command to spawn for the AI terminal (e.g., `claude`, `aichat`) |
| `ai.personaPrompt` | System prompt injected into the AI session |
| `linters.<lang>` | Shell command to run for linting. `{file}` is replaced with the file path. |
| `fileWatch.debounceMs` | Milliseconds to wait after a file change before re-parsing |

## Adding Grammars

To add support for a new language:

1. Obtain or build the Tree-sitter WASM grammar file (e.g., `tree-sitter-ruby.wasm`). Pre-built WASM files are available from [tree-sitter/tree-sitter](https://github.com/tree-sitter/tree-sitter) or individual grammar repos.
2. Place the `.wasm` file in `~/.ariadne-flow/grammars/`.
3. The file must be named `tree-sitter-<language>.wasm` (e.g., `tree-sitter-ruby.wasm`).
4. Restart Ariadne Flow. The language will be detected automatically.

## Tech Stack

- **Frontend**: React + TypeScript, React Flow (`@xyflow/react`), xterm.js
- **Backend**: Express, WebSocket (`ws`), node-pty, chokidar
- **Parsing**: web-tree-sitter (WASM)
- **Build**: Vite, tsx

## License

MIT
