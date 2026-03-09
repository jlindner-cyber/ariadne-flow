import { useState, useEffect, useCallback } from 'react';

interface Settings {
  ai: {
    command: string;
    personaPrompt: string;
  };
  linters: Record<string, string>;
  fileWatch: {
    debounceMs: number;
  };
}

interface SettingsPanelProps {
  onClose: () => void;
}

export default function SettingsPanel({ onClose }: SettingsPanelProps) {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/settings')
      .then((res) => res.json())
      .then((data: Settings) => setSettings(data))
      .catch((err) => setError(`Failed to load settings: ${err.message}`));
  }, []);

  const handleSave = useCallback(async () => {
    if (!settings) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    } catch (err) {
      setError(`Failed to save: ${(err as Error).message}`);
    } finally {
      setSaving(false);
    }
  }, [settings]);

  const updateAI = useCallback((field: 'command' | 'personaPrompt', value: string) => {
    setSettings((prev) => (prev ? { ...prev, ai: { ...prev.ai, [field]: value } } : prev));
  }, []);

  const updateLinter = useCallback((lang: string, value: string) => {
    setSettings((prev) =>
      prev ? { ...prev, linters: { ...prev.linters, [lang]: value } } : prev,
    );
  }, []);

  const updateDebounce = useCallback((value: number) => {
    setSettings((prev) =>
      prev ? { ...prev, fileWatch: { ...prev.fileWatch, debounceMs: value } } : prev,
    );
  }, []);

  const inputStyle: React.CSSProperties = {
    width: '100%',
    fontFamily: 'monospace',
    fontSize: 13,
    background: '#11111b',
    border: '1px solid #313244',
    borderRadius: 4,
    color: '#cdd6f4',
    padding: '6px 8px',
    boxSizing: 'border-box',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    marginBottom: 4,
    fontSize: 12,
    color: '#7f849c',
    fontWeight: 600,
  };

  const sectionStyle: React.CSSProperties = {
    marginBottom: 16,
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0, 0, 0, 0.6)',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#181825',
          border: '1px solid #313244',
          borderRadius: 8,
          width: 520,
          maxHeight: '80vh',
          overflow: 'auto',
          padding: 24,
          color: '#cdd6f4',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 20,
          }}
        >
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Settings</h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#7f849c',
              fontSize: 20,
              cursor: 'pointer',
              lineHeight: 1,
            }}
          >
            &times;
          </button>
        </div>

        {error && (
          <div
            style={{
              background: '#45253529',
              border: '1px solid #f38ba8',
              borderRadius: 4,
              padding: '6px 10px',
              marginBottom: 16,
              fontSize: 12,
              color: '#f38ba8',
            }}
          >
            {error}
          </div>
        )}

        {!settings ? (
          <div style={{ color: '#585b70', fontSize: 13 }}>Loading...</div>
        ) : (
          <>
            {/* AI Section */}
            <div style={sectionStyle}>
              <h3 style={{ fontSize: 14, margin: '0 0 10px', color: '#89b4fa' }}>AI</h3>
              <div style={{ marginBottom: 10 }}>
                <label style={labelStyle}>AI Command</label>
                <input
                  type="text"
                  value={settings.ai.command}
                  onChange={(e) => updateAI('command', e.target.value)}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Persona Prompt</label>
                <textarea
                  value={settings.ai.personaPrompt}
                  onChange={(e) => updateAI('personaPrompt', e.target.value)}
                  rows={4}
                  style={{ ...inputStyle, resize: 'vertical' }}
                />
              </div>
            </div>

            {/* Linters Section */}
            <div style={sectionStyle}>
              <h3 style={{ fontSize: 14, margin: '0 0 10px', color: '#89b4fa' }}>Linters</h3>
              {Object.entries(settings.linters).map(([lang, cmd]) => (
                <div key={lang} style={{ marginBottom: 10 }}>
                  <label style={labelStyle}>{lang}</label>
                  <input
                    type="text"
                    value={cmd}
                    onChange={(e) => updateLinter(lang, e.target.value)}
                    style={inputStyle}
                  />
                </div>
              ))}
            </div>

            {/* File Watch Section */}
            <div style={sectionStyle}>
              <h3 style={{ fontSize: 14, margin: '0 0 10px', color: '#89b4fa' }}>File Watch</h3>
              <div>
                <label style={labelStyle}>Debounce (ms)</label>
                <input
                  type="number"
                  value={settings.fileWatch.debounceMs}
                  onChange={(e) => updateDebounce(Number(e.target.value))}
                  min={50}
                  max={5000}
                  style={{ ...inputStyle, width: 120 }}
                />
              </div>
            </div>

            {/* Save */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button
                onClick={onClose}
                style={{
                  background: '#313244',
                  border: 'none',
                  borderRadius: 4,
                  color: '#cdd6f4',
                  padding: '6px 16px',
                  cursor: 'pointer',
                  fontSize: 13,
                }}
              >
                Close
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                style={{
                  background: '#3b82f6',
                  border: 'none',
                  borderRadius: 4,
                  color: '#cdd6f4',
                  padding: '6px 16px',
                  cursor: 'pointer',
                  fontSize: 13,
                  opacity: saving ? 0.6 : 1,
                }}
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
