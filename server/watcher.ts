import { watch, type FSWatcher } from 'chokidar';
import { readFile } from 'fs/promises';
import { extname } from 'path';
import type { Parser, Language, Tree } from 'web-tree-sitter';
import { createParser, buildFlowGraph, type FlowGraph } from './parser/index.ts';

interface WatcherState {
  filePath: string;
  watcher: FSWatcher;
  parser: Parser;
  language: Language;
  currentTree: Tree;
  debounceTimer: ReturnType<typeof setTimeout> | null;
}

let state: WatcherState | null = null;

export async function watchFile(
  filePath: string,
  onChange: (graph: FlowGraph) => void,
  debounceMs = 300,
): Promise<FlowGraph> {
  // Clean up any previous watcher
  if (state) {
    stopWatching();
  }

  const ext = extname(filePath);
  const result = await createParser(ext);
  if (!result) {
    throw new Error(`Unsupported file extension: ${ext}`);
  }

  const { parser, language } = result;

  const source = await readFile(filePath, 'utf-8');
  const currentTree = parser.parse(source);
  const initialGraph = buildFlowGraph(currentTree);

  const watcher = watch(filePath, { ignoreInitial: true });

  state = {
    filePath,
    watcher,
    parser,
    language,
    currentTree,
    debounceTimer: null,
  };

  watcher.on('change', () => {
    if (!state) return;

    // Clear any pending debounce
    if (state.debounceTimer) {
      clearTimeout(state.debounceTimer);
    }

    state.debounceTimer = setTimeout(async () => {
      if (!state) return;

      try {
        const newSource = await readFile(state.filePath, 'utf-8');
        const newTree = state.parser.parse(newSource);

        // Delete old tree to free WASM memory
        state.currentTree.delete();
        state.currentTree = newTree;

        const graph = buildFlowGraph(newTree);
        onChange(graph);
      } catch (err) {
        console.error('Error re-parsing file:', err);
      }
    }, debounceMs);
  });

  return initialGraph;
}

export function stopWatching(): void {
  if (!state) return;

  if (state.debounceTimer) {
    clearTimeout(state.debounceTimer);
  }

  state.watcher.close();
  state.currentTree.delete();
  state.parser.delete();

  state = null;
}
