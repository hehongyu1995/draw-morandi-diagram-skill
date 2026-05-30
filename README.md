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
├── skills/
│   └── draw-diagram/
│       ├── resources/
│       │   ├── index.html        # Web 端 UI 结构
│       │   ├── styles.css        # 精致的 Anthropic 纸质风样式表
│       │   ├── app.js            # 图形绘制引擎、参数控制与 GIF 录制核心逻辑
│       │   └── gifshot.min.js    # GIF 编码库（本地版，用于离线导出）
│       └── scripts/
│           └── server.py         # Python 预览服务器（自动管理文件列表并路由静态资源）
├── decoder_only_llm.json         # 预设：Decoder-Only 大模型架构流程图
├── transformer.json              # 预设：经典 Transformer 编码-解码架构流程图
├── diagram.json                  # 预设：标准流程图模版
├── example_*.json                # 各种智能体拓扑 presets
└── README.md                     # 说明文档（本文档）
```

---

## 🔑 关键文件说明

* **`skills/draw-diagram/resources/app.js`**
  * 这是图表渲染的核心引擎。它包含了 `renderDiagram` 和 `renderSequence` 函数，负责解析节点和连线的 JSON 结构并输出为 SVG。
  * 引入了基于 `path.getPointAtLength()` 的帧序列生成方法，可在指定时间 `t` 绘制出无 SMIL 依赖的静态连线与流动光点，是支持 GIF 导出的关键。
* **`skills/draw-diagram/scripts/server.py`**
  * 一个基于 Python `http.server` 的静态预览服务器。
  * 支持自定义托管目录，自动识别并生成当前目录下的 `.json` 文件列表（以供前端下拉菜单选择切换），并支持文件的实时保存。
* **`skills/draw-diagram/resources/gifshot.min.js`**
  * 客户端 GIF 动图合成库，由 Yahoo! 开源。我们通过 Python 脚本下载并存储在本地，以确保在断网环境下 GIF 导出功能依然 100% 可用。

---

## 🚀 启动与使用

### 1. 运行本地预览服务器
在项目根目录下，执行以下命令启动服务器：
```bash
python3 skills/draw-diagram/scripts/server.py --dir .
```

### 2. 访问预览页面
打开浏览器访问：
```
http://localhost:8000/
```

### 3. 功能操作说明
* **选择图表**：在页面左上角下拉菜单切换 `transformer.json` 或 `decoder_only_llm.json` 等。
* **节点拖拽**：在右侧画布直接拖动任意卡片节点，左侧 JSON 的 `x`、`y` 坐标会实时发生更新。
* **调节参数**：拖动左侧 **Bypass Offset** 滑块调整贝塞尔曲线的绕行幅度；勾选/取消 **Dashed Flow** 或 **Solid Flow** 控制动效的开关，它们会与顶部的 **Flow Animation** 按钮自动双向同步。
* **导出动效**：点击 **Export GIF**，按钮将展示录制及合成进度，完成后自动下载 3 秒完美循环的动效 GIF。
