import React from 'react';
import { useAppStore } from '../store/appStore';
import { Play, Download, Image as ImageIcon, Video } from 'lucide-react';

interface HeaderProps {
  onExportSvg: () => void;
  onExportPng: () => void;
  onExportGif: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onExportSvg,
  onExportPng,
  onExportGif
}) => {
  const {
    activeFile,
    fileList,
    setActiveFile,
    animationsEnabled,
    setAnimationsEnabled,
    isExportingGif,
    gifProgress
  } = useAppStore();

  const handleFileChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setActiveFile(e.target.value);
  };

  return (
    <header>
      <div className="brand">
        <div className="brand-logo">FLOWCR\FT</div>
        <div className="brand-divider">/</div>
        <div className="brand-subtitle">Diagram Generator</div>
      </div>
      
      <div className="actions">
        <div className="select-wrapper">
          <select id="file-select" value={activeFile} onChange={handleFileChange}>
            {fileList.map((file) => (
              <option key={file} value={file}>
                {file}
              </option>
            ))}
          </select>
        </div>
        
        <button 
          id="btn-toggle-animation" 
          className={`btn ${animationsEnabled ? 'btn-active' : ''}`}
          onClick={() => setAnimationsEnabled(!animationsEnabled)}
        >
          <Play 
            size={14} 
            fill={animationsEnabled ? 'currentColor' : 'none'} 
            stroke={animationsEnabled ? 'none' : 'currentColor'}
          />
          Flow Animation
        </button>
        
        <button id="btn-export-svg" className="btn" onClick={onExportSvg}>
          <Download size={14} />
          Export SVG
        </button>

        <button 
          id="btn-export-gif" 
          className="btn" 
          onClick={onExportGif}
          disabled={isExportingGif}
        >
          <Video size={14} />
          {isExportingGif 
            ? `Compiling (${Math.round(gifProgress * 100)}%)...` 
            : 'Export GIF'
          }
        </button>
        
        <button id="btn-export-png" className="btn btn-primary" onClick={onExportPng}>
          <ImageIcon size={14} />
          Export PNG
        </button>
      </div>
    </header>
  );
};
