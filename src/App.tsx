import { useState, useCallback } from 'react';
import '@xyflow/react/dist/style.css';
import './App.css';
import FlowCanvas from './components/FlowCanvas';
import { useWebSocket } from './hooks/useWebSocket';
import type { FlowNode } from './types';

function App() {
  const { graph, filePath, connected, lintIssues, openFile } = useWebSocket();
  const [pathInput, setPathInput] = useState('');
  const [selectedNode, setSelectedNode] = useState<FlowNode | null>(null);

  const handleOpen = useCallback(() => {
    if (pathInput.trim()) {
      openFile(pathInput.trim());
      setPathInput('');
    }
  }, [pathInput, openFile]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') handleOpen();
    },
    [handleOpen],
  );

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        background: '#11111b',
        color: '#cdd6f4',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '8px 16px',
          borderBottom: '1px solid #313244',
          background: '#1e1e2e',
        }}
      >
        <span style={{ fontWeight: 700, fontSize: 16, whiteSpace: 'nowrap' }}>
          Ariadne Flow
        </span>
        <input
          type="text"
          value={pathInput}
          onChange={(e) => setPathInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Enter file path..."
          style={{
            flex: 1,
            fontFamily: 'monospace',
            background: '#11111b',
            border: '1px solid #313244',
            borderRadius: 4,
            color: '#cdd6f4',
            padding: '4px 8px',
            fontSize: 13,
          }}
        />
        <button
          onClick={handleOpen}
          style={{
            background: '#313244',
            border: 'none',
            borderRadius: 4,
            color: '#cdd6f4',
            padding: '4px 12px',
            cursor: 'pointer',
            fontSize: 13,
          }}
        >
          Open
        </button>
        <span
          style={{
            width: 10,
            height: 10,
            borderRadius: '50%',
            background: connected ? '#a6e3a1' : '#f38ba8',
            flexShrink: 0,
          }}
          title={connected ? 'Connected' : 'Disconnected'}
        />
      </div>

      {/* File path indicator */}
      {filePath && (
        <div
          style={{
            padding: '4px 16px',
            fontSize: 12,
            color: '#7f849c',
            fontFamily: 'monospace',
            borderBottom: '1px solid #313244',
            background: '#1e1e2e',
          }}
        >
          {filePath}
        </div>
      )}

      {/* Canvas */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <FlowCanvas
          graph={graph}
          lintIssues={lintIssues}
          onNodeSelect={setSelectedNode}
        />
      </div>

      {/* Bottom panel — selected node info */}
      <div
        style={{
          height: 200,
          borderTop: '1px solid #313244',
          background: '#1e1e2e',
          padding: 12,
          overflow: 'auto',
          fontFamily: 'monospace',
          fontSize: 12,
        }}
      >
        {selectedNode ? (
          <>
            <div style={{ marginBottom: 6 }}>
              <strong>{selectedNode.label}</strong>
              <span style={{ color: '#7f849c', marginLeft: 8 }}>
                L{selectedNode.startLine}-{selectedNode.endLine}
              </span>
            </div>
            <pre
              style={{
                background: '#11111b',
                borderRadius: 4,
                padding: 8,
                margin: 0,
                overflow: 'auto',
                maxHeight: 150,
                color: '#a6adc8',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-all',
              }}
            >
              {selectedNode.code}
            </pre>
          </>
        ) : (
          <span style={{ color: '#585b70' }}>Click a node to inspect its code</span>
        )}
      </div>
    </div>
  );
}

export default App;
