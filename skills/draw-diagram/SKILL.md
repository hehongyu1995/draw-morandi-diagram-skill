---
name: draw-diagram
description: Guides the generation of premium, highly-aesthetic flowcharts and UML sequence diagrams. Serves a live interactive preview server with a React-based UI.
---

# Draw Diagram Skill

Use this skill to draw or generate highly aesthetic flowcharts, architecture diagrams, or UML sequence diagrams matching the clean, warm editorial style of modern research blogs (e.g., Anthropic's blog).

---

## 1. Supported Charts

### A. Flowcharts & Architecture Diagrams
* **Nodes**: Circular, capsule (stadium), round-rectangular blocks, **database cylinders**, **folded file documents**, **C4 stick figures**, or **cloud shapes**.
  * `circle`: Circular node.
  * `rect`: Rounded rectangular node.
  * `capsule`: Capsule/stadium shape.
  * `database`: Cylinder model representing database systems.
  * `file`: Folded/dog-eared sheet model representing files and document stores.
  * `person`: C4-style stick figure (circle head + trapezoidal body). Label renders below the figure. Default 70x90.
  * `cloud`: Cloud shape representing external systems/services. Label renders below the shape. Default 120x80.
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
* **Themes**: Predefined Morandi desaturated color themes (`red`, `green`, `blue`, `gray`) plus C4 model themes (`c4-context`, `c4-container`, `c4-component`, `c4-code`).

### B. UML Sequence Diagrams (`type: "sequence"`)
* **Participants**: Horizontally placed lifelines (automatically spaced if `x` coordinates are omitted).
* **Activation Bars**: Highlight active execution segments on lifelines (can anchor dynamically to message references instead of absolute heights).
* **Messages**: Horizontal calls and return calls with automatic vertical spacing (autospacing) at 55px intervals (manual `y` placement is optional).
* **Diagram Group Overlay boundary boxes (Combined Fragments/Loops)**: Boundary frames wrapping message sequences, featuring solid themed borders, 25% opacity background fills, and foreground label tabs to prevent lifeline and activation overlaps.
* **Notes**: Sticky-note style annotations attached to participant lifelines, with vertical anchoring to messages.
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
  * `type`: `"circle"` | `"rect"` | `"capsule"` | `"database"` | `"file"` | `"person"` | `"cloud"`.
  * `theme`: `"red"` (Terracotta) | `"green"` (Sage) | `"blue"` (Slate) | `"gray"` (Sand) | C4 themes: `"c4-context"` | `"c4-container"` | `"c4-component"` | `"c4-code"`.
  * `x`, `y`: Absolute center coordinates. Optional when `autoLayout: true`; dagre computes positions at render time.
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
  * `arrowStyle`: `"filled"` | `"open"` | `"triangle"` | `"diamond"` | `"circle"` (defaults to `"filled"`).
  * `routing`: `"bezier"` (default) | `"orthogonal"`.
  * `points`: Optional array of `{x, y}` routing points for orthogonal connections (auto-computed when `autoLayout: true` + `routing: "orthogonal"`).
  * `animate`: Optional boolean to enable/disable flowing animation on this line (defaults to `true`).
* **Group Properties**:
  * `id`: Unique identifier (string).
  * `label`: Group boundary label text.
  * `nodeIds`: Array of node IDs enclosed inside the boundary box (string[]).
  * `theme`: Optional group color theme override (`"red"` | `"green"` | `"blue"` | `"gray"` | C4 themes).
* **Auto Layout**: Set `autoLayout: true` at the root level to automatically position nodes using dagre.
  The flag stays `true`; manual drag positions are persisted separately in `layout.overrides.nodes` and applied
  on top of computed layout positions. Choose the direction based on diagram content:
  - `"LR"` (left-to-right): Best for workflow pipelines, agent interaction flows, architecture diagrams,
    data pipelines, and time-series processes.
  - `"TB"` (top-to-bottom): Best for business approval processes, SOPs, decision trees,
    organizational hierarchies, and traditional vertical process flows.
  Node separation and rank separation are configurable through the optional `layout` object. When combined
  with `routing: "orthogonal"` on connections,
  routing points are also auto-computed unless layout constraints move nodes after dagre.
* **Layout Config**:
  * `direction`: Optional dagre direction: `"LR"` for left-to-right, `"TB"` for top-to-bottom.
  * `nodesep`, `ranksep`, `marginx`, `marginy`: Optional dagre spacing overrides.
  * `constraints`: Optional layout hints. Supported Phase 1 constraints:
    * `{ "type": "inline", "chain": ["A", "B", "C"] }`: Keep nodes ordered in a chain.
    * `{ "type": "rightOf", "nodeId": "A", "refNodeId": "B" }`: Prefer A to the right of B.
    * `{ "type": "leftOf", "nodeId": "A", "refNodeId": "B" }`: Prefer A to the left of B.
    * `{ "type": "above", "nodeId": "A", "refNodeId": "B" }`: Prefer A above B.
    * `{ "type": "below", "nodeId": "A", "refNodeId": "B" }`: Prefer A below B.
  * In TB mode, use `leftOf` / `rightOf` for branch positioning to the left or right of the main chain.
    Use `above` / `below` only for vertical offset adjustments.
  * In LR mode, use `above` / `below` for branch positioning above or below the main chain.
    Use `leftOf` / `rightOf` for horizontal offset adjustments.
  * Constraints are hints, not hard solver constraints. Invalid node IDs, self references, and cyclic ordering hints
    are ignored with console warnings.
* **Layout Overrides**:
  * `overrides.nodes`: Optional `Record<string, {x: number, y: number}>` for storing manual drag positions without
    modifying the source node definitions.
  * Override order: auto layout computes node positions, constraint normalization adjusts constrained positions,
    then `layout.overrides.nodes` replaces any matching node coordinates.
  * Do not include `layout.overrides` when generating diagrams. Overrides are created by human interaction in the UI,
    not by LLM-authored source specs.

Auto layout with constraints example:

```json
{
  "autoLayout": true,
  "layout": {
    "direction": "TB",
    "nodesep": 80,
    "ranksep": 80,
    "constraints": [
      { "type": "inline", "chain": ["start", "process", "review", "done"] },
      { "type": "rightOf", "nodeId": "exception", "refNodeId": "process" }
    ]
  },
  "nodes": [
    { "id": "start", "type": "circle", "theme": "red", "label": "开始" },
    { "id": "process", "type": "rect", "theme": "blue", "width": 120, "height": 55, "label": "处理" },
    { "id": "exception", "type": "capsule", "theme": "gray", "width": 130, "height": 50, "label": "异常流程" },
    { "id": "done", "type": "circle", "theme": "green", "label": "完成" }
  ],
  "connections": [
    { "from": "start", "to": "process", "curve": "bezier" },
    { "from": "process", "to": "done", "curve": "bezier" },
    { "from": "process", "to": "exception", "curve": "bezier" }
  ]
}
```

When generating flowcharts, prefer `autoLayout: true` with `layout.constraints`. Do not calculate pixel coordinates
unless the user explicitly requests manual layout. Use `inline` for the main ordered path. In TB mode, use
`leftOf` / `rightOf` for branches; in LR mode, use `above` / `below` for branches. Do not hand tune
`fromOffset`, `toOffset`, or curvature fields in auto-layout mode unless manual visual polish is requested.
Do not author `layout.overrides`; those are reserved for human drag tweaks in the UI.

### Auto Layout vs Manual Layout

Auto layout (`autoLayout: true`) is best suited for **simple to moderately complex diagrams** (5-12 nodes,
1-2 branch levels). It produces clean results with minimal input effort.

For **complex diagrams** (15+ nodes, 3+ branch levels, multiple groups with nested members),
**manual layout** (hand-written x/y coordinates, `autoLayout: false` or omitted) produces
significantly better results. Manual layout gives full control over spacing, alignment, and
branch separation, avoiding the line crossing and node crowding issues that dagre struggles
with at scale.

**Rule of thumb:**
- ≤12 nodes, simple linear flow → autoLayout (direction based on content: LR for pipelines/agents, TB for business/SOP)
- 15+ nodes, multiple branches, nested groups → manual layout with hand-crafted coordinates
- Agent workflows and architecture diagrams → prefer LR direction
- Business processes, SOPs, approvals → prefer TB direction

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
* **Note Properties**:
  * `participant`: Participant ID to attach the note to.
  * `label`: Note text content. Use `\n` or `\\n` for multiline.
  * `y`: Optional vertical position. Can be a specific Y coordinate (number >= 100), or a message ID / 0-indexed message index number (< 100) to anchor vertically to that message (see `start`/`end` in Activation Properties for anchoring syntax).
  * `align`: `"left"` | `"right"` (left places the note box to the left of the participant lifeline, right to the right).
  * `width`: Optional note box width (defaults to 120).
  * `height`: Optional note box height (defaults to 45).
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
* **C4 Context (System Level)**: bg `#e3ebf2`, border `#b6cbd8`, text `#3d5f7a`
* **C4 Container (Application Level)**: bg `#e4ebe8`, border `#b9cdc0`, text `#3d6b52`
* **C4 Component (Module Level)**: bg `#f3ece0`, border `#e0cfb4`, text `#7d653d`
* **C4 Code (Class Level)**: bg `#ededf0`, border `#cdcdd6`, text `#5e5a70`
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
* `--render <path>`: Path to a JSON diagram file to render in headless mode (no browser needed). Uses Playwright to capture a PNG screenshot.
* `--output <path>`: Output PNG file path (only used with `--render`, defaults to `output.png`).

Example: To serve diagrams in `/Users/user/diagrams/` on port `8080`:
```bash
python3 skills/draw-diagram/scripts/server.py --dir /Users/user/diagrams/ --port 8080
```

Open your browser to the configured port, e.g.:
```
http://localhost:8000/
```

---

## 4. C4 Model Diagram Support

The tool supports all 4 levels of [C4 Model](https://c4model.com/) architecture diagrams using the new node types and themes.

### C4 Node Types

| C4 Element | Node Type | Description |
|---|---|---|
| Person/User | `person` | Stick figure. Default 70x90. Label below. |
| Software System | `rect` | Standard rounded rect. |
| Container (App/Service) | `capsule` or `rect` | Use capsule for runtime processes. |
| Database | `database` | Cylinder shape. |
| External System | `cloud` | Cloud shape. Default 120x80. Label below. |
| Component/Module | `rect` | Standard rounded rect. |

### C4 Theme Mapping

| Theme | C4 Level | When to Use |
|---|---|---|
| `c4-context` | Level 1: System Context | Users, external systems, the system boundary |
| `c4-container` | Level 2: Container | Web apps, APIs, databases, message queues |
| `c4-component` | Level 3: Component | Controllers, services, repositories |
| `c4-code` | Level 4: Code | Classes, interfaces, test stubs |

### Included Examples

The following example JSON files are generated in the workspace:

| File | C4 Level | Description |
|---|---|---|
| `c4-context.json` | Level 1 | E-commerce system context: users → system → payment gateway + logistics |
| `c4-container.json` | Level 2 | Web app + mobile app → API → MySQL + Redis |
| `c4-component.json` | Level 3 | Order module: Controller → Service → Repository → DB + MQ |
| `c4-code.json` | Level 4 | OrderService interface → Impl + Mock → Repository |

### C4 Drawing Conventions

- **Relationships**: Use solid bezier lines with labels describing the interaction (e.g. "REST API", "calls", "reads/writes")
- **System Boundaries**: Use `groups` to draw colored boundary boxes around your system vs external systems
- **External Systems**: Use `cloud` nodes for systems outside your control
- **Person placement**: Persons go on the left (primary actors) or right (supporting roles)
- **Animations**: Enable `animate: true` on connections to show data flow direction

---

## 5. Key Notes & Code Structure

* **React State & Local Sync**: State management is handled on the client using Zustand. An automatic file sync loops in the client to catch changes made directly to JSON files by the workspace agent, rendering them immediately.
* **Disk Synchronization & Auto-Save**: In flowchart view, nodes can be dragged anywhere. The UI pauses background poll intervals during active drags to prevent race conditions. Disk writes are saved on drag release or editor changes.
* **Marquee Box Selection & Batch Dragging**:
  * **Marquee Bounding Box**: Dragging on the canvas background creates a marquee bounding-box selector. Nodes fully contained inside the box are selected.
  * **Shift Key Integration**: Hold the `Shift` key while clicking a node to toggle its selection state, or hold `Shift` while dragging a marquee selection to merge/add nodes to the active selection.
  * **Batch Dragging**: Dragging any selected node translates all selected nodes as a group, preserving their relative positions.
  * **Selection Outline Highlights**: Selected nodes display a dynamic dotted blue outline ring highlighting their active state.

### Testing
The project uses **Vitest** for unit tests covering the pure-function transformation layer:
```bash
cd frontend && npm test
```
48 tests across 6 test files cover: node dimensions, path midpoint calculation, connection endpoint geometry, dagre auto layout, type/schema guards, app store drag persistence, and layout constraint handling. All tests are DOM/browser-free and run headlessly.

### Path Midpoint Extraction
The path-length midpoint utility (`frontend/src/utils/pathMidpoint.ts`) computes the point at 50% of total path length for orthogonal routed connections, used to position connection labels accurately on multi-segment paths.
