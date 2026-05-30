// FlowCraft Diagram App Logic

// UI Elements
const jsonEditor = document.getElementById('json-editor');
const jsonStatus = document.getElementById('json-status');
const fileSelect = document.getElementById('file-select');
const svgRender = document.getElementById('svg-render');
const canvasWrapper = document.getElementById('canvas-wrapper');
const btnExportSvg = document.getElementById('btn-export-svg');
const btnExportPng = document.getElementById('btn-export-png');
const btnToggleAnimation = document.getElementById('btn-toggle-animation');
const helpToggle = document.getElementById('help-toggle');
const helpModal = document.getElementById('help-modal');

let currentData = null;
let draggedNodeId = null;
let dragOffset = { x: 0, y: 0 };
let activeFile = 'diagram.json';
let animationsEnabled = localStorage.getItem('animationsEnabled') !== 'false';

// Initialize App
function init() {
  // Populate File Selector from Workspace
  populateFileList().then(() => {
    loadDiagramJson();
  });

  // Setup Poll Loop to auto-sync modifications from workspace (AI edits)
  setInterval(pollDiagramJson, 1500);

  // Initialize Animation Button State
  if (animationsEnabled) {
    btnToggleAnimation.classList.add('btn-active');
  } else {
    btnToggleAnimation.classList.remove('btn-active');
  }

  // Setup Event Listeners
  jsonEditor.addEventListener('input', handleEditorInput);
  fileSelect.addEventListener('change', (e) => {
    activeFile = e.target.value;
    loadDiagramJson();
  });
  
  btnExportSvg.addEventListener('click', exportSvg);
  btnExportPng.addEventListener('click', exportPng);
  btnToggleAnimation.addEventListener('click', toggleAnimations);
  
  helpToggle.addEventListener('click', () => {
    const isVisible = helpModal.style.display === 'block';
    helpModal.style.display = isVisible ? 'none' : 'block';
  });

  // Handle outside click to close modal
  document.addEventListener('click', (e) => {
    if (!helpModal.contains(e.target) && e.target !== helpToggle) {
      helpModal.style.display = 'none';
    }
  });

  // Handle Tab key inside editor
  jsonEditor.addEventListener('keydown', function(e) {
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = this.selectionStart;
      const end = this.selectionEnd;
      this.value = this.value.substring(0, start) + "  " + this.value.substring(end);
      this.selectionStart = this.selectionEnd = start + 2;
      handleEditorInput();
    }
  });

function toggleAnimations() {
  animationsEnabled = !animationsEnabled;
  localStorage.setItem('animationsEnabled', animationsEnabled);
  console.log('FlowCraft: Animations toggled. Enabled:', animationsEnabled);
  
  if (animationsEnabled) {
    btnToggleAnimation.classList.add('btn-active');
    svgRender.classList.add('animations-active');
  } else {
    btnToggleAnimation.classList.remove('btn-active');
    svgRender.classList.remove('animations-active');
  }
}

  // Helper to find a node/participant by ID
  function findNodeById(id) {
    if (!currentData) return null;
    let found = (currentData.nodes || []).find(n => n.id === id);
    if (!found) {
      found = (currentData.participants || []).find(p => p.id === id);
    }
    return found;
  }

  // --- DRAG & DROP CONTROLLER (REGISTERED ONCE) ---
  svgRender.addEventListener('mousedown', (e) => {
    const shape = e.target.closest('.node-shape');
    if (!shape) return;
    draggedNodeId = shape.getAttribute('data-id');
    const node = findNodeById(draggedNodeId);
    if (node) {
      const rect = svgRender.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      
      dragOffset.x = mouseX - node.x;
      dragOffset.y = mouseY - node.y;
    }
    e.preventDefault();
  });

  let renderPending = false;
  document.addEventListener('mousemove', (e) => {
    if (!draggedNodeId || !currentData) return;
    const node = findNodeById(draggedNodeId);
    if (node) {
      const rect = svgRender.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      
      node.x = Math.round(mouseX - dragOffset.x);
      if (currentData.type === 'sequence') {
        node.y = 50; // Lock vertical coordinate for sequence participants
      } else {
        node.y = Math.round(mouseY - dragOffset.y);
      }
      
      if (!renderPending) {
        renderPending = true;
        requestAnimationFrame(() => {
          renderDiagram();
          renderPending = false;
        });
      }
    }
  });

  document.addEventListener('mouseup', () => {
    if (draggedNodeId) {
      draggedNodeId = null;
      // Sync editor text ONLY when drag transaction completes (mouseup) to avoid layout thrashing
      jsonEditor.value = JSON.stringify(currentData, null, 2);
      saveDiagramJson(currentData);
    }
  });
}

async function populateFileList() {
  try {
    const res = await fetch('/list');
    if (!res.ok) return;
    const files = await res.json();
    
    fileSelect.innerHTML = '';
    files.forEach(f => {
      const opt = document.createElement('option');
      opt.value = f;
      opt.textContent = f;
      fileSelect.appendChild(opt);
    });
    
    if (files.includes(activeFile)) {
      fileSelect.value = activeFile;
    } else if (files.length > 0) {
      activeFile = files[0];
      fileSelect.value = activeFile;
    }
  } catch (err) {
    updateStatus(false, "Failed to load workspace file list");
  }
}

let lastSaveTime = 0;

async function saveDiagramJson(data) {
  lastSaveTime = Date.now();
  try {
    const res = await fetch(`/save?file=${encodeURIComponent(activeFile)}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
    if (res.ok) {
      updateStatus(true, `Auto-saved to ${activeFile}`);
    } else {
      updateStatus(false, "Failed to save: " + await res.text());
    }
  } catch (err) {
    updateStatus(false, "Save error: " + err.message);
  }
}

async function loadDiagramJson() {
  try {
    // Add cache buster to prevent stale loads
    const res = await fetch(activeFile + '?t=' + Date.now());
    if (!res.ok) {
      updateStatus(false, `HTTP Error ${res.status}: Failed to fetch ${activeFile}`);
      return false;
    }
    const text = await res.text();
    try {
      const json = JSON.parse(text);
      currentData = json;
      jsonEditor.value = JSON.stringify(currentData, null, 2);
      updateStatus(true, `Loaded workspace ${activeFile}`);
      renderDiagram();
      return true;
    } catch (parseErr) {
      // Put the raw invalid text so the user can inspect it
      jsonEditor.value = text;
      updateStatus(false, `Syntax Error in ${activeFile}: ${parseErr.message}`);
      
      // Render an error message inside the canvas wrapper
      const w = currentData ? (currentData.width || 800) : 800;
      const h = currentData ? (currentData.height || 400) : 400;
      svgRender.setAttribute('width', w);
      svgRender.setAttribute('height', h);
      svgRender.setAttribute('viewBox', `0 0 ${w} ${h}`);
      canvasWrapper.style.width = `${w}px`;
      canvasWrapper.style.height = `${h}px`;
      
      svgRender.innerHTML = `
        <rect width="100%" height="100%" fill="#fcf8f7" stroke="#e5c3c0" stroke-width="1.5" rx="4" />
        <text x="50%" y="45%" text-anchor="middle" dominant-baseline="central" fill="#964b3a" font-family="'Newsreader', Georgia, serif" font-size="16px" font-weight="700">JSON Render Error</text>
        <text x="50%" y="55%" text-anchor="middle" dominant-baseline="central" fill="#b03a2e" font-family="system-ui, sans-serif" font-size="12px" font-weight="500">${parseErr.message}</text>
      `;
      return false;
    }
  } catch (err) {
    updateStatus(false, `Error loading ${activeFile}: ${err.message}`);
    return false;
  }
}

async function pollDiagramJson() {
  // If user is actively typing, dragging, or saved recently, pause auto-syncing to avoid race conditions
  if (document.activeElement === jsonEditor || draggedNodeId || (Date.now() - lastSaveTime < 2500)) {
    return;
  }
  try {
    // Add cache buster to bypass browser request caching
    const res = await fetch(activeFile + '?t=' + Date.now());
    if (!res.ok) return;
    const text = await res.text();
    try {
      const json = JSON.parse(text);
      const currentStr = JSON.stringify(currentData);
      const newStr = JSON.stringify(json);
      if (currentStr !== newStr) {
        currentData = json;
        jsonEditor.value = JSON.stringify(currentData, null, 2);
        updateStatus(true, `Auto-synced with ${activeFile}`);
        renderDiagram();
      }
    } catch (parseErr) {
      // Sync status only, don't overwrite user preview unless loading initially
      updateStatus(false, `Disk File Syntax Error (${activeFile}): ${parseErr.message}`);
    }
  } catch (err) {
    // Fail silently during polling
  }
}

const THEMES = {
  red: {
    bg: '#f3e8e2',
    border: '#dcbdaf',
    text: '#8a5a44'
  },
  green: {
    bg: '#e8ebe4',
    border: '#c4ceb8',
    text: '#556f44'
  },
  blue: {
    bg: '#e5ebf0',
    border: '#bccad6',
    text: '#4b6584'
  },
  gray: {
    bg: '#efede8',
    border: '#d3cecf',
    text: '#6b645d'
  }
};

let saveTimeout = null;
function handleEditorInput() {
  try {
    const parsed = JSON.parse(jsonEditor.value);
    currentData = parsed;
    updateStatus(true, "JSON Valid");
    renderDiagram();
    
    // Debounce save to workspace file (1s)
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => {
      saveDiagramJson(currentData);
    }, 1000);
  } catch (err) {
    updateStatus(false, "Invalid JSON: " + err.message);
  }
}

function updateStatus(isValid, msg) {
  jsonStatus.className = isValid ? 'status-valid' : 'status-invalid';
  jsonStatus.innerHTML = `<span class="status-icon">●</span> ${msg}`;
}

// Compute boundaries & offsets for connector lines
function getNodeEdge(node, direction) {
  const radius = node.type === 'circle' ? 25 : 0;
  const w = node.type === 'circle' ? radius * 2 : (node.width || 110);
  const h = node.type === 'circle' ? radius * 2 : (node.height || 50);

  if (direction === 'right') return { x: node.x + w/2, y: node.y };
  if (direction === 'left') return { x: node.x - w/2, y: node.y };
  if (direction === 'top') return { x: node.x, y: node.y - h/2 };
  if (direction === 'bottom') return { x: node.x, y: node.y + h/2 };
  return { x: node.x, y: node.y };
}

function getConnectionEndpoints(nodeA, nodeB, fromOffset = [0, 0], toOffset = [0, 0]) {
  const hasFromOffset = fromOffset[0] !== 0 || fromOffset[1] !== 0;
  const hasToOffset = toOffset[0] !== 0 || toOffset[1] !== 0;

  // When an offset is specified, compute the anchor as the nearest node edge
  // in the offset direction, then apply the offset from the node center.
  // This allows skip connections to attach to specific sides of nodes.
  function getOffsetAnchor(node, offset) {
    const w = node.type === 'circle' ? 50 : (node.width || 110);
    const h = node.type === 'circle' ? 50 : (node.height || 50);
    // Determine which edge to anchor based on offset direction
    let x = node.x;
    let y = node.y;
    if (Math.abs(offset[0]) > Math.abs(offset[1])) {
      // Horizontal offset dominant — attach to left or right edge
      x = offset[0] > 0 ? node.x + w / 2 : node.x - w / 2;
    } else if (Math.abs(offset[1]) > Math.abs(offset[0])) {
      // Vertical offset dominant — attach to top or bottom edge
      y = offset[1] > 0 ? node.y + h / 2 : node.y - h / 2;
    }
    return { x, y };
  }

  let start, end;

  if (hasFromOffset) {
    start = getOffsetAnchor(nodeA, fromOffset);
  } else {
    const dx = nodeB.x - nodeA.x;
    const dy = nodeB.y - nodeA.y;
    if (Math.abs(dx) >= Math.abs(dy)) {
      start = dx > 0 ? getNodeEdge(nodeA, 'right') : getNodeEdge(nodeA, 'left');
    } else {
      start = dy > 0 ? getNodeEdge(nodeA, 'bottom') : getNodeEdge(nodeA, 'top');
    }
  }

  if (hasToOffset) {
    end = getOffsetAnchor(nodeB, toOffset);
  } else {
    const dx = nodeB.x - nodeA.x;
    const dy = nodeB.y - nodeA.y;
    if (Math.abs(dx) >= Math.abs(dy)) {
      end = dx > 0 ? getNodeEdge(nodeB, 'left') : getNodeEdge(nodeB, 'right');
    } else {
      end = dy > 0 ? getNodeEdge(nodeB, 'top') : getNodeEdge(nodeB, 'bottom');
    }
  }

  return {
    x1: start.x,
    y1: start.y,
    x2: end.x,
    y2: end.y
  };
}

// Main rendering engine
function renderDiagram() {
  if (!currentData) return;

  if (currentData.type === 'sequence') {
    renderSequence();
    return;
  }

  const width = currentData.width || 800;
  const height = currentData.height || 400;

  // Set sizing
  svgRender.setAttribute('width', width);
  svgRender.setAttribute('height', height);
  svgRender.setAttribute('viewBox', `0 0 ${width} ${height}`);
  
  canvasWrapper.style.width = `${width}px`;
  canvasWrapper.style.height = `${height}px`;

  if (animationsEnabled) {
    svgRender.classList.add('animations-active');
  } else {
    svgRender.classList.remove('animations-active');
  }

  // Setup default markers and styling elements
  let svgContent = `
    <defs>
      <!-- Arrowheads -->
      <marker id="arrow-solid" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
        <path d="M 1 2.5 L 7 5 L 1 7.5 Z" fill="#6e6a5f" stroke="#6e6a5f" stroke-width="1" stroke-linejoin="round" stroke-linecap="round" />
      </marker>
    </defs>
    
    <style>
      .node-text {
        font-family: 'Newsreader', Georgia, serif;
        font-size: 14px;
        font-weight: 600;
        text-anchor: middle;
        dominant-baseline: central;
        user-select: none;
      }
      .node-text-multiline {
        font-family: 'Newsreader', Georgia, serif;
        font-size: 13px;
        font-weight: 600;
        text-anchor: middle;
        user-select: none;
      }
      .node-shape {
        stroke-width: 1.5;
        cursor: grab;
        filter: drop-shadow(0px 2px 4px rgba(25, 24, 22, 0.02));
        transition: transform 0.1s ease;
      }
      .node-shape:active {
        cursor: grabbing;
      }
      .connection-line {
        fill: none;
        stroke: #6e6a5f;
        stroke-width: 1.5;
      }
      .connection-line-animated {
        /* Animated when svg.animations-active */
      }
      .animations-active .connection-line-animated {
        animation: flow-dash 3s linear infinite;
      }
      .connection-flow-overlay {
        fill: none;
        stroke: #191816;
        opacity: 0.18;
        stroke-width: 2.2;
        stroke-dasharray: 6 18;
        stroke-linecap: round;
        pointer-events: none;
        display: none;
      }
      .animations-active .connection-flow-overlay {
        display: block;
        animation: flow-dash 3s linear infinite;
      }
      @keyframes flow-dash {
        to {
          stroke-dashoffset: -120px;
        }
      }
    </style>

    <!-- Canvas Background -->
    <rect width="100%" height="100%" fill="#faf8f5" />
  `;

  const nodeMap = new Map();
  currentData.nodes.forEach(node => nodeMap.set(node.id, node));

  // 1. Draw Connections
  if (currentData.connections) {
    currentData.connections.forEach(conn => {
      const nodeA = nodeMap.get(conn.from);
      const nodeB = nodeMap.get(conn.to);
      if (!nodeA || !nodeB) return;

      const fromOff = conn.fromOffset || [0, 0];
      const toOff = conn.toOffset || [0, 0];
      const { x1, y1, x2, y2 } = getConnectionEndpoints(nodeA, nodeB, fromOff, toOff);

      let d = '';
      if (conn.curve === 'bezier') {
        const dx = x2 - x1;
        const dy = y2 - y1;
        const hasOffset = (fromOff[0] !== 0 || fromOff[1] !== 0 || toOff[0] !== 0 || toOff[1] !== 0);

        if (hasOffset && Math.abs(dy) > Math.abs(dx)) {
          // Side-running vertical bezier (e.g. residual skip connections)
          // Scan all nodes to find the widest one between y1 and y2, then bow outward to clear it
          const minY = Math.min(y1, y2);
          const maxY = Math.max(y1, y2);
          const side = (x1 < nodeA.x) ? 'left' : 'right'; // which side of the diagram

          let maxClearanceX = Math.max(Math.abs(x1 - nodeA.x), Math.abs(x2 - nodeB.x));
          currentData.nodes.forEach(n => {
            const nw = n.type === 'circle' ? 50 : (n.width || 110);
            const nh = n.type === 'circle' ? 50 : (n.height || 50);
            const nTop = n.y - nh / 2;
            const nBot = n.y + nh / 2;
            // Check if this node is vertically between the two endpoints
            if (nBot > minY && nTop < maxY) {
              const nodeEdgeX = side === 'left' ? (n.x - nw / 2) : (n.x + nw / 2);
              const dist = Math.abs(nodeEdgeX - nodeA.x) + 15; // 15px clearance margin
              if (dist > maxClearanceX) maxClearanceX = dist;
            }
          });

          const bowX = side === 'left' ? (nodeA.x - maxClearanceX) : (nodeA.x + maxClearanceX);
          d = `M ${x1} ${y1} C ${bowX} ${y1}, ${bowX} ${y2}, ${x2} ${y2}`;
        } else if (Math.abs(dx) >= Math.abs(dy)) {
          // Horizontal Bezier
          const ctrlOffset = Math.max(40, Math.abs(dx) * 0.45);
          d = `M ${x1} ${y1} C ${x1 + (dx > 0 ? ctrlOffset : -ctrlOffset)} ${y1}, ${x2 - (dx > 0 ? ctrlOffset : -ctrlOffset)} ${y2}, ${x2} ${y2}`;
        } else {
          // Standard Vertical Bezier
          const ctrlOffset = Math.max(40, Math.abs(dy) * 0.45);
          d = `M ${x1} ${y1} C ${x1} ${y1 + (dy > 0 ? ctrlOffset : -ctrlOffset)}, ${x2} ${y2 - (dy > 0 ? ctrlOffset : -ctrlOffset)}, ${x2} ${y2}`;
        }
      } else {
        // Straight line
        d = `M ${x1} ${y1} L ${x2} ${y2}`;
      }

      let strokeDash = '';
      let strokeLineCap = '';
      let isDashedOrDotted = false;
      if (conn.lineType === 'dashed') {
        strokeDash = 'stroke-dasharray="4 4"';
        isDashedOrDotted = true;
      } else if (conn.lineType === 'dotted') {
        strokeDash = 'stroke-dasharray="2 3"';
        strokeLineCap = 'stroke-linecap="round"';
        isDashedOrDotted = true;
      }

      const animateConn = conn.animate !== false;
      const animClass = (animateConn && isDashedOrDotted) ? ' connection-line-animated' : '';

      svgContent += `
        <path d="${d}" class="connection-line${animClass}" ${strokeDash} ${strokeLineCap} marker-end="url(#arrow-solid)" />
      `;

      if (animateConn && !isDashedOrDotted) {
        svgContent += `
          <path d="${d}" class="connection-flow-overlay" />
        `;
      }
    });
  }

  // 2. Draw Nodes
  currentData.nodes.forEach(node => {
    const theme = THEMES[node.theme] || THEMES.gray;
    const rx = node.type === 'circle' ? 25 : 0;
    const w = node.type === 'circle' ? 50 : (node.width || 110);
    const h = node.type === 'circle' ? 50 : (node.height || 50);

    let nodeEl = '';
    if (node.type === 'circle') {
      nodeEl = `<circle cx="${node.x}" cy="${node.y}" r="25" fill="${theme.bg}" stroke="${theme.border}" class="node-shape" data-id="${node.id}" />`;
    } else if (node.type === 'capsule') {
      const radius = h / 2;
      nodeEl = `<rect x="${node.x - w/2}" y="${node.y - h/2}" width="${w}" height="${h}" rx="${radius}" fill="${theme.bg}" stroke="${theme.border}" class="node-shape" data-id="${node.id}" />`;
    } else {
      // standard rounded rectangle
      nodeEl = `<rect x="${node.x - w/2}" y="${node.y - h/2}" width="${w}" height="${h}" rx="3" fill="${theme.bg}" stroke="${theme.border}" class="node-shape" data-id="${node.id}" />`;
    }

    // Process multiline text label
    const lines = (node.label || '').split(/\r?\n|\\n/);
    let textEl = '';
    if (lines.length > 1) {
      const startDy = -(lines.length - 1) * 9 + 4;
      textEl = `<text x="${node.x}" y="${node.y}" text-anchor="middle" fill="${theme.text}" class="node-text-multiline">`;
      lines.forEach((line, idx) => {
        textEl += `<tspan x="${node.x}" dy="${idx === 0 ? startDy : 18}" text-anchor="middle">${line}</tspan>`;
      });
      textEl += `</text>`;
    } else {
      textEl = `<text x="${node.x}" y="${node.y}" text-anchor="middle" dominant-baseline="central" fill="${theme.text}" class="node-text">${node.label}</text>`;
    }

    svgContent += `
      <g class="node-group" id="node-g-${node.id}">
        ${nodeEl}
        ${textEl}
      </g>
    `;
  });

  svgRender.innerHTML = svgContent;
}

// Export functions
function getStyledSvgString() {
  const serializer = new XMLSerializer();
  return serializer.serializeToString(svgRender);
}

function exportSvg() {
  const svgStr = getStyledSvgString();
  const blob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = `${activeFile.replace('.json', '')}.svg`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function exportPng() {
  const width = currentData.width || 800;
  const height = currentData.height || 400;
  
  const svgStr = getStyledSvgString();
  const blob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  
  const img = new Image();
  img.onload = () => {
    const canvas = document.createElement('canvas');
    canvas.width = width * 2; // Double resolution for crystal-clear render
    canvas.height = height * 2;
    const ctx = canvas.getContext('2d');
    ctx.scale(2, 2);
    
    ctx.drawImage(img, 0, 0);
    
    canvas.toBlob((pngBlob) => {
      const pngUrl = URL.createObjectURL(pngBlob);
      const link = document.createElement('a');
      link.href = pngUrl;
      link.download = `${activeFile.replace('.json', '')}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(pngUrl);
    }, 'image/png');
    
    URL.revokeObjectURL(url);
  };
  
  img.src = url;
}

// Sequence diagram rendering engine
function renderSequence() {
  const width = currentData.width || 800;
  const height = currentData.height || 500;

  svgRender.setAttribute('width', width);
  svgRender.setAttribute('height', height);
  svgRender.setAttribute('viewBox', `0 0 ${width} ${height}`);
  
  canvasWrapper.style.width = `${width}px`;
  canvasWrapper.style.height = `${height}px`;

  if (animationsEnabled) {
    svgRender.classList.add('animations-active');
  } else {
    svgRender.classList.remove('animations-active');
  }

  // Base setup
  let svgContent = `
    <defs>
      <!-- Arrowheads -->
      <marker id="arrow-solid" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
        <path d="M 1 2.5 L 7 5 L 1 7.5 Z" fill="#6e6a5f" stroke="#6e6a5f" stroke-width="1" stroke-linejoin="round" stroke-linecap="round" />
      </marker>
      <marker id="arrow-thin" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
        <path d="M 1 2.5 L 7 5 L 1 7.5" fill="none" stroke="#8e8a7e" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round" />
      </marker>
    </defs>
    
    <style>
      .node-text {
        font-family: 'Newsreader', Georgia, serif;
        font-size: 14px;
        font-weight: 600;
        text-anchor: middle;
        dominant-baseline: central;
        user-select: none;
      }
      .node-text-multiline {
        font-family: 'Newsreader', Georgia, serif;
        font-size: 13px;
        font-weight: 600;
        text-anchor: middle;
        user-select: none;
      }
      .message-text {
        font-family: 'Inter', system-ui, sans-serif;
        font-size: 11px;
        font-weight: 500;
        fill: #6e6a5f;
        user-select: none;
      }
      .node-shape {
        stroke-width: 1.5;
        cursor: grab;
        filter: drop-shadow(0px 2px 4px rgba(25, 24, 22, 0.02));
      }
      .node-shape:active {
        cursor: grabbing;
      }
      .lifeline {
        stroke: #dcd9cf;
        stroke-width: 1.5;
        stroke-dasharray: 4 4;
      }
      .activation-bar {
        fill: #f1ede4;
        stroke: #d5d1c6;
        stroke-width: 1.2;
      }
      .message-line {
        fill: none;
        stroke-width: 1.5;
      }
      .message-line-animated {
        /* Animated when svg.animations-active */
      }
      .animations-active .message-line-animated {
        animation: flow-dash 3s linear infinite;
      }
      .message-flow-overlay {
        fill: none;
        stroke: #191816;
        opacity: 0.18;
        stroke-width: 2.2;
        stroke-dasharray: 6 18;
        stroke-linecap: round;
        pointer-events: none;
        display: none;
      }
      .animations-active .message-flow-overlay {
        display: block;
        animation: flow-dash 3s linear infinite;
      }
      @keyframes flow-dash {
        to {
          stroke-dashoffset: -120px;
        }
      }
    </style>

    <!-- Canvas Background -->
    <rect width="100%" height="100%" fill="#faf8f5" />
  `;

  const participants = currentData.participants || [];
  const N = participants.length;
  const participantMap = new Map();

  // 1. Calculate horizontal X coordinates for participants
  participants.forEach((part, idx) => {
    if (part.x === undefined || part.x === null) {
      part.x = Math.round(100 + idx * (width - 200) / Math.max(1, N - 1));
    }
    // Lock header y coordinate at 50
    part.y = 50;
    part.type = part.type || 'capsule'; // default header is capsule
    part.width = part.width || 120;
    part.height = part.height || 45;
    participantMap.set(part.id, part);
  });

  // 2. Draw Lifelines
  participants.forEach(part => {
    svgContent += `
      <line x1="${part.x}" y1="${part.y + part.height/2}" x2="${part.x}" y2="${height - 40}" class="lifeline" />
    `;
  });

  // 3. Draw Activation Bars
  if (currentData.activations) {
    currentData.activations.forEach(act => {
      const part = participantMap.get(act.participant);
      if (!part) return;
      
      const barW = 12;
      const startY = act.start;
      const endY = act.end;
      svgContent += `
        <rect x="${part.x - barW/2}" y="${startY}" width="${barW}" height="${endY - startY}" rx="2" class="activation-bar" />
      `;
    });
  }

  // 4. Draw Messages
  if (currentData.messages) {
    currentData.messages.forEach(msg => {
      const partA = participantMap.get(msg.from);
      const partB = participantMap.get(msg.to);
      if (!partA || !partB) return;

      const isSelf = msg.from === msg.to;
      const stroke = msg.lineType === 'dashed' ? '#8e8a7e' : '#6e6a5f';
      const strokeDash = msg.lineType === 'dashed' ? 'stroke-dasharray="4 4"' : '';
      const marker = msg.lineType === 'dashed' ? 'url(#arrow-thin)' : 'url(#arrow-solid)';

      if (isSelf) {
        // Self message loop
        const x = partA.x + 6;
        const y1 = msg.y;
        const y2 = msg.y + 25;
        const d = `M ${x} ${y1} C ${x + 40} ${y1}, ${x + 40} ${y2}, ${x} ${y2}`;
        
        svgContent += `
          <path d="${d}" class="message-line${animClass}" stroke="${stroke}" ${strokeDash} marker-end="${marker}" />
        `;
        if (animateMsg && !isDashedOrDotted) {
          svgContent += `
            <path d="${d}" class="message-flow-overlay" />
          `;
        }
        svgContent += `
          <text x="${x + 45}" y="${y1 + 14}" class="message-text" text-anchor="start" dominant-baseline="central">${msg.label}</text>
        `;
      } else {
        // Normal horizontal line
        const dx = partB.x - partA.x;
        const startX = dx > 0 ? partA.x + 6 : partA.x - 6;
        const endX = dx > 0 ? partB.x - 6 : partB.x + 6;
        const d = `M ${startX} ${msg.y} L ${endX} ${msg.y}`;

        svgContent += `
          <path d="${d}" class="message-line${animClass}" stroke="${stroke}" ${strokeDash} marker-end="${marker}" />
        `;
        if (animateMsg && !isDashedOrDotted) {
          svgContent += `
            <path d="${d}" class="message-flow-overlay" />
          `;
        }
        svgContent += `
          <text x="${(startX + endX) / 2}" y="${msg.y - 7}" class="message-text" text-anchor="middle" dominant-baseline="auto">${msg.label}</text>
        `;
      }
    });
  }

  // 5. Draw Participant Headers
  participants.forEach(part => {
    const theme = THEMES[part.theme] || THEMES.gray;
    const w = part.width;
    const h = part.height;

    let nodeEl = '';
    const radius = h / 2;
    nodeEl = `<rect x="${part.x - w/2}" y="${part.y - h/2}" width="${w}" height="${h}" rx="${radius}" fill="${theme.bg}" stroke="${theme.border}" class="node-shape" data-id="${part.id}" />`;

    const lines = (part.label || '').split(/\r?\n|\\n/);
    let textEl = '';
    if (lines.length > 1) {
      const startDy = -(lines.length - 1) * 9 + 4;
      textEl = `<text x="${part.x}" y="${part.y}" text-anchor="middle" fill="${theme.text}" class="node-text-multiline">`;
      lines.forEach((line, idx) => {
        textEl += `<tspan x="${part.x}" dy="${idx === 0 ? startDy : 18}" text-anchor="middle">${line}</tspan>`;
      });
      textEl += `</text>`;
    } else {
      textEl = `<text x="${part.x}" y="${part.y}" text-anchor="middle" dominant-baseline="central" fill="${theme.text}" class="node-text">${part.label}</text>`;
    }

    svgContent += `
      <g class="node-group" id="node-g-${part.id}">
        ${nodeEl}
        ${textEl}
      </g>
    `;
  });

  svgRender.innerHTML = svgContent;
}

// Initialize on DOM load
window.addEventListener('DOMContentLoaded', init);
