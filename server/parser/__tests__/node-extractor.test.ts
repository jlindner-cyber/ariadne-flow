import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { Parser, Language } from 'web-tree-sitter';
import { extractNodes, buildFlowGraph } from '../node-extractor.js';

const GRAMMAR_DIR = join(homedir(), '.ariadne-flow', 'grammars');
const FIXTURES_DIR = join(__dirname, 'fixtures');

const hasPythonGrammar = existsSync(join(GRAMMAR_DIR, 'tree-sitter-python.wasm'));
const hasJSGrammar = existsSync(join(GRAMMAR_DIR, 'tree-sitter-javascript.wasm'));

let pythonParser: Parser | null = null;
let jsParser: Parser | null = null;

beforeAll(async () => {
  await Parser.init();

  if (hasPythonGrammar) {
    const lang = await Language.load(join(GRAMMAR_DIR, 'tree-sitter-python.wasm'));
    pythonParser = new Parser();
    pythonParser.setLanguage(lang);
  }

  if (hasJSGrammar) {
    const lang = await Language.load(join(GRAMMAR_DIR, 'tree-sitter-javascript.wasm'));
    jsParser = new Parser();
    jsParser.setLanguage(lang);
  }
});

describe('node-extractor (Python)', () => {
  const skipIf = !hasPythonGrammar ? it.skip : it;

  skipIf('extracts top-level functions, classes, and loops', () => {
    const source = readFileSync(join(FIXTURES_DIR, 'sample.py'), 'utf-8');
    const tree = pythonParser!.parse(source);
    const nodes = extractNodes(tree);

    const types = nodes.map((n) => n.type);
    const labels = nodes.map((n) => n.label);

    // Should find: 2 imports, greet function, Calculator class, for loop
    expect(types).toContain('import');
    expect(types).toContain('function');
    expect(types).toContain('class');
    expect(types).toContain('loop');

    expect(labels).toContain('greet');
    expect(labels).toContain('Calculator');

    tree.delete();
  });

  skipIf('extracts nested children from greet function', () => {
    const source = readFileSync(join(FIXTURES_DIR, 'sample.py'), 'utf-8');
    const tree = pythonParser!.parse(source);
    const graph = buildFlowGraph(tree);

    // Find the greet function
    const greetNode = graph.nodes.find((n) => n.label === 'greet' && n.type === 'function');
    expect(greetNode).toBeDefined();
    expect(greetNode!.children.length).toBeGreaterThan(0);

    // greet should have a conditional child (the if statement)
    const hasConditional = greetNode!.children.some((c) => c.type === 'conditional');
    expect(hasConditional).toBe(true);

    tree.delete();
  });

  skipIf('extracts class methods as children of Calculator', () => {
    const source = readFileSync(join(FIXTURES_DIR, 'sample.py'), 'utf-8');
    const tree = pythonParser!.parse(source);
    const graph = buildFlowGraph(tree);

    const calcNode = graph.nodes.find((n) => n.label === 'Calculator' && n.type === 'class');
    expect(calcNode).toBeDefined();

    const methodNames = calcNode!.children.map((c) => c.label);
    expect(methodNames).toContain('__init__');
    expect(methodNames).toContain('add');
    expect(methodNames).toContain('get_history');

    tree.delete();
  });

  skipIf('builds a complete flow graph with valid edges', () => {
    const source = readFileSync(join(FIXTURES_DIR, 'sample.py'), 'utf-8');
    const tree = pythonParser!.parse(source);
    const graph = buildFlowGraph(tree);

    expect(graph.nodes.length).toBeGreaterThan(0);
    expect(graph.edges.length).toBeGreaterThan(0);

    const nodeIds = new Set(graph.nodes.map((n) => n.id));

    // Every edge source and target must exist in the node list
    for (const edge of graph.edges) {
      expect(nodeIds.has(edge.source)).toBe(true);
      expect(nodeIds.has(edge.target)).toBe(true);
    }

    tree.delete();
  });
});

describe('node-extractor (JavaScript)', () => {
  const skipIf = !hasJSGrammar ? it.skip : it;

  skipIf('extracts function and nested control flow from JS', () => {
    const source = readFileSync(join(FIXTURES_DIR, 'sample.js'), 'utf-8');
    const tree = jsParser!.parse(source);
    const graph = buildFlowGraph(tree);

    const types = graph.nodes.map((n) => n.type);
    expect(types).toContain('function');

    // processFile should have children (if, try)
    const processFile = graph.nodes.find((n) => n.label === 'processFile' && n.type === 'function');
    expect(processFile).toBeDefined();
    expect(processFile!.children.length).toBeGreaterThan(0);

    const childTypes = processFile!.children.map((c) => c.type);
    expect(childTypes).toContain('conditional');
    expect(childTypes).toContain('try');

    tree.delete();
  });

  skipIf('generates valid edges for JS graph', () => {
    const source = readFileSync(join(FIXTURES_DIR, 'sample.js'), 'utf-8');
    const tree = jsParser!.parse(source);
    const graph = buildFlowGraph(tree);

    const nodeIds = new Set(graph.nodes.map((n) => n.id));

    for (const edge of graph.edges) {
      expect(nodeIds.has(edge.source)).toBe(true);
      expect(nodeIds.has(edge.target)).toBe(true);
    }

    tree.delete();
  });
});
