import express from 'express';
import { WebSocketServer, type WebSocket } from 'ws';
import { createServer } from 'http';
import { resolve } from 'path';
import { initParser } from './parser/index.ts';
import { watchFile, stopWatching } from './watcher.ts';
import { runLinter } from './linter.ts';
import apiRouter from './api.ts';

const app = express();
app.use(express.json());
app.use('/api', apiRouter);

const server = createServer(app);
const wss = new WebSocketServer({ server });

const PORT = process.env.PORT || 3001;

interface OpenMessage {
  type: 'open';
  filePath: string;
}

type ClientMessage = OpenMessage;

wss.on('connection', (ws: WebSocket) => {
  console.log('Client connected');

  ws.on('message', async (data) => {
    let msg: ClientMessage;
    try {
      msg = JSON.parse(data.toString());
    } catch {
      ws.send(JSON.stringify({ type: 'error', message: 'Invalid JSON' }));
      return;
    }

    if (msg.type === 'open') {
      if (!msg.filePath || typeof msg.filePath !== 'string') {
        ws.send(JSON.stringify({ type: 'error', message: 'filePath is required' }));
        return;
      }

      const filePath = resolve(msg.filePath);

      try {
        // Stop any previous watcher for this connection
        stopWatching();

        const graph = await watchFile(filePath, (updatedGraph) => {
          if (ws.readyState === ws.OPEN) {
            ws.send(JSON.stringify({ type: 'update', graph: updatedGraph }));
            const lintIssues = runLinter(filePath);
            ws.send(JSON.stringify({ type: 'lint', issues: lintIssues }));
          }
        });

        ws.send(JSON.stringify({ type: 'initial', graph, filePath }));
        const lintIssues = runLinter(filePath);
        ws.send(JSON.stringify({ type: 'lint', issues: lintIssues }));
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        ws.send(JSON.stringify({ type: 'error', message }));
      }
    }
  });

  ws.on('close', () => {
    console.log('Client disconnected');
    stopWatching();
  });
});

async function start() {
  await initParser();
  server.listen(PORT, () => {
    console.log(`Ariadne Flow server running on http://localhost:${PORT}`);
  });
}

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
