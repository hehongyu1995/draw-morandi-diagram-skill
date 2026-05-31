import React, { useEffect, useRef, useState } from 'react';
import { useAppStore } from './store/appStore';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { Canvas } from './components/Canvas';
import { HelpModal } from './components/HelpModal';

declare global {
  interface Window {
    gifshot: any;
  }
}

const getStyledSvgString = (svgEl: SVGSVGElement) => {
  const serializer = new XMLSerializer();
  return serializer.serializeToString(svgEl);
};

export const App: React.FC = () => {
  const {
    sourceData,
    renderedData,
    activeFile,
    isExportingGif,
    init,
    setIsExportingGif,
    setGifProgress,
    loadSourceData
  } = useAppStore();

  const svgRef = useRef<SVGSVGElement>(null);
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  // Initialize store data from server API
  useEffect(() => {
    init();
  }, [init]);

  // Polling loop to sync server-side changes (e.g., from agent running server.py and editing files)
  useEffect(() => {
    const pollInterval = setInterval(async () => {
      const activeElementId = document.activeElement?.id;
      if (activeElementId === 'json-editor') {
        return; // Pause auto-syncing if the user is typing in the JSON editor
      }

      // Check if user is currently dragging a node shape to avoid layout jumping
      const svg = svgRef.current;
      const isDragging = svg?.querySelector('.node-shape:active') !== null;
      if (isDragging || isExportingGif) {
        return;
      }

      try {
        const res = await fetch(`/${activeFile}?t=${Date.now()}`);
        if (!res.ok) return;
        const text = await res.text();
        try {
          const json = JSON.parse(text);
          const currentStr = JSON.stringify(sourceData);
          const newStr = JSON.stringify(json);
          if (currentStr !== newStr) {
            loadSourceData(json, 'Auto-synced with workspace');
          }
        } catch (e) {
          useAppStore.setState({
            jsonStatus: { isValid: false, message: 'Disk File JSON Syntax Error' }
          });
        }
      } catch (err) {
        // Fail silently during background polling
      }
    }, 1500);

    return () => clearInterval(pollInterval);
  }, [activeFile, sourceData, isExportingGif, loadSourceData]);

  const handleExportSvg = () => {
    if (!svgRef.current) return;
    const svgStr = getStyledSvgString(svgRef.current);
    const blob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `${activeFile.replace('.json', '')}.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExportPng = () => {
    if (!renderedData || !svgRef.current) return;

    const width = renderedData.width || 800;
    const height = renderedData.height || 400;

    const svgStr = getStyledSvgString(svgRef.current);
    const blob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = width * 2; // 2x resolution for clean renders
      canvas.height = height * 2;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.scale(2, 2);
        ctx.drawImage(img, 0, 0);
        
        canvas.toBlob((pngBlob) => {
          if (pngBlob) {
            const pngUrl = URL.createObjectURL(pngBlob);
            const link = document.createElement('a');
            link.href = pngUrl;
            link.download = `${activeFile.replace('.json', '')}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(pngUrl);
          }
        }, 'image/png');
      }
      URL.revokeObjectURL(url);
    };
    img.src = url;
  };

  const handleExportGif = () => {
    if (!renderedData) return;

    setIsExportingGif(true);
    setGifProgress(0);

    const svg = svgRef.current;
    if (!svg) {
      setIsExportingGif(false);
      return;
    }

    const width = renderedData.width || 800;
    const height = renderedData.height || 400;

    const duration = 3; // 3 seconds
    const fps = 10;
    const totalFrames = duration * fps;
    const interval = 1 / fps;

    const frames: string[] = [];
    let currentFrame = 0;

    // Helper to capture a single frame by manually advancing coordinate time offsets on DOM
    const captureNextFrame = () => {
      if (currentFrame >= totalFrames) {
        // Trigger React re-render or let Canvas naturally update state to default SMIL animation
        setIsExportingGif(false);

        // Compile GIF via gifshot
        const gifshot = window.gifshot;
        if (!gifshot) {
          alert('Error: gifshot.min.js library is not loaded on page.');
          return;
        }

        gifshot.createGIF(
          {
            images: frames,
            gifWidth: width,
            gifHeight: height,
            interval: interval,
            numFrames: totalFrames,
            progressCallback: (progress: number) => {
              setGifProgress(progress);
            }
          },
          (obj: any) => {
            setIsExportingGif(false);
            if (!obj.error) {
              const link = document.createElement('a');
              link.href = obj.image;
              link.download = `${activeFile.replace('.json', '')}.gif`;
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
            } else {
              alert('Failed to generate GIF: ' + obj.errorMsg);
            }
          }
        );
        return;
      }

      const t = currentFrame * interval;

      // 1. Clone the SVG to avoid mutating the live animating document and to drop SMIL attributes
      const svgClone = svg.cloneNode(true) as SVGSVGElement;

      // 2. Remove all SMIL <animate> and <animateMotion> elements from clone to prevent them overriding static values
      const anims = svgClone.querySelectorAll('animate, animateMotion');
      anims.forEach(anim => anim.remove());

      // 3. Manually update dashed stroke dashoffset coordinate positions on clone
      const dashedPaths = svgClone.querySelectorAll('.connection-line, .message-line');
      dashedPaths.forEach(path => {
        const strokeDash = path.getAttribute('stroke-dasharray');
        if (strokeDash) {
          const dashOffset = ((t % 1.5) / 1.5) * -24;
          path.setAttribute('stroke-dashoffset', String(dashOffset));
        }
      });

      // 4. Manually calculate and apply point-along-path locations to dots on clone using live document paths for geometry math
      const dotsClone = svgClone.querySelectorAll('.flow-dot[data-path-id]');
      dotsClone.forEach(dot => {
        const pathId = dot.getAttribute('data-path-id');
        if (!pathId) return;
        const begin = dot.getAttribute('data-begin') || '0s';
        
        // Find geometry on the live SVG document
        const livePath = svg.getElementById(pathId) as SVGPathElement | null;
        if (livePath) {
          try {
            const len = livePath.getTotalLength();
            if (renderedData.type === 'sequence') {
              const dur = 1.5;
              const frac = (t % dur) / dur;
              const pt = livePath.getPointAtLength(len * frac);
              dot.setAttribute('cx', String(pt.x));
              dot.setAttribute('cy', String(pt.y));
            } else {
              const startOffset = begin.startsWith('-1.25') ? 1.25 : 0;
              const dur = 2.5;
              const frac = ((t + startOffset) % dur) / dur;
              const pt = livePath.getPointAtLength(len * frac);
              dot.setAttribute('cx', String(pt.x));
              dot.setAttribute('cy', String(pt.y));
            }
          } catch (e) {
            console.error('Error calculating path points:', e);
          }
        }
      });

      // 5. Serialize and draw to canvas snapshot
      const svgStr = getStyledSvgString(svgClone);
      const blob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);

      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          frames.push(canvas.toDataURL('image/png'));
        }
        URL.revokeObjectURL(url);
        currentFrame++;
        // Use timeout to yield thread to paint cycles
        setTimeout(captureNextFrame, 10);
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        currentFrame++;
        setTimeout(captureNextFrame, 10);
      };
      img.src = url;
    };

    setTimeout(captureNextFrame, 50);
  };

  return (
    <>
      <Header
        onExportSvg={handleExportSvg}
        onExportPng={handleExportPng}
        onExportGif={handleExportGif}
      />
      
      <div className="main-container">
        <Sidebar />
        
        <Canvas svgRef={svgRef} />
        
        {/* Help Panel & Toggle Modal */}
        <button 
          className="help-toggle" 
          onClick={() => setIsHelpOpen(prev => !prev)}
        >
          ?
        </button>
        <HelpModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
      </div>
    </>
  );
};

export default App;
