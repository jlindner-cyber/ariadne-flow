import { useEffect, useRef } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';

interface AITerminalProps {
  wsRef: React.RefObject<WebSocket | null>;
  visible: boolean;
  onClose: () => void;
}

export default function AITerminal({ wsRef, visible, onClose }: AITerminalProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const observerRef = useRef<ResizeObserver | null>(null);

  useEffect(() => {
    if (!visible || !containerRef.current) return;

    const terminal = new Terminal({
      theme: {
        background: '#11111b',
        foreground: '#cdd6f4',
        cursor: '#f5e0dc',
      },
      fontFamily: 'monospace',
      fontSize: 13,
      cursorBlink: true,
    });

    const fitAddon = new FitAddon();
    terminal.loadAddon(fitAddon);
    terminal.open(containerRef.current);
    fitAddon.fit();

    termRef.current = terminal;
    fitAddonRef.current = fitAddon;

    // Send user keystrokes to the server
    terminal.onData((data) => {
      const ws = wsRef.current;
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'terminal:input', data }));
      }
    });

    // Resize handling
    const observer = new ResizeObserver(() => {
      fitAddon.fit();
      const ws = wsRef.current;
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(
          JSON.stringify({
            type: 'terminal:resize',
            cols: terminal.cols,
            rows: terminal.rows,
          }),
        );
      }
    });
    observer.observe(containerRef.current);
    observerRef.current = observer;

    // Listen for terminal data from server
    function handleMessage(event: MessageEvent) {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'terminal:data') {
          terminal.write(msg.data);
        }
      } catch {
        // ignore malformed messages
      }
    }

    const ws = wsRef.current;
    ws?.addEventListener('message', handleMessage);

    return () => {
      ws?.removeEventListener('message', handleMessage);
      observer.disconnect();
      terminal.dispose();
      termRef.current = null;
      fitAddonRef.current = null;
      observerRef.current = null;
    };
  }, [visible, wsRef]);

  if (!visible) return null;

  return (
    <div
      style={{
        height: 300,
        borderTop: '2px solid #3b82f6',
        display: 'flex',
        flexDirection: 'column',
        background: '#11111b',
      }}
    >
      {/* Header bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '4px 12px',
          background: '#181825',
          fontSize: 12,
          fontFamily: 'monospace',
          flexShrink: 0,
        }}
      >
        <span>AI Terminal</span>
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            color: '#cdd6f4',
            cursor: 'pointer',
            fontSize: 14,
            padding: '2px 6px',
          }}
        >
          X
        </button>
      </div>
      {/* Terminal container */}
      <div ref={containerRef} style={{ flex: 1 }} />
    </div>
  );
}
