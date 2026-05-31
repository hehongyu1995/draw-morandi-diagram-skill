import React from 'react';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <>
      <div 
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 8
        }}
        onClick={onClose}
      />
      <div className="help-modal" style={{ display: 'block' }}>
        <h3>Diagram Definition Schema</h3>
        <ul>
          <li><strong>width</strong>: Outer width of SVG canvas.</li>
          <li><strong>height</strong>: Outer height of SVG canvas.</li>
          <li><strong>nodes</strong>: List of nodes.
            <ul>
              <li><code>id</code>: Unique identifier.</li>
              <li><code>type</code>: <code>circle</code> | <code>rect</code> | <code>capsule</code> | <code>database</code> | <code>file</code> | <code>person</code> | <code>cloud</code>.</li>
              <li><code>theme</code>: <code>red</code> | <code>green</code> | <code>blue</code> | <code>gray</code>.</li>
              <li><code>x</code>, <code>y</code>: Coordinates of node center.</li>
              <li><code>width</code>, <code>height</code>: Dimensions.</li>
              <li><code>label</code>: Label text. Use <code>\n</code> for line breaks.</li>
            </ul>
          </li>
          <li><strong>connections</strong>: List of links between nodes.
            <ul>
              <li><code>from</code>, <code>to</code>: Node IDs.</li>
              <li><code>lineType</code>: <code>solid</code> | <code>dashed</code> | <code>dotted</code>.</li>
              <li><code>curve</code>: <code>straight</code> | <code>bezier</code>.</li>
              <li><code>fromOffset</code> / <code>toOffset</code>: <code>[dx, dy]</code> coordinates.</li>
            </ul>
          </li>
        </ul>
      </div>
    </>
  );
};
