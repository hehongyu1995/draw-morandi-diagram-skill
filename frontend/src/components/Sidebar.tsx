import React from 'react';
import { useAppStore } from '../store/appStore';
import { Sliders } from 'lucide-react';

export const Sidebar: React.FC = () => {
  const {
    editorText,
    updateEditorText,
    jsonStatus,
    bypassMargin,
    setBypassMargin,
    animateDashed,
    setAnimateDashed,
    animateSolid,
    setAnimateSolid
  } = useAppStore();

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const textarea = e.currentTarget;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const text = textarea.value;
      const val = text.substring(0, start) + "  " + text.substring(end);
      updateEditorText(val);
      
      // Reset cursor position after React update
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 2;
      }, 0);
    }
  };

  return (
    <div className="sidebar">
      <div className="panel-header">
        <div className="panel-title">
          <Sliders size={14} style={{ color: 'var(--text-secondary)' }} />
          Diagram Controls & Spec
        </div>
      </div>
      
      {/* PARAMETER CONTROL PANEL */}
      <div className="settings-panel">
        <div className="settings-group">
          <div className="settings-row">
            <label htmlFor="param-bypass" className="settings-label">
              <span>Bypass Offset (曲线绕行系数)</span>
              <span id="param-bypass-val" className="settings-value">{bypassMargin}px</span>
            </label>
            <input 
              type="range" 
              id="param-bypass" 
              min="0" 
              max="100" 
              value={bypassMargin} 
              className="settings-slider"
              onChange={(e) => setBypassMargin(parseInt(e.target.value, 10))}
            />
          </div>
          <div className="settings-row flex-row">
            <label className="settings-toggle-label">
              <input 
                type="checkbox" 
                id="param-animate-dashed" 
                checked={animateDashed}
                onChange={(e) => setAnimateDashed(e.target.checked)}
              />
              <span>Dashed Flow (虚线动效)</span>
            </label>
            <label className="settings-toggle-label">
              <input 
                type="checkbox" 
                id="param-animate-solid" 
                checked={animateSolid}
                onChange={(e) => setAnimateSolid(e.target.checked)}
              />
              <span>Solid Flow (实线动效)</span>
            </label>
          </div>
        </div>
      </div>
      
      <div className="editor-container">
        <textarea 
          id="json-editor" 
          spellCheck="false" 
          value={editorText}
          onChange={(e) => updateEditorText(e.target.value)}
          onKeyDown={handleKeyDown}
        />
      </div>
      
      <div className="status-bar">
        <div 
          id="json-status" 
          className={jsonStatus.isValid ? 'status-valid' : 'status-invalid'}
        >
          <span className="status-icon">●</span> {jsonStatus.message}
        </div>
        <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
          Tab indent: 2 spaces
        </div>
      </div>
    </div>
  );
};
