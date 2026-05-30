---
name: draw-diagram
description: Guides the generation of premium, highly-aesthetic flowcharts and UML sequence diagrams. Serves a live interactive preview server with a React-based UI.
---

# Draw Diagram Skill

Use this skill to draw or generate highly aesthetic flowcharts, architecture diagrams, or UML sequence diagrams matching the clean, warm editorial style of modern research blogs (e.g., Anthropic's blog).

---

## 1. Supported Charts

### A. Flowcharts & Architecture Diagrams
* **Nodes**: Circular, capsule (stadium), round-rectangular blocks, **database cylinders**, or **folded file documents**.
  * `circle`: Circular node.
  * `rect`: Rounded rectangular node.
  * `capsule`: Capsule/stadium shape.
  * `database`: Cylinder model representing database systems.
  * `file`: Folded/dog-eared sheet model representing files and document stores.
* **Connections**: Auto-routed straight lines or cubic Bezier curves connecting node borders.
  * **Visual Connection Snap Ports**: Connection endpoints are interactive and draggable. Nodes support 4 cardinal snap ports:
    * Top: `[0, -20]` (offset 20px above top border)
    * Bottom: `[0, 20]` (offset 20px below bottom border)
    * Left: `[-20, 0]` (offset 20px left of left border)
    * Right: `[20, 0]` (offset 20px right of right border)
    * Auto: `[0, 0]` (default, dynamically snaps based on relative position)
  * **Flowchart Connection Labels**: Optional `label` string on connection objects, rendered centered with dynamic-width background rect pills.
  * **Curvature Parameters**: Global curvature adjustments via the Sidebar slider. Per-connection overrides: `curvature` (both tangents), `fromCurvature` (start tangent), and `toCurvature` (end tangent) coefficients in JSON specs.
* **Line Styles**: Solid (default), dashed (`lineType: "dashed"`), or dotted (`lineType: "dotted"`).
* **Flow Animations**: Beautiful, direction-aware flowing dot overlays indicating control/data flow direction. Can be configured per connection or toggled globally.
* **Diagram Group Overlay boundary boxes (Subgraphs/Containers)**: Solid desaturated themed-border container boxes with semi-transparent desaturated background fills (25% opacity) that automatically wrap member nodes and calculate coordinates and sizes dynamically with a default padding layout.
* **Themes**: Predefined Morandi desaturated color themes (`red`, `green`, `blue`, `gray`).

### B. UML Sequence Diagrams (`type: "sequence"`)
* **Participants**: Horizontally placed lifelines (automatically spaced if `x` coordinates are omitted).
* **Activation Bars**: Highlight active execution segments on lifelines (can anchor dynamically to message references instead of absolute heights).
* **Messages**: Horizontal calls and return calls with automatic vertical spacing (autospacing) at 55px intervals (manual `y` placement is optional).
* **Diagram Group Overlay boundary boxes (Combined Fragments/Loops)**: Boundary frames wrapping message sequences, featuring solid themed borders, 25% opacity background fills, and foreground label tabs to prevent lifeline and activation overlaps.
* **Flow Animations**: Direction-aware flow overlays indicating sequential execution direction.

---

## 2. JSON Schema Specifications

Diagrams are defined in JSON files. The live preview server reads, renders, and writes to these files.

### A. Flowchart Schema

```json
{
  "width": 760,
  "height": 300,
  "nodes": [
    {
      "id": "in",
      "type": "circle",
      "theme": "red",
      "x": 150,
      "y": 150,
      "label": "In"
    },
    {
      "id": "db",
      "type": "database",
      "theme": "blue",
      "x": 290,
      "y": 150,
      "width": 110,
      "height": 70,
      "label": "User DB"
    }
  ],
  "connections": [
    {
      "from": "in",
      "to": "db",
      "lineType": "solid",
      "curve": "bezier",
      "fromOffset": [20, 0],
      "toOffset": [-20, 0],
      "curvature": 0.35,
      "label": "write query",
      "animate": true
    }
  ],
  "groups": [
    {
      "id": "data_layer",
      "label": "Data Retrieval & Processing",
      "nodeIds": ["db"],
      "theme": "gray"
    }
  ]
}
```

* **Node Properties**:
  * `id`: Unique identifier (string).
  * `type`: `"circle"` | `"rect"` | `"capsule"` | `"database"` | `"file"`.
  * `theme`: `"red"` (Terracotta) | `"green"` (Sage) | `"blue"` (Slate) | `"gray"` (Sand).
  * `x`, `y`: Absolute center coordinates.
  * `width`, `height`: Rect/capsule/database/file dimensions (standard: `110x50` for rects).
  * `label`: Text label. Use `\n` or `\\n` for multiline text.
* **Connection Properties**:
  * `from`, `to`: Node IDs.
  * `label`: Optional label text to render centered along the connection line.
  * `lineType`: `"solid"` | `"dashed"` | `"dotted"`.
  * `curve`: `"straight"` | `"bezier"`.
  * `fromOffset`, `toOffset`: Snap port offsets `[dx, dy]`. The standard snap port offset values are:
    * Top: `[0, -20]`
    * Bottom: `[0, 20]`
    * Left: `[-20, 0]`
    * Right: `[20, 0]`
    * Auto: `[0, 0]`
  * `curvature`: Optional curvature override coefficient (applies to both from/to control vectors).
  * `fromCurvature`: Optional curvature override coefficient specifically for the starting (from) control tangent.
  * `toCurvature`: Optional curvature override coefficient specifically for the ending (to) control tangent.
  * `animate`: Optional boolean to enable/disable flowing animation on this line (defaults to `true`).
* **Group Properties**:
  * `id`: Unique identifier (string).
  * `label`: Group boundary label text.
  * `nodeIds`: Array of node IDs enclosed inside the boundary box (string[]).
  * `theme`: Optional group color theme override (`"red"` | `"green"` | `"blue"` | `"gray"`).

---

### B. Sequence Diagram Schema

Set `"type": "sequence"` in the root object.

```json
{
  "type": "sequence",
  "width": 850,
  "height": 480,
  "participants": [
    { "id": "user", "label": "User\nClient", "theme": "red", "x": 100 },
    { "id": "agent", "label": "Orchestrator\nAgent", "theme": "blue", "x": 320 }
  ],
  "activations": [
    { "participant": "agent", "start": "msg_prompt", "end": "msg_return" }
  ],
  "messages": [
    { "id": "msg_prompt", "from": "user", "to": "agent", "label": "1. Prompt Request", "lineType": "solid", "animate": true },
    { "id": "msg_return", "from": "agent", "to": "user", "label": "2. Return Result", "lineType": "dashed", "animate": true }
  ],
  "groups": [
    {
      "id": "loop_tests",
      "label": "Until tests pass",
      "participants": ["user", "agent"],
      "messageFrom": "msg_prompt",
      "messageTo": "msg_return",
      "theme": "gray"
    }
  ]
}
```

* **Participant Properties**:
  * `id`, `label`, `theme`: Same as flowchart nodes.
  * `x`: Horizontal center position (autospaced if omitted).
* **Activation Properties**:
  * `participant`: Target participant ID.
  * `start`, `end`: Anchor references representing where the activation bar starts and ends. Can be a message ID string, a 0-indexed message index number, or an absolute Y coordinate fallback (number $\ge 100$).
  * `y`, `height`: Optional legacy absolute properties.
* **Message Properties**:
  * `id`: Optional unique identifier for the message (string), useful for defining group bounds and anchoring activations/notes.
  * `from`, `to`: Participant IDs (set `from === to` for self-loop callback calls).
  * `y`: Optional vertical placement coordinate. If omitted, messages are autospaced sequentially at `55px` intervals starting from `120px`.
  * `label`: String label placed above the message arrow.
  * `lineType`: `"solid"` (default call) | `"dashed"` (returns).
  * `animate`: Optional boolean to enable/disable flowing animation on this message arrow (defaults to `true`).
* **Group Properties**:
  * `id`: Unique identifier (string).
  * `label`: String label/title rendered inside the loop box.
  * `participants`: Array of participant IDs spanning the width of the group (string[]).
  * `messageFrom`: Start boundary message, specified as a message ID string or a 0-indexed number representing the message index in the messages array (string | number).
  * `messageTo`: End boundary message, specified as a message ID string or a 0-indexed number representing the message index in the messages array (string | number).
  * `theme`: Optional desaturated theme override (`"red"` | `"green"` | `"blue"` | `"gray"`).

---

### C. Morandi Theme Specs

To preserve the warm editorial design, the styling engine uses the following color palette mapping:

* **Red (Terracotta)**: bg `#f3e8e2`, border `#dcbdaf`, text `#8a5a44`
* **Green (Sage)**: bg `#e8ebe4`, border `#c4ceb8`, text `#556f44`
* **Blue (Slate)**: bg `#e5ebf0`, border `#bccad6`, text `#4b6584`
* **Gray (Sand)**: bg `#efede8`, border `#d3cecf`, text `#6b645d`
* **Canvas Background**: `#faf8f5` (warm ivory paper)
* **Fonts**: `'Newsreader', Georgia, serif` for diagram nodes and `'Inter', sans-serif` for labels.

---

## 3. Launching the Live Preview Server

The skill contains a built-in Python-based HTTP server that:
1. Serves the compiled React frontend application.
2. Lists all `.json` files in the user's workspace directory.
3. Automatically seeds the workspace with examples (`diagram.json`, `example_*.json`) from the skill directory if none exist.
4. Listens for coordinate and offset updates from mouse interactions and writes them back to the active JSON files in real time.

### Technology Stack
* **Frontend**: Migrated to a modern **React + TypeScript + Vite** application.
* **Compiled Bundle**: Located at `frontend/dist/`. The Python server serves this directory by default.
* **Development Mode**: Active development can be hosted in hot-reload mode by running `npm run dev` in the `frontend/` directory.

### How to start the Python server:
Run the following command from the workspace root (defaults to hosting diagrams in the current directory on port 8000):
```bash
python3 skills/draw-diagram/scripts/server.py
```

### Advanced CLI Parameters:
* `--dir <path>`: Directory containing diagram JSON files to edit/preview (defaults to `.`).
* `--file <path>`: Path to a specific single diagram JSON file to edit (restricts the interface to this single diagram).
* `--web-dir <path>`: Directory containing web UI assets (defaults to the compiled React assets at `frontend/dist/` or falls back to standard skill `resources/`).
* `--port <number>`: Port to run the server on (defaults to `8000`).

Example: To serve diagrams in `/Users/user/diagrams/` on port `8080`:
```bash
python3 skills/draw-diagram/scripts/server.py --dir /Users/user/diagrams/ --port 8080
```

Open your browser to the configured port, e.g.:
```
http://localhost:8000/
```

---

## 4. Key Notes & Code Structure

* **React State & Local Sync**: State management is handled on the client using Zustand. An automatic file sync loops in the client to catch changes made directly to JSON files by the workspace agent, rendering them immediately.
* **Disk Synchronization & Auto-Save**: In flowchart view, nodes can be dragged anywhere. The UI pauses background poll intervals during active drags to prevent race conditions. Disk writes are saved on drag release or editor changes.
* **Marquee Box Selection & Batch Dragging**:
  * **Marquee Bounding Box**: Dragging on the canvas background creates a marquee bounding-box selector. Nodes fully contained inside the box are selected.
  * **Shift Key Integration**: Hold the `Shift` key while clicking a node to toggle its selection state, or hold `Shift` while dragging a marquee selection to merge/add nodes to the active selection.
  * **Batch Dragging**: Dragging any selected node translates all selected nodes as a group, preserving their relative positions.
  * **Selection Outline Highlights**: Selected nodes display a dynamic dotted blue outline ring highlighting their active state.
