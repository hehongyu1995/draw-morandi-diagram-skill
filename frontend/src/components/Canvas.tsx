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
    renderedData,
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
      updateStaticDots(svgRef.current, exportTime, renderedData?.type === 'sequence');
    }
  }, [exportTime, renderedData, svgRef]);

  const {
    selectedNodeIds,
    marquee,
    hoveredConnIdx,
    setHoveredConnIdx,
    draggedAnchor,
    setDraggedAnchor,
    handleMouseDown
  } = useCanvasInteraction({
    currentData: renderedData,
    svgRef,
    dragNodes,
    updateConnectionOffset
  });

  if (!renderedData) {
    return (
      <div className="canvas-container">
        <div className="canvas-wrapper" style={{ width: '800px', height: '400px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <p style={{ color: 'var(--text-secondary)' }}>No Diagram Data Loaded</p>
        </div>
      </div>
    );
  }

  const width = renderedData.width || 800;
  const height = renderedData.height || (renderedData.type === 'sequence' ? 500 : 400);
  const isStaticExport = exportTime !== null;

  if (renderedData.type === 'sequence') {
    return (
      <SequenceCanvas
        currentData={renderedData}
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
      currentData={renderedData}
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
