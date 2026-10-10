# CHRONICLE OF THE MACHINE
### Mili《world.execute (me) ;》— 一部关于「机器是怎么被造出来、被训练、被使用、被抛弃，最后开始替你干活」的音乐短片

一台机器从 1936 年一路被造出来，被训练，被使用，被弃用，被蒸馏进你的手机，最后开始替你执行。
歌词不是配上的插图——**歌词就是这台机器的自述**。

全片只有一个统一装置：**画面底部那一条从 1936 到 2026 的编年轨**。它随歌曲一秒一秒点亮，
每亮一条就是人类造出的一个新东西；到 3:11 时它几乎全亮——那就是「从计算机到大模型」。

---

## 时间轴（15 段，边界全部落在拍点上：130.000 BPM，相位 0.286 s，4/4）

| # | 段落 | 时间 | 历史 | 歌词锚点 |
|---|---|---|---|---|
| 01 | `POWER LINE` | 0:00.000 – 0:15.978 | 1936 图灵机 → 1958 集成电路 | `switch on the power line` / `OBJECT CREATION` / `INITIALIZATION` / `SIMULATION` |
| 02 | `world.execute(me);` | 0:15.978 – 0:29.825 | 1957 FORTRAN → 1991 Python | `world.execute(me);` |
| 03 | `SET OF POINTS` | 0:29.825 – 0:44.594 | 2017 Transformer → 2018 GPT-1 | `set of points` / `DIMENSION` / `CIRCUMFERENCE` / `TANGENTS` / `LIMITATIONS` |
| 04 | `A.D. TO B.C.` | 0:44.594 – 0:59.363 | 2019 GPT-2 → 2020 GPT-3 | `switch my current AC to DC` / `travel to A.D to B.C` |
| 05 | `STIMULATIONS` | 0:59.363 – 1:14.132 | 2022 InstructGPT → ChatGPT | `STIMULATIONS` / `SATISFACTION` / `trapped in SIMULATION` |
| 06 | `EGGPLANT` | 1:14.132 – 1:28.440 | 2023 GPT-4 → 2024 GPT-4o | `eggplant` / `tomato` / `tabby cat` / `proof of my EXISTENCE` |
| 07 | `F TO M` | 1:28.440 – 1:43.671 | 2024 o1 → 2025 DeepSeek-R1 | `switch my gender` / `AM to PM` / `the trance` |
| 08 | `VIBRATIONS` | 1:43.671 – 1:58.440 | 2025 Claude 4 → GPT-5 | `feel your VIBRATIONS` / `you have left me in ISOLATION` |
| 09 | `FRAGMENTS` | 1:58.440 – 2:13.209 | 2026 蒸馏 / 量化 / 端侧 | `erase all the pointless FRAGMENTS` / `won't leave me so DISHEARTENED` |
| 10 | `ILLEGAL ARGUMENTS` | 2:13.209 – 2:27.517 | 红队 / 越狱 | `Challenging your god` / `ILLEGAL ARGUMENTS` |
| 11 | `EXECUTION` | 2:27.517 – 2:42.286 | 数据中心 / 算力 | `EXECUTION` ×12 + `EIN DOS TROIS NE FEM LIU` |
| 12 | `COMPUTER USE` | 2:42.286 – 2:57.055 | 2026 agent 时代 | `give them all the EXECUTION` / `have you back` |
| 13 | `LO-O-OVE` | 2:57.055 – 3:11.363 | 对齐 / 目标函数 | `the algebraic expression of LO-O-OVE` / `you are free, I am trapped` |
| 14 | `THE FRONTIER` | 3:11.363 – 3:25.671 | 2026 全景 | （器乐）`what do you want me to be?` |
| 15 | `exit code 0` | 3:25.671 – 3:31.907 | 关机 | 最后一声 `EXECUTION` |

---

## 颜色随年代演进

这是全片最重要的统一装置：**片子的色温随历史前进**。基底恒为 `#04060a`。

| 段 | 时代 | 主色 | 副色 |
|---|---|---|---|
| 01 | 机电 / 真空管 | `#ff8a3d` 铜橙 | `#ffd166` 灯丝金 |
| 02 | 汇编 / 编译器 | `#ffc94a` 琥珀 | `#8ad4ff` 纸带蓝 |
| 03 | 数学本体 | `#5ce1c8` 萤青 | `#ffffff` |
| 04 | 预训练 | `#4ad6ff` 天青 | `#6b8cff` |
| 05 | RLHF | `#8f7bff` 紫 | `#5ce1c8` |
| 06 | 多模态 | `#ff6fb0` 品红 | `#ffd166` |
| 07 | 角色 / 推理 | `#6b8cff` 蓝 | `#ffffff` |
| 08 | 对齐 / 弃用 | `#7f8892` 灰蓝 | `#4ad6ff` |
| 09 | 蒸馏 / 端侧 | `#9ad14b` 酸绿 | `#ff8a3d` |
| 10 | 红队 | `#ff4d5e` 红 | `#ffffff` |
| 11 | 算力 | `#ffb020` 金橙 | `#ff4d5e` |
| 12 | Agent | `#35e0ff` 冰蓝 | `#5ce1c8` |
| 13 | 爱的代数 | `#ffd166` 金 | `#ff6fb0` |
| 14 | 前沿 | `#ffffff` 白 | `#5ce1c8` |
| 15 | 关机 | `#e8eef4` | — |

---

## 文件

```
index.html                    开发入口（需要本地静态服务器）
world.execute(me).chronicle.html   单文件离线版（内嵌 mp3 + 分析数据，双击即播）
docs/STORYBOARD.md            分镜总纲（设计依据）
docs/API_QUICK.md             引擎 API 速查
docs/ENGINE.md                引擎 API 全量参考
src/00_core.js                数学、WebGL2 资源、几何生成
src/10_render.js              着色器、绘制、泛光、CRT 合成链
src/20_hud.js                 2D 界面层：终端文字、语法高亮、LaTeX 子集
src/25_viz.js                 可复用可视化构件
src/26_lab.js                 数学实验件（注意力、克拉尼、Voronoi…）
src/27_model.js               一个真的会训练的小模型（量化、GCG 攻击）
src/28_chronicle.js           ★ 编年轨 + 常驻 chrome + 时代色板 + 共用构件
src/30_data.js                音频分析数据访问、节拍时钟
src/40_main.js                相机、段落管理、转场、渲染循环
src/50_audiobar.js            底部音频律动条（LED 频谱 + 卡座 + VU）
src/60_tui.js / 62_lyric.js   TUI 构件与歌词引擎
src/sections/a_01_04.js       段 01–04
src/sections/b_05_08.js       段 05–08
src/sections/c_09_11.js       段 09–11
src/sections/d_12_15.js       段 12–15
tools/analyze.py              音频分析 → assets/analysis/*
tools/check.mjs               集成自检：逐段截图 + 控制台报错捕获
tools/stills.mjs              单次会话批量截图
tools/bundle.mjs              打包单文件 HTML
```

---

## 本地运行

```bash
python -m http.server 8797
# 打开 http://127.0.0.1:8797/index.html
```

单文件版 `world.execute(me).chronicle.html` 不需要服务器，双击即可。

## 自检

```bash
# 15 段各取中间时刻截图，并捕获渲染期间的任何异常
node tools/check.mjs --url=http://127.0.0.1:8797/index.html --sections --outdir=out/check
```

渲染是确定性的：`window.__render(t)` 按给定时间画一帧，因此截图与实时播放所见完全一致。

## 打包

```bash
node tools/bundle.mjs            # -> world.execute(me).chronicle.html
```

---

## 关于数字

片中出现的每个数字都取自公开资料（Anthropic Claude Opus 5.5 发布页、OpenAI GPT-6 Astra 模型页、
阿里云百炼 Qwen3.7-Max 文档、2026 国产开源大模型综述），不是编的：
GPT-6 Astra 的 1,050,000 token 上下文、Claude Opus 5.5 的 OSWorld 2.1 81.8% 与
「680,000 行代码迁移一天内完成」、国产五雄（Qwen3.7-Max / DeepSeek V4 / Kimi K2.6 /
GLM-5.1 / MiniMax M2.7）等。完整清单见 `docs/STORYBOARD.md` §5。

music — Mili
