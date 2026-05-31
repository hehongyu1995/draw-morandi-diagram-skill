import React from 'react';
import { useAppStore } from '../store/appStore';
import { updateStaticDots } from './canvas/animation/staticDots';
import { FlowchartCanvas } from './canvas/flowchart/FlowchartCanvas';
import { useCanvasInteraction } from './canvas/hooks/useCanvasInteraction';
import { SequenceCanvas } from './canvas/sequence/SequenceCanvas';

interface CanvasProps {
  exportTime?: number | null;
  svgRef: React.RefObject<SVGSVGElement | null>;
}

export const Canvas: React.FC<CanvasProps> = ({ exportTime = null, svgRef }) => {
  const {
    currentData,
    animationsEnabled,
    bypassMargin,
    animateDashed,
    animateSolid,
    dragNodes,
    updateConnectionOffset,
    defaultCurvature
  } = useAppStore();

  React.useLayoutEffect(() => {
    if (exportTime !== null && svgRef.current) {
      updateStaticDots(svgRef.current, exportTime, currentData?.type === 'sequence');
    }
  }, [exportTime, currentData, svgRef]);

  const {
    selectedNodeIds,
    marquee,
    hoveredConnIdx,
    setHoveredConnIdx,
    draggedAnchor,
    setDraggedAnchor,
    handleMouseDown
  } = useCanvasInteraction({
    currentData,
    svgRef,
    dragNodes,
    updateConnectionOffset
  });

  if (!currentData) {
    return (
      <div className="canvas-container">
        <div className="canvas-wrapper" style={{ width: '800px', height: '400px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <p style={{ color: 'var(--text-secondary)' }}>No Diagram Data Loaded</p>
        </div>
      </div>
    );
  }

  const width = currentData.width || 800;
  const height = currentData.height || (currentData.type === 'sequence' ? 500 : 400);
  const isStaticExport = exportTime !== null;

  if (currentData.type === 'sequence') {
    return (
      <SequenceCanvas
        currentData={currentData}
        width={width}
        height={height}
        svgRef={svgRef}
        onMouseDown={handleMouseDown}
        selectedNodeIds={selectedNodeIds}
        marquee={marquee}
        animationsEnabled={animationsEnabled}
        animateDashed={animateDashed}
        animateSolid={animateSolid}
        exportTime={exportTime}
        isStaticExport={isStaticExport}
      />
    );
  }

  return (
    <FlowchartCanvas
      currentData={currentData}
      width={width}
      height={height}
      svgRef={svgRef}
      onMouseDown={handleMouseDown}
      selectedNodeIds={selectedNodeIds}
      marquee={marquee}
      animationsEnabled={animationsEnabled}
      animateDashed={animateDashed}
      animateSolid={animateSolid}
      hoveredConnIdx={hoveredConnIdx}
      setHoveredConnIdx={setHoveredConnIdx}
      draggedAnchor={draggedAnchor}
      setDraggedAnchor={setDraggedAnchor}
      defaultCurvature={defaultCurvature}
      bypassMargin={bypassMargin}
      exportTime={exportTime}
      isStaticExport={isStaticExport}
    />
  );
};
