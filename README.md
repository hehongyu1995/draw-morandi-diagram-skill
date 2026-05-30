# FLOWCR\FT — Editorial Agent Diagram Generator

FLOWCR\FT 是一个轻量级、极具设计感的智能体/架构流程图绘制与预览工具。它采用了温润纸张感（Warm Editorial）的学术出版风格美学（类似 Anthropic 官网），支持实时 JSON 编辑、节点拖拽、SVG 动效流动、贝塞尔曲线智能绕行，并支持导出 SVG、高清 PNG 以及动态 GIF 动图。

---

## ✨ 已实现的核心功能

### 1. 拖拽与实时编辑
* **可视化拖拽**：直接在画布上拖拽任意节点，松开鼠标后会自动将最新坐标同步更新至左侧的 JSON 编辑框，并持久化保存。
* **双向数据流**：修改左侧 JSON，画布会实时重绘；拖动节点，JSON 数据会自动更新。

### 2. 纸张出版级学术美学（Anthropic 风格）
* **优雅的排版**：引入 Google Fonts 衬线体 `Newsreader` 作为节点文本和标题，UI 控件采用非衬线体 `Inter`，代码框采用 `JetBrains Mono`。
* **莫兰迪配色体系**：预设了灰砂（Gray）、泥红（Red）、松绿（Green）、石蓝（Blue）四种极具高级感的莫兰迪色系节点主题。
* **纸质画幅**：背景采用温润明亮的暖米色（`#faf8f5`）纸张质感底色与细密网格，摒弃赛博朋克发光霓虹，转而使用细腻的炭黑线条。

### 3. 智能曲线避让（贝塞尔曲线绕行）
* **障碍水平重叠检测**：自动过滤图表中不在同一垂直通道的无关节点，仅当节点真正挡在直连路径上时才进行曲线绕开计算。
* **参数化间距控制**：左侧参数面板配备了 **绕行系数（Bypass Offset）** 滑块，范围 `0px` - `100px`，支持实时微调曲线的绕行幅度（调至 0px 即完美贴合节点边缘）。

### 4. 连线流动动效（Flow Animation）
* **虚线/点线流动**：采用 SVG 原生 `<animate>` 动态计算并平滑滚动 `stroke-dashoffset`，完美无缝循环。
* **实线发光光点（Moving Dot）**：针对实线，通过 `<animateMotion>` 沿着连线路径发射带有 `<feGaussianBlur>` 柔和辉光滤镜的小光点，具有极强的方向指示感。

### 5. 三大导出选项
* **导出 SVG**：一键保存矢量图。
* **导出 PNG**：双倍分辨率高清导出。
* **导出 GIF（动画）**：**纯前端、100% 离线支持**。通过对渲染引擎引入时间步参数 `t`，控制 SVG 写入静态属性代替 SMIL 动画，从而在 canvas 依次截取 3 秒内 30 帧的画面，最终通过 `gifshot.js` 编译出完美循环的动图并自动下载。

---

## 📂 项目结构

```text
draw_ws/
├── frontend/                     # [NEW] React + TS 前端工程项目
│   ├── src/                      # 前端源代码
│   │   ├── components/           # UI 布局及 SVG/Canvas 渲染组件 (Header, Canvas, NodeShape)
│   │   ├── store/                # appStore.ts Zustand 状态管理 (编辑器数据双向绑定及自动保存)
│   │   ├── types.ts              # TypeScript 类型定义定义
│   │   ├── constants.ts          # Morandi 预设配色主题
│   │   ├── main.tsx              # 渲染入口
│   │   └── index.css             # 全局样式系统
│   ├── public/                   # 公共静态资源 (gifshot.min.js, icons.svg)
│   ├── dist/                     # 编译打包产物目录 (静态托管文件夹，已检入 Git)
│   ├── package.json              # 项目依赖及编译脚本 (build, dev)
│   └── vite.config.ts            # Vite 配置文件 (内置 8000 端口反向代理规则)
├── skills/
│   └── draw-diagram/
│       └── scripts/
│           └── server.py         # Python 预览与文件操作 API 服务器 (默认托管 frontend/dist)
├── decoder_only_llm.json         # 预设：Decoder-Only 大模型架构流程图
├── transformer.json              # 预设：经典 Transformer 编码-解码架构流程图
├── diagram.json                  # 预设：标准流程图模版
├── example_*.json                # 各种智能体拓扑 presets
└── README.md                     # 说明文档 (本文档)
```

---

## 🔑 关键文件说明

* **`frontend/src/components/Canvas.tsx`**
  * 这是图表渲染的核心引擎组件。它包含了流程图连线避让、序列图绘制的全部数学计算与 React JSX 声明式渲染逻辑。
  * 内置了通过直接操纵 SVG DOM 节点来进行 30 帧 GIF 时间步模拟的高效录制循环，避免了重绘带来的卡顿。
* **`skills/draw-diagram/scripts/server.py`**
  * 一个基于 Python `http.server` 的静态预览服务器。
  * 自动将静态资源翻译至 `frontend/dist/` 进行托管，同时支持 `/list` 列出工作区图表与 `/save` 接收前端双向绑定并持久化改动至本地 `.json`。
* **`frontend/public/gifshot.min.js`**
  * 本地离线版 GIF 合成库。在前端打包后会复制到 `dist/` 根目录下，以支持无网状态下的快速 GIF 导出。

---

## 🚀 启动与使用

项目支持 **前端开发模式** 与 **生产运行模式**。

### 1. 生产/运行模式 (End-User / Skill Consumer 模式)
无需运行 `npm`，只需启动 Python 服务器，直接读取已编译好的 `frontend/dist`：
```bash
python3 skills/draw-diagram/scripts/server.py --dir .
```
启动后访问 `http://localhost:8000/` 即可。

### 2. 前端开发模式 (Developer 模式)
若需要修改前端 React 源码并体验热更新 (HMR)：
1. 启动 Python API 后端：
   ```bash
   python3 skills/draw-diagram/scripts/server.py --dir . --port 8000
   ```
2. 在另一个终端启动 Vite 开发服务器：
   ```bash
   cd frontend
   npm run dev
   ```
3. 访问 `http://localhost:5173/`。Vite 会将 `/list`、`/save` 及 `.json` 图表请求自动代理至 Python 8000 后端端口。

---

## 🔑 功能操作说明
* **选择图表**：在页面右上角下拉菜单切换图表 JSON 文件。
* **节点拖拽**：在画布直接拖动卡片节点，拖拽完成（`mouseup`）后会自动更新 JSON 代码，并静默自动保存至磁盘。
* **参数调节**：通过滑块控制曲线绕行幅度；使用动效复选框单独控制虚线/实线特效的开启。
* **导出文件**：支持一键导出矢量 SVG、双倍高清 PNG，或导出 3 秒无限循环的 GIF 动图。
