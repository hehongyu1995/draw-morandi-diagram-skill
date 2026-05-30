---
name: draw-diagram
description: Guides the generation of premium, highly-aesthetic flowcharts and UML sequence diagrams. Serves a live interactive preview server with zero-dependencies.
---

# Draw Diagram Skill

Use this skill to draw or generate highly aesthetic flowcharts, architecture diagrams, or UML sequence diagrams matching the clean, warm editorial style of modern research blogs (e.g., Anthropic's blog).

---

## 1. Supported Charts

### A. Flowcharts & Architecture Diagrams
* **Nodes**: Circular, capsule (stadium), or round-rectangular blocks.
* **Connections**: Auto-routed straight lines or cubic Bezier curves connecting the nearest borders of nodes.
* **Line Styles**: Solid (default), dashed (`lineType: "dashed"`), or dotted (`lineType: "dotted"`).
* **Flow Animations**: Beautiful, direction-aware flowing dot overlays indicating control/data flow direction. Can be configured per connection or toggled globally.
* **Themes**: Predefined Morandi desaturated color themes (`red`, `green`, `blue`, `gray`).

### B. UML Sequence Diagrams (`type: "sequence"`)
* **Participants**: Horizontally placed lifelines (automatically spaced if `x` coordinates are omitted).
* **Activation Bars**: Highlight active execution segments on lifelines.
* **Messages**: Horizontal asynchronous/synchronous calls, return calls, and self-loop arrows.
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
      "id": "router",
      "type": "rect",
      "theme": "green",
      "x": 290,
      "y": 150,
      "width": 110,
      "height": 70,
      "label": "LLM Call\nRouter"
    }
  ],
  "connections": [
    {
      "from": "in",
      "to": "router",
      "lineType": "solid",
      "curve": "straight",
      "animate": true
    }
  ]
}
```

* **Node Properties**:
  * `id`: Unique identifier (string).
  * `type`: `"circle"` | `"rect"` | `"capsule"`.
  * `theme`: `"red"` (Terracotta) | `"green"` (Sage) | `"blue"` (Slate) | `"gray"` (Sand).
  * `x`, `y`: Absolute center coordinates.
  * `width`, `height`: Rect/capsule dimensions (standard: `110x50` for rects).
  * `label`: Text label. Use `\n` or `\\n` for multiline text.
* **Connection Properties**:
  * `from`, `to`: Node IDs.
  * `lineType`: `"solid"` | `"dashed"` | `"dotted"`.
  * `curve`: `"straight"` | `"bezier"`.
  * `fromOffset`, `toOffset`: Optional `[dx, dy]` coordinate adjustments.
  * `animate`: Optional boolean to enable/disable flowing animation on this line (defaults to `true`).

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
    { "participant": "agent", "start": 180, "end": 360 }
  ],
  "messages": [
    { "from": "user", "to": "agent", "y": 180, "label": "1. Prompt Request", "lineType": "solid", "animate": true },
    { "from": "agent", "to": "user", "y": 360, "label": "2. Return Result", "lineType": "dashed", "animate": true }
  ]
}
```

* **Participant Properties**:
  * `id`, `label`, `theme`: Same as flowchart nodes.
  * `x`: Horizontal center position (autospaced if omitted).
* **Activation Properties**:
  * `participant`: Target participant ID.
  * `start`, `end`: Vertical `y` coordinates defining the active bar.
* **Message Properties**:
  * `from`, `to`: Participant IDs (set `from === to` for self-loop callback calls).
  * `y`: Vertical placement coordinate.
  * `label`: String label placed above the message arrow.
  * `lineType`: `"solid"` (default call) | `"dashed"` (returns).
  * `animate`: Optional boolean to enable/disable flowing animation on this message arrow (defaults to `true`).

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
1. Serves the web-app interface.
2. Lists all `.json` files in the user's workspace directory.
3. Automatically seeds the workspace with examples (`diagram.json`, `example_*.json`) from the skill directory if none exist.
4. Listens for coordinate updates from mouse drags and writes them back to the active JSON files in real time.

### How to start:
Run the following command from the workspace root (defaults to hosting diagrams in the current directory on port 8000):
```bash
python3 skills/draw-diagram/scripts/server.py
```

### Advanced CLI Parameters:
* `--dir <path>`: Directory containing diagram JSON files to edit/preview (defaults to `.`).
* `--file <path>`: Path to a specific single diagram JSON file to edit (restricts the interface to this single diagram).
* `--web-dir <path>`: Directory containing web UI assets (defaults to the auto-translated `resources/` folder inside the skill).
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

* **Zero Dependencies**: The server uses standard Python 3 libraries (`http.server`, `glob`, `shutil`), requiring no external packages or `pip` installations. The frontend client is written in vanilla HTML/CSS/JS.
* **Drag-and-Drop Auto-Save**: In flowchart view, nodes can be dragged anywhere. In sequence view, participants can be dragged horizontally. The UI pauses background poll intervals during active drags and for 2.5 seconds after saving to prevent race conditions.
* **Disk Synchronization**: An automatic file sync loops in the client to catch changes made directly to JSON files by the workspace agent, rendering them immediately.
