# draw-morandi-diagram-skill

**A diagram-drawing skill for AI agents.** Generate publication-quality sequence diagrams and flowcharts in a warm, editorial Morandi style — define by JSON, preview live, drag to refine, export SVG/PNG/GIF.

---

## 🌟 What It Is

`draw-morandi-diagram-skill` is an agent-invokable skill that produces **beautiful diagrams with a warm editorial aesthetic** (think Anthropic blog, Morandi palette). It's designed to be called by coding agents (Claude Code, Codex, etc.) when they need to visualize architecture, flows, or sequences.

| Feature | What you get |
|---|---|
| **Diagram types** | Sequence diagrams + Flowcharts |
| **Theme** | Morandi desaturated palette (Red/Gray/Green/Blue) on warm ivory paper |
| **Live preview** | Python server + React frontend, drag & drop editing |
| **Flow animation** | Moving dots on solid lines, dash-scroll on dashed lines |
| **Export** | SVG (vector), PNG (HiDPI), GIF (animated loop) |
| **Input** | Simple JSON spec — write it directly or let the agent generate it |
| **Editing** | Drag nodes, adjust curves, toggle animations, edit JSON in real-time |

---

## 🎨 Examples

### Decoder-Only LLM Architecture
Flowchart showing the transformer decoder block: token embedding → GQA with RoPE → SwiGLU MLP → residual connections.

![Decoder-only LLM](examples/decoder_only_llm.png)

### Transformer Encoder-Decoder
Full Transformer architecture with encoder-decoder structure, cross-attention, and positional encoding.

![Transformer](examples/transformer.png)

### ReAct Agent Loop
Sequence diagram of the ReAct pattern: Thought → Action → Observation → Final Answer.

![ReAct Agent](examples/example_react_agent.png)

### RAG Retrieval Pipeline
Sequence diagram for Retrieval-Augmented Generation: query → embed → retrieve → generate.

![RAG Retrieval](examples/example_rag_retrieval.png)

### Flowchart with Groups
Flowchart demonstrating group/container boundary boxes, Bezier curve routing, and node categories.

![Flowchart Groups](examples/example_flowchart_groups.png)

### Sequence Diagram with Groups
Sequence diagram with combined fragment groups, activation bars, and self-loop calls.

![Sequence Groups](examples/example_sequence_groups.png)

---

## 📂 Project Structure

```text
draw-morandi-diagram-skill/
├── examples/                        # Example JSON specs + rendered PNGs
├── frontend/                        # React + TypeScript + Vite app
│   ├── src/
│   │   ├── components/              # Canvas, Header, Sidebar, NodeShape
│   │   ├── store/                   # Zustand state management
│   │   ├── types.ts                 # TypeScript types
│   │   └── constants.ts             # Morandi theme colors
│   ├── dist/                        # Compiled build (static hosting)
│   └── package.json
├── skills/
│   └── draw-diagram/
│       └── scripts/server.py        # Python preview + save API server
├── *.json                           # Diagram JSON spec files (root level)
└── README.md
```

---

## 🚀 Quick Start

### For Humans (preview & edit)
```bash
python3 skills/draw-diagram/scripts/server.py --dir .
```
Open http://localhost:8000/ in your browser.

### For Agents (generate & save)
Agents can write JSON spec files to disk, then launch the server to let humans preview/edit. JSON schema is documented in `skills/draw-diagram/SKILL.md`.

---

## 🔑 Features Detail

### Drag & Drop Editing
- Drag any node on canvas — coordinates sync to JSON in real-time
- Marquee selection + Shift-click for batch moves
- Snap ports at 4 cardinal directions (top/bottom/left/right)

### Smart Bezier Routing
- Auto-detect obstacles and route curves around overlapping nodes
- Bypass Offset slider (0–100px) to control curve clearance
- Per-connection curvature overrides

### Flow Animation
- **Solid lines**: Moving glow dot along the path (directional indicator)
- **Dashed lines**: Scroll dash offset animation
- Toggle separately for solid and dashed animations

### Export
| Format | Use case |
|---|---|
| SVG | Vector, editable in Illustrator/Figma |
| PNG | HiDPI (2x), ready for docs/presentations |
| GIF | Animated loop, 3s cycle, 30fps |

---

## 🧠 Agent Integration

This skill is designed to be loaded and invoked by AI coding agents that support skill systems (Hermes, Claude Code, etc.). An agent can:

1. Parse a user's request into a diagram JSON spec
2. Write the JSON to disk
3. Launch the preview server
4. Iterate with the user on placement/layout
5. Export the final PNG and deliver it

The full JSON schema reference lives in `skills/draw-diagram/SKILL.md`.

---

## 📜 License

MIT
