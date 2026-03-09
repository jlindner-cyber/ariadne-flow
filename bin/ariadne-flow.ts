#!/usr/bin/env npx tsx

import { resolve } from "node:path";
import { existsSync } from "node:fs";
import { spawn, execSync } from "node:child_process";

const filePath = process.argv[2];

if (!filePath) {
  console.log("Usage: ariadne-flow <file-path>");
  process.exit(0);
}

const resolved = resolve(filePath);

if (!existsSync(resolved)) {
  console.error(`Error: file not found: ${resolved}`);
  process.exit(1);
}

// Set env var for the dev server to pick up
process.env.ARIADNE_INITIAL_FILE = resolved;

const projectRoot = resolve(import.meta.dirname, "..");

const child = spawn("npm", ["run", "dev"], {
  cwd: projectRoot,
  stdio: "inherit",
  env: { ...process.env },
});

// Open the browser after a short delay to let servers start
const timer = setTimeout(() => {
  const url = `http://localhost:5173?file=${encodeURIComponent(resolved)}`;
  try {
    execSync(`open "${url}"`);
  } catch {
    console.log(`Open browser: ${url}`);
  }
}, 3000);

child.on("exit", (code) => {
  clearTimeout(timer);
  process.exit(code ?? 0);
});

// Forward signals to child
for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    child.kill(signal);
  });
}
