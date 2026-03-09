import { useState, useEffect, useRef, useCallback } from 'react';
import type { FlowGraph, LintIssue } from '../types';

export function useWebSocket(url = 'ws://localhost:3001') {
  const [graph, setGraph] = useState<FlowGraph | null>(null);
  const [filePath, setFilePath] = useState<string>('');
  const [connected, setConnected] = useState(false);
  const [lintIssues, setLintIssues] = useState<LintIssue[]>([]);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
    };

    ws.onclose = () => {
      setConnected(false);
    };

    ws.onerror = () => {
      setConnected(false);
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        switch (msg.type) {
          case 'initial':
            setGraph(msg.graph);
            setFilePath(msg.filePath ?? '');
            break;
          case 'update':
            setGraph(msg.graph);
            break;
          case 'lint':
            setLintIssues(msg.issues ?? []);
            break;
        }
      } catch {
        // ignore malformed messages
      }
    };

    return () => {
      ws.close();
    };
  }, [url]);

  const openFile = useCallback((path: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'open', filePath: path }));
    }
  }, []);

  return { graph, filePath, connected, lintIssues, openFile, wsRef };
}
