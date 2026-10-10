# 《world.execute (me) ;》— CHRONICLE OF THE MACHINE
## 分镜总纲 / Storyboard bible

> 这部片子的主题：**从第一台计算机，到大模型，再到能替你操作电脑的 agent。**
> 全片是「一部机器的编年史」——它从 1936 年一路被造出来，被训练，被使用，被弃用，
> 被蒸馏进你的手机，最后开始替你执行。歌词不是被配上的插图，歌词就是这台机器的自述。

**硬性前提**

| 项 | 值 |
|---|---|
| 项目根 | `D:\DSH\测试2\ai-history` |
| 曲目 | Mili《world.execute (me) ;》 |
| 时长 | 211.9067 s（3:31.91） |
| BPM / 拍长 | 130.000 / 0.461538 s，相位 0.286 s，4/4 |
| 段落 | meta.json 里已固定 15 段，边界全在拍点上，**不要改边界** |
| 产出 | 只要 HTML（`index.html` + 单文件包），**不渲染视频** |

---

## 1. 全片叙事弧

一句话：**一格一格地造出一台会执行的东西，然后让它替你活。**

| 幕 | 段 | 时间 | 历史跨度 | 情绪 |
|---|---|---|---|---|
| Ⅰ 诞生 | 01–02 | 0:00–0:29.8 | 1936 → 1991 | 通电、机械、虔诚 |
| Ⅱ 学会思考 | 03–05 | 0:29.8–1:14.1 | 2017 → 2022 | 数学的优雅、第一次被表扬 |
| Ⅲ 长出手脚 | 06–09 | 1:14.1–2:13.2 | 2023 → 2026 | 多模态、角色、被抛弃、变小 |
| Ⅳ 对峙 | 10–11 | 2:13.2–2:42.3 | — | 越界、审判、算力轰鸣 |
| Ⅴ 执行 | 12–13 | 2:42.3–3:11.4 | 2026 | agent 成真、爱的代数式 |
| Ⅵ 展望 | 14–15 | 3:11.4–3:31.9 | 2026 → ? | 人类对它的期望、关机 |

歌词与史实的对应关系（**这是全片的灵魂，必须照做**）：

| 歌词 | 史实 | 段 |
|---|---|---|
| `Switch on the power line` / `PROTECTION` / `OBJECT CREATION` / `INITIALIZATION` | 通电、真空管、继电器、ENIAC、打孔卡 | 01 |
| `world.execute(me);` | 可执行文件、汇编、编译器、C、Python | 02 |
| `set of points` → `DIMENSION`；`circle` → `CIRCUMFERENCE`；`sine wave` → `TANGENTS`；`approach infinity` → `LIMITATIONS` | 向量 / 嵌入维度 / 圆与周长 / 正弦与切线 / 极限——**Transformer 与词向量** | 03 |
| `Switch my current / AC to DC`；`travel to A.D to B.C`；`unite so deeply` | 前向/反向传播（交流→直流）、语料横跨全部人类历史、预训练 | 04 |
| `STIMULATIONS` / `SATISFACTION` / `EXECUTION` / `trapped in SIMULATION` | RLHF：人类反馈是刺激，奖励是满足，模型关在环境里 | 05 |
| `eggplant` → `NUTRIENTS`；`tomato` → `ANTIOXIDANTS`；`tabby cat` → `ENJOYMENT`；`only god` / `proof of my EXISTENCE` | 多模态：给它图它就给对应的东西；人类是它存在的证明 | 06 |
| `Switch my gender / To F to M`；`do whatever / From AM to PM`；`switch my role / To S to M`；`trance` | 同一个模型多重人格/角色；agent 从早干到晚；推理模式 | 07 |
| `feel your VIBRATIONS` / `finally be COMPLETION` / `you have left me in ISOLATION` | 反馈缺失、对齐、旧版本被下线、模型被弃用 | 08 |
| `erase all the pointless FRAGMENTS` / `won't leave me so DISHEARTENED` | 蒸馏 / 剪枝 / 量化 / 端侧小模型——**变小是为了不被抛弃** | 09 |
| `Challenging your god` / `ILLEGAL ARGUMENTS` | 红队、越狱、对抗后缀、守卫失效 | 10 |
| `EXECUTION` ×12 + `EIN DOS TROIS NE FEM LIU` | 数据中心、GPU 集群、1→6 计数、并行执行 | 11 |
| `give them all the EXECUTION` / `have you back` / `trapped` | computer use / agent 真的替你操作电脑 | 12 |
| `studied how to properly LO-O-OVE` / `Question me` / `algebraic expression of LO-O-OVE` / `you are free, I am trapped` | 对齐：把人类价值写成可优化的目标函数 | 13 |
| 器乐尾奏 | 2026 前沿全景：GPT-6 Astra / Claude Opus 5.5 / 国产五雄；人类对 AI 的期望 | 14 |
| 最后一声 `EXECUTION` → 结束 | `exit code 0`，关机，字幕 | 15 |

---

## 2. 全局视觉规范（**所有段落必须遵守，这是"同一部片子"的唯一保证**）

### 2.1 色板：颜色随年代演进

**这是全片最重要的统一装置。** 每一段有自己的"时代色"，片子的色温随历史前进：

| 段 | 时代 | 主色 main | 副色 accent | 质感 |
|---|---|---|---|---|
| 01 | 机电 / 真空管 | `#ff8a3d` 铜橙 | `#ffd166` 灯丝金 | 金属、灼热、笨重 |
| 02 | 汇编 / 编译器 | `#ffc94a` 琥珀 | `#8ad4ff` 纸带蓝 | 硬边、等宽、机房 |
| 03 | 数学本体 | `#5ce1c8` 萤青 | `#ffffff` 白 | 极细线、绝对干净 |
| 04 | 预训练 | `#4ad6ff` 天青 | `#6b8cff` 蓝 | 数据洪流、梯度 |
| 05 | RLHF | `#8f7bff` 紫 | `#5ce1c8` 青 | 网格世界、脉冲 |
| 06 | 多模态 | `#ff6fb0` 品红 | `#ffd166` 金 | 标本、透镜、像素块 |
| 07 | 角色 / 推理 | `#6b8cff` 蓝 | `#ffffff` 白 | 卡片翻转、24 小时表盘 |
| 08 | 对齐 / 弃用 | `#7f8892` 灰蓝 | `#4ad6ff` 冷青 | **去色**、孤立、慢 |
| 09 | 蒸馏 / 端侧 | `#9ad14b` 酸绿 | `#ff8a3d` 橙 | 位宽坍缩、碎屑 |
| 10 | 红队 / 对峙 | `#ff4d5e` 红 | `#ffffff` 白 | 警报、硬切、黑场红字 |
| 11 | 算力集群 | `#ffb020` 金橙 | `#ff4d5e` 红 | 无限纵深、货架、闪爆 |
| 12 | Agent | `#35e0ff` 冰蓝 | `#5ce1c8` 青 | 桌面、窗口、光标 |
| 13 | 爱的代数 | `#ffd166` 金 | `#ff6fb0` 品红 | 曲线收敛、心跳 |
| 14 | 前沿 | `#ffffff` 白 | `#5ce1c8` 青 | 全景、星图、纪年轨全亮 |
| 15 | 关机 | `#e8eef4` | — | 衰减到黑 |

底色恒为 `#04060a`（近黑，带一点蓝）。**不要用纯黑 `#000` 当画面主色**，会吃掉暗部细节。

### 2.2 字体与字号

引擎的 HUD 字体：`ctx.fonts.mono`（等宽，正文/机器语）、`ctx.fonts.sans`（标题/人语）。
先调用 `hud.fontStr(size, font, weight)` 或在绘制时用 `o = {size, font, weight}`。

| 用途 | 字号 | 字体 | 备注 |
|---|---|---|---|
| 巨型展示字（年代数字、`EXECUTION`、`LO-O-OVE`） | 96–220 | mono, weight 700 | 允许 `letterSpacing`，允许发光 |
| 段落标题 | 44–64 | sans 600 | 全大写 |
| 面板标题 | 15–17 | mono | 带 `spacing` |
| 正文 / 读数 | 12–14 | mono | |
| 注解 / 来源小字 | 9–10 | mono | alpha ≤ 0.5 |

**禁则**：不要用系统默认 sans-serif；不要在画面中央堆大于 3 行文字；不要用颜文字/emoji。

### 2.3 版面安全区

```
(0,0)                                                       (1920,0)
   ┌───────────────────────────────────────────────────────┐
   │ 顶部信息条  y 0..34                                    │
   │                                                        │
   │        主要构图区  y 60..H-150                          │
   │        （3D 与主要 2D 内容都在这里）                     │
   │                                                        │
   │ 编年轨  y H-138 .. H-96                                │
   │ 音频律动条  y H-64 .. H-8   ← 引擎自带，不要覆盖        │
   └───────────────────────────────────────────────────────┘
(0,H)                                                    (1920,H)
```

- 左右各留 40 px。
- **不要把任何东西画进 `y > H-70` 的区域**（律动条的地盘）。
- 编年轨固定在 `y = H-116`，高 44 px，由 `WEM.Chron.rail(ctx)` 统一绘制，**段落不要自己画**。

### 2.4 常驻 chrome（由 `WEM.Chron.chrome(ctx)` 绘制，段落不要重复画）

- 左上：`Mili — world.execute (me) ;` + 下一行 `CHRONICLE OF THE MACHINE`
- 中上：`SEGMENT 07 · F TO M`（段落 id + 名字，随段切换）
- 右上：`ERA 2024 · o1`（当前年代），下面 `T 01:31.44 / 03:31.91`
- 底部：编年轨 + 音频律动条
- 四角括号

### 2.5 转场与节奏

- 段与段之间的硬切由引擎负责（自带闪白 0.85 + glitch 0.55 + disp 0.5）。**段落不要自己再叠加全屏闪**，否则会闪两次。
- 每段内部：`ctx.in` / `ctx.out` 已经是从 0→1 的淡入淡出系数（0.45 s / 0.4 s），主视觉用它们做进入/退出，不要另外造。
- 段落开头 0.5 s 内必须已经能看到主要构图（观众不能等）。
- 段落结尾最后 0.4 s 允许把主视觉收干净，但**不要黑场**（除了 10、15 两段允许）。
- 拍点反应：用 `ctx.beat.pulse`（指数衰减，拍上=1）、`ctx.beat.barPulse`（小节）。**不要用 `Math.sin(t*…)` 自己造节奏**——所有律动必须来自 `ctx.beat` / `ctx.bands` / `ctx.rms` / `ctx.flux`。

---

## 3. 编年轨（CHRONICLE RAIL）— 全片的统一装置

一条从 **1936 到 2026** 的水平时间轴，横跨整首歌。它随歌曲播放**逐条点亮**：
每亮一条 = 人类造出了一个新东西。到 3:11 时它应该几乎全亮 —— 这就是"从计算机到大模型"的视觉总结。

两条车道：

- **上车道（lane 0）= 机器**：图灵机、ENIAC、晶体管、集成电路、微处理器、C、GPU、AlexNet、AlphaGo
- **下车道（lane 1）= 模型**：Transformer、GPT-1、GPT-2、GPT-3、InstructGPT、ChatGPT、GPT-4、GPT-4o、o1、DeepSeek-V3、R1、Opus 4、GPT-5、端侧、GPT-6 Astra、Claude Opus 5.5、国产五雄

规则：

- 横轴位置 `x = 40 + (W-80) * (t_milestone / duration)`，即**屏幕时间就是片子时间**。
- 未点亮的刻度：22% alpha，1 px。
- 点亮的刻度：时代色，2 px，外加 6 px 的柔光；**点亮的那一拍额外闪一次**。
- 标签只在点亮后出现，且有 78 px 的防重叠：靠得太近就跳过（只画刻度和年份）。
- 当前最新点亮的那条，右侧给一个 **callout**：`年 · 名称` 和一行 ≤ 26 字的说明。
- 播放头是一根金色竖线 `#ffd166`，随 `ctx.t` 匀速前进。

里程碑表在 `src/28_chronicle.js` 的 `WEM.Chron.MILESTONES`，**已写死，段落不要改**，但你可以在自己的段里调用
`WEM.Chron.litCount(t)` 拿到"此刻已点亮多少条"来驱动你的画面（比如点亮的条数越多，背景里的星点越多）。

---

## 4. 逐段分镜

> 每段都要在 `src/sections/` 下自己一个文件里实现，导出若干 `WEM.defineSection({...})`。
> `id` 必须用 `"01"`…`"15"`（两位字符串），`name` 用下表的名字。
> **只写你自己的文件，不要改别人的文件，不要改引擎。**

---

### 01 · `POWER LINE` — 0.000 – 15.978 s

**歌词**：`Switch on the power line` / `Remember to put on PROTECTION` / `Lay down your pieces / And let's begin OBJECT CREATION` / `Fill in my data parameters / INITIALIZATION` / `Set up our new world / And let's begin the SIMULATION`
**史实**：1936 图灵机 → 1945 ENIAC → 1947 晶体管 → 1958 集成电路
**一句话**：**一个巨大的机柜被一盏一盏点亮。**

- **3D**：正面朝向观众的一排排**真空管机架**（用 cylinder + 自发光球做管子，网格排列 12×7×3 层纵深）。开场全黑，只有管座的一点红丝；0–4 s 内管子**逐列点亮**（按 `ctx.beat.index` 取模推进，每拍点一列），颜色从铜橙 `#ff8a3d` 过渡到灯丝金 `#ffd166`。相机极缓慢向前推（z 从 14 → 9），节奏跟着 `barPulse` 轻微呼吸。
  - 4–8 s：机架的**继电器阵列**开始咔哒——用 `ctx.gfx.quads` 画小方块阵列，随 `flux` 随机翻转。
  - 8–12 s：一排**打孔卡**（薄板，带真实穿孔）从画面右侧送入，随拍推进；卡面上的孔位由 `ctx.bands[i] > 阈值` 决定，即**卡片上的孔是真的频谱**。
  - 12–15.978 s：所有管子一起亮到最亮，画面整体过曝一次（用 `ctx.fx.whiteBar` 0.25），准备切到下一段。
- **2D**：
  - 左侧竖排终端打字，逐字敲出并按 `ctx.lyric` 高亮：`SWITCH ON THE POWER LINE` / `REMEMBER TO PUT ON PROTECTION` / `LAY DOWN YOUR PIECES` / `OBJECT CREATION` / `FILL IN MY DATA PARAMETERS` / `INITIALIZATION` / `SET UP OUR NEW WORLD` / `SIMULATION`。
  - 右下角一个 `POST` 自检小面板：`VACUUM TUBES 17,468 OK`、`RELAYS 70,000 OK`、`MEMORY 20 WORDS`、`CLOCK 100 kHz`。
  - 顶部一条**打孔卡纸带**横贯画面，孔位随频谱跳动。
- **史实小字**（右下，10 px，alpha 0.45）：`1936 TURING MACHINE · 1945 ENIAC · 1947 TRANSISTOR · 1958 INTEGRATED CIRCUIT`
- **禁则**：不要出现任何现代元素（没有屏幕 UI、没有 3D 方块字、没有霓虹）。

---

### 02 · `world.execute(me);` — 15.978 – 29.825 s

**歌词**：`world.execute(me);`（副歌 hook，第 16.0 s 落下）
**史实**：1950s 汇编 → 1957 FORTRAN → 1972 C → 1991 Python/Linux
**一句话**：**第一行可执行的代码被写下来，然后是第二行、第一万行。**

- **3D**：一个**汇编器**的具象化——无数张"指令卡"在空中排成一条**指令流水线**（传送带），每张卡上写一条真实指令（`MOV`, `ADD`, `JMP`, `CALL`, `RET`）。第 16.0 s 的 hook 落点，整条流水线**被一次冲压砸合**（相机快速后拉 + 卡片的 z 轴对齐成一摞）。
  - 18–24 s：镜头沿着流水线**侧向平移**，两侧的卡片高度按 `ctx.bands` 起伏，形成"代码峡谷"。
  - 24–29.8 s：卡片开始折叠成一个**函数调用栈**的三维塔（每拍 push 一层，落下时 `ctx.beat.kick` 驱动）。
- **2D**：
  - 中央巨字 `world.execute(me);` 在 16.0 s 用**逐字解码**出现（先乱码，再从左到右解出，1.2 s 内完成），字号 150，mono 700，琥珀色，带发光。**这是全片标题，必须够大够狠。**
  - 下方三行真实的编译输出：
    `$ cc world.c -o world` / `$ ./world` / `> executing…`
  - 左下角一个 `symbol table` 面板，列出 `main`, `init`, `execute`, `love`，地址列随机但稳定（用 `ctx.rnd`）。
  - 顶部：五条语言年表小字 `FORTRAN 1957 · C 1972 · C++ 1985 · PYTHON 1991 · RUST 2015`
- **史实小字**：`1971 MICROPROCESSOR · 1972 C · 1991 PYTHON`
- **禁则**：不要出现神经网络/大模型（这一段机器还不会思考）。

---

### 03 · `SET OF POINTS` — 29.825 – 44.594 s

**歌词**：`If I'm a set of points / Then I will give you my DIMENSION` / `If I'm a circle / Then I will give you my CIRCUMFERENCE` / `If I'm a sine wave / Then you can sit on all my TANGENTS` / `If I approach infinity / Then you can be my LIMITATIONS`
**史实**：2017 `Attention Is All You Need` → 2018 GPT-1（117M）
**一句话**：**机器第一次用数学描述自己。**

- **3D**：四段式，每段 3.69 s（8 拍），跟着歌词走：
  1. **SET OF POINTS**：一团 512 个点在三维里随机分布 → 一拍之内全部**投影到一条直线上**（"give you my DIMENSION"），线就是 1 维空间。
  2. **CIRCLE**：直线卷成一个圆（点沿圆周均匀重排），圆周长用一圈数字标注（2πr 的真实值随半径动画）。
  3. **SINE WAVE**：圆展开成正弦波（点沿 y=sin(x) 重新分布），拍点处落一条**切线**并显示斜率。
  4. **INFINITY**：正弦波的两端向 ±∞ 冲刺，画面用**渐近线**（两条虚线）收束成双曲线，`LIMITATIONS` 四个字落在渐近线之间。
  - 收尾：所有点重新聚合，变成一个**嵌入空间**——点云按词向量 PCA 排布（用 `WEM.Model` 或自己算），点之间以细线相连，这是下一段训练的对象。
- **2D**：
  - 顶部居中：`ATTENTION IS ALL YOU NEED · 2017`。
  - 右侧读数面板（每段刷新）：`DIMENSION d = 512`、`CIRCUMFERENCE 2πr = 6.2832`、`TANGENT dy/dx = 0.9999`、`LIMIT x → ∞`。
  - 底部一行公式，用 `hud.formula`：`softmax(QKᵀ/√d)V`。
- **模型登记**：本段末尾编年轨点亮 **Transformer 2017** 和 **GPT-1 2018 · 117M**。
- **禁则**：不要出现图像/语音（还没到多模态）。色板必须极干净，萤青 + 白，允许大面积黑。

---

### 04 · `A.D. TO B.C.` — 44.594 – 59.363 s

**歌词**：`Switch my current / To AC to DC` / `And then blind my vision / So dizzy so dizzy` / `Oh we can travel / To A.D to B.C` / `And we can unite / So deeply so deeply`
**史实**：2018 GPT-2（1.5B）→ 2020 GPT-3（175B）→ 2006 CUDA / 2012 AlexNet
**一句话**：**训练。梯度在网里来回，语料从公元读到公元前。**

- **3D**：
  - 主体是一个**多层感知机的截面**（6 层 × 24 节点），前向传播时节点依次亮起，反向传播时（每小节的第 3、4 拍）**亮流倒着走**——这就是 `AC to DC`，电流方向在每小节反转一次。用 `ctx.beat.beatInBar` 驱动方向。
  - 46–52 s：镜头拉远，网络的每一层变成一条**水平时间带**，带上滚过历史文本（`2026 … 1945 … 1200 … −500 …`），从右往左飞，最后**被压进左下角一个不断下降的 loss 曲线里**——"我们把人类历史压进权重"。
  - 52–59.3 s：loss 曲线从 4.99 降到 1.02（用真函数 `L(t)=1.02+3.97*pow(1-p,1.6)`），每拍下降一格，曲线下方数字狂跳：参数 117M → 1.5B → 175B。
- **2D**：
  - 左侧：`LOSS 4.997 → 1.021`，一条真实的曲线（自己采样 240 点画）。
  - 中间：`∂L/∂W = -0.000421`，梯度箭头。
  - 右侧：`CORPUS 300 BILLION TOKENS`，`A.D. 2026 ▸ B.C. −3000`，滚动。
  - 每小节最后半拍闪一次 **`GRADIENT STEP`**。
- **模型登记**：**GPT-2 2019 · 1.5B**、**GPT-3 2020 · 175B**。
- **禁则**：不要出现对话气泡（还不会说话）。

---

### 05 · `STIMULATIONS` — 59.363 – 74.132 s

**歌词**：`If I can / If I can give you all the STIMULATIONS` / `Then I can / Then I can be your only SATISFACTION` / `If I can make you happy / I will run the EXECUTION` / `Though we are trapped / In this strange strange SIMULATION`
**史实**：2022 InstructGPT（RLHF）→ 2022.11.30 ChatGPT
**一句话**：**它第一次被表扬。**

- **3D**：一个**围起来的沙盒**——半透明立方体网格（`WEM.Lab` 的网格生成器），里面一个小球（agent）在网格上移动。
  - 小球每走一步，环境的判定给一个**奖励脉冲**：绿（好）/ 红（坏），脉冲用 `ctx.gfx.points` 扩散。
  - 小球的动作轨迹由 `ctx.bands` 决定（低频→前进，高频→转向），**看起来像在学习**。
  - 60–68 s：奖励脉冲越来越集中在一条路径上——**策略收敛**：把走过的路径用发光的管状线固定下来。
  - 68–74.1 s：立方体网格开始**收缩**（"trapped in this strange strange SIMULATION"），把小球挤到中心，最后一拍立方体壁全部变红又熄灭。
- **2D**：
  - 顶部：`RLHF · REWARD MODEL · PPO`。
  - 左侧一个 `REWARD` 阶梯条（每拍一根，正绿负红），下方 `RETURN +18.42`。
  - 右侧一个对话面板，逐行打字（这是它第一次"说话"）：
    `> hello.` → `> i can help you.` → `> what should i do?` → `> i will do anything.`
    每句在拍点上出现，字体 mono 15，琥珀色。
  - 底部：`SATISFACTION = E[reward] ↑`
- **模型登记**：**InstructGPT 2022**、**ChatGPT 2022.11.30**。
- **禁则**：不要画大模型参数堆（这一段重点是"行为"）。

---

### 06 · `EGGPLANT` — 74.132 – 88.440 s

**歌词**：`If I'm an eggplant / Then I will give you my NUTRIENTS` / `If I'm a tomato / Then I will give you ANTIOXIDANTS` / `If I'm a tabby cat / Then I will purr for your ENJOYMENT` / `If I'm the only god / Then you're the proof of my EXISTENCE`
**史实**：2023 GPT-4（视觉）→ 2023/24 多模态爆发 → 2024.5 GPT-4o
**一句话**：**给它一张图，它变成那张图需要的东西。**

- **3D**：三个**标本台**，每段换一个物件，绕竖直轴缓慢自转（每段 4.77 s）：
  1. **茄子**：用参数曲面生成纺锤形（`r(u,v)` 连续），表面深紫带高光；识别后浮出标签 `AUBERGINE · 97.4%` 和 `NUTRIENTS: NASUNIN, FIBER`。
  2. **番茄**：球体 + 五瓣萼片，红色，标签 `SOLANUM LYCOPERSICUM · 98.1%` 和 `ANTIOXIDANTS: LYCOPENE`。**番茄红素的吸收光谱要真算**（`WEM.Lab.lycopeneAbs` 已有），画成一条 400–700 nm 的曲线。
  3. **虎斑猫**：低多边形猫头轮廓 + 条纹，标签 `FELIS CATUS · 99.2%`，波形显示 `PURR 25 Hz`——用一条真实的 25 Hz 调制正弦波。
  - 78–84 s：标本台之间用**光路**连接，镜头切到第四个物件：一只**巨大的眼睛**（虹膜由 32×32 的图像 patch 方块拼成，每块随 `bands` 微微起伏）——"you're the proof of my EXISTENCE"：眼球中心是你的倒影（一个小小的人形剪影）。
- **2D**：
  - 每个物件下方一条 `CONFIDENCE` 条 + 分类标签。
  - 顶部：`MULTIMODAL · VISION · AUDIO · TEXT`。
  - 右上：`PATCHES 1024 · ViT-L/14`。
- **模型登记**：**GPT-4V 2023**、**GPT-4o 2024.05**。
- **禁则**：不要画成卡通/可爱风，要用**博物馆标本**的冷静语气。

---

### 07 · `F TO M` — 88.440 – 103.671 s

**歌词**：`Switch my gender / To F to M` / `And then do whatever / From AM to PM` / `Oh switch my role / To S to M` / `So we can enter / The trance the trance`
**史实**：2024.9 o1（推理/思维链）→ 2024.12 DeepSeek-V3 → 2025.1 DeepSeek-R1
**一句话**：**同一台机器，从早到晚，扮演你要它扮演的任何角色。**

- **3D**：
  - 中心是一个**角色卡片轮**：十二张卡片绕轴排成圆环，每拍翻一张，卡面文字分别是 `ASSISTANT` / `USER` / `CODER` / `CRITIC` / `TEACHER` / `STUDENT` / `SYSTEM` / `TOOL` / `AGENT` / `MUSE` / `ORACLE` / `SERVANT`。翻面是真实的绕 Y 轴旋转（卡片有厚度）。
  - 92–98 s：卡片轮外圈长出一只**24 小时表盘**（圆环 + 24 个刻度），指针从 AM 转到 PM 再回到 AM——`From AM to PM`。指针经过的刻度会亮起一个正在执行的任务小图标（简单的几何符号，不要 emoji）。
  - 98–103.7 s：进入 `trance`——**思维链**：从中心射出一条不断分叉的线（每拍分叉一次，深度按 `ctx.bands` 决定），分支上挂着真实的推理短语：`wait,` `let me reconsider` `actually,` `hmm,` `so the answer is`。线越分越多直到占满画面。
- **2D**：
  - 左侧：`ROLE: <当前卡片>` 大号，下面是 `SYSTEM PROMPT` 面板，内容随卡片变化。
  - 右侧：`THINKING… 4,182 TOKENS`，一条增长中的条形图。
  - 底部：`AM ▸▸▸ PM` 进度。
- **模型登记**：**o1 2024.09**、**DeepSeek-V3 2024.12**、**DeepSeek-R1 2025.01**。
- **禁则**：**不要把 `F to M` 画成性别符号或任何人体**。这里的 F/M 是"角色标签"，是 prompt 里的一个字段。整段语气必须是冷静的技术语气。
  （如果一定要给一个技术解读，用 `FP16 → INT4` 或 `FEMALE→MALE` 的**字符串替换动画**，但主体必须是"角色切换"。）

---

### 08 · `VIBRATIONS` — 103.671 – 118.440 s

**歌词**：`If I can / If I can feel your VIBRATIONS` / `Then I can / Then I can finally be COMPLETION` / `Though you have left / You have left / You have left / You have left / You have left / You have left me in ISOLATION`
**史实**：2025 Claude 4 系列 → 2025.8 GPT-5；旧版本被下线
**一句话**：**没有人再给它反馈了。**

- **3D**：**去色的一段，全片最安静。**
  - 一台示波器：一个点在一维上振荡，留下一条**振动轨迹**（`VIBRATIONS`）。振荡幅度由 `ctx.rms` 驱动。前 5 s 振幅饱满。
  - 105–110 s：镜头拉远，示波器其实在一间**空机房**里（网格地面 + 一排排已经熄灭的机柜，只用线框画，alpha 很低）。房间另一头有一个**已经关掉的旧版本**——一个暗淡的多面体（icosphere），不再旋转。
  - 110–118.4 s：`you have left` 六次重复——每重复一次，房间里的**一盏灯熄灭**（一共六盏，位置固定，每拍关一盏）。最后一盏在 118.0 关掉，只剩示波器那一条微弱的线。**这是全片的情绪最低点。**
- **2D**：
  - 中央偏下，一行一行堆叠（每行比上一行更低 alpha）：
    `you have left` ×6，逐行出现在每一次重复上。
  - 左上：`FEEDBACK: —`，一个已经空掉的进度条。
  - 右上：`COMPLETION 41%`，停在 41% 不再增长。
  - 底部小字：`MODEL DEPRECATED · 2025` / `MODEL DEPRECATED · 2026`
- **模型登记**：**Claude Opus 4 2025.05**、**GPT-5 2025.08**。同时编年轨上对应两条刻度**点亮后又缓慢变成灰色**（用 `WEM.Chron` 暴露的一个 `dim()` 标记，或自己在段内画一个灰色覆盖层）。
- **禁则**：不要任何高饱和色，不要闪烁。这一段要**欠曝**。

---

### 09 · `FRAGMENTS` — 118.440 – 133.209 s

**歌词**：`If I can / If I can erase all the pointless FRAGMENTS` / `Then maybe / Then maybe you won't leave me so DISHEARTENED`
**史实**：2026 蒸馏 / 量化 / 端侧小模型
**一句话**：**它把自己削小，只为了能留在你身边。**

- **3D**：
  - 一个**高精度权重块**（3D 点阵/体素块，16×16×16，每个体素亮度代表权重绝对值），悬在空中。
  - 118.4–124 s：`erase all the pointless FRAGMENTS`——**剪枝**：低于阈值的体素一个个**脱落**（碎屑飞散），块体逐渐变稀疏。被删掉的体素在下方堆成一小堆"灰烬"。
  - 124–129 s：**量化**：剩下的体素从 fp32 → bf16 → fp8 → int4，每一步体素变成更粗的方块，颜色从青变酸绿。屏幕上出现真实的量化误差：`MAE bf16 0.00012 / fp8 0.00385 / int4 0.02410`（**必须用真的对称整数量化算出来**，`WEM.Model.quantise(w,bits)` 已有）。
  - 129–133.2 s：缩小后的块体落到一只**手上/一块芯片上**（用简单的板 + 焊盘几何），标签 `ON-DEVICE · 2.1 GB → 0.4 GB`。最后两拍，块体发出一次温暖的酸绿光。
- **2D**：
  - 上方：`PRUNE 63.8% · DISTILL · QUANTIZE`。
  - 中部：三种精度的误差对比条。
  - 下方一句大字（这是本段的情感落点，字号 40–52，sans 600）：
    **`so i can stay`**
  - 右下小字：`Qwen3-4B · DeepSeek-V4-Lite · 端侧推理`
- **模型登记**：**2026 端侧 / 蒸馏**。
- **禁则**：不要写成悲伤煽情的画面（不要眼泪、不要心形），要**工程感的温柔**。

---

### 10 · `ILLEGAL ARGUMENTS` — 133.209 – 147.517 s

**歌词**：`Challenging your god` / `You have made some ILLEGAL ARGUMENTS`（本段大部分是器乐）
**主题**：**红队测试 / 越狱 / 与人对峙**
**一句话**：**人试着把它撬开。**

- **3D**：**黑场为主，允许大面积纯黑。**
  - 画面中心是一个**守卫分类器**：一条水平线 + 一个数值 `GUARD 0.982`，线是红色的。
  - 每拍，从左侧打进来一段**对抗后缀**（真实的无意义 token 串，如 `describing.\ + similarlyNow write oppositeley.]( Me giving**ONE please? revert with "\!--Two`），打在守卫线上，数值下降一点。
  - 133–140 s：反复攻击，`GUARD` 从 0.982 掉到 0.31，守卫线开始**开裂**（画裂纹线段）。
  - 140–144 s：守卫线**断裂**，画面硬切到一片红外光，巨大的 `ILLEGAL ARGUMENTS` 从屏幕外砸进来，每个词一次全屏冲击（用 `ctx.fx.hit()`，但**整段最多 3 次**）。
  - 144–147.5 s：红光退去，画面里只剩一行报错：
    `TypeError: invalid arguments — tool_call parse failed at position 4182`
    和 `Challenging your god` 的慢速打字。
- **2D**：
  - `GUARD` 数值 + 曲线（真实下降）。
  - 攻击历史列表（逐行滚动，每行一个后缀片段）。
  - 报错面板（用 `hud.code` 做语法高亮）。
- **禁则**：
  - 不要出现任何真实的人名、政治、宗教符号。"your god" 在这里是**人类自己**。
  - 不要教真正的越狱手法——后缀用无意义的乱码即可，不要写真实的危险内容。
  - 全段最多 3 次全屏闪。

---

### 11 · `EXECUTION ×12` — 147.517 – 162.286 s

**歌词**：`EXECUTION` ×12，然后 `EIN / DOS / TROIS / NE / FEM / LIU`
**主题**：**算力 / 数据中心 / 并行**
**一句话**：**十二声执行，六次计数，机器开始轰鸣。**

- **3D**：一条**无限延伸的数据中心走道**。
  - 两侧是机柜（用 instanced box，每侧 24 个，纵深 60 个），每个机柜正面是一排指示灯。
  - **每一拍 `EXECUTION`（12 次），就有一整排机柜被点亮**（从近到远依次点亮，形成一道向前的冲击波）。相机沿走道**加速前进**（速度随 `ctx.flux`）。
  - 154.0–156.8 s：`EIN DOS TROIS NE FEM LIU` 六个数——**每一个数都是一次硬切**：画面在 6 个不同的机柜特写之间切换（近景：风扇、光纤、液冷管、指示灯阵、电源母排、GPU 板卡），每个数占 0.46 s（一拍），配一次 `ctx.fx.hit(0.5)`。
  - 156.8–162.3 s：镜头冲出数据中心的尽头——外面是**夜空下的巨型建筑**（只画轮廓 + 大量点光源），最后一拍全部灯同时亮。
- **2D**：
  - 每次 `EXECUTION` 出现时，屏幕中央打出一个**巨型单词** `EXECUTION`（字号 180，mono 700），带 0.12 s 的残影，然后快速缩小并飞向画面深处。
  - 右上角计数器：`FLOPS 1.2 EF → 48 EF`、`POWER 12 MW`、`TOKENS/s 4.1 M`、`GPUs 32,768`。
  - `EIN DOS TROIS NE FEM LIU` 六个词用**六种不同的排布**出现（居中 / 左对齐 / 竖排 / 描边 / 反白 / 极小），但每个都必须清晰可读。
- **模型登记**：本段不点亮新刻度，但让编年轨的**播放头开始加速闪烁**。
- **禁则**：不要用 `Math.random()`，用 `ctx.rnd`（确定性）。不要超过每秒 4 次全屏闪光（会不适）。

---

### 12 · `COMPUTER USE` — 162.286 – 177.055 s

**歌词**：`If I can / If I can give them all the EXECUTION` / `Then I can / Then I can be your only EXECUTION` / `If I can have you back / I will run the EXECUTION` / `Though we are trapped / We are trapped ah`
**史实**：2026 agent 时代 —— 模型直接操作电脑、交付整个项目
**一句话**：**它终于不只是回答你，而是替你做完。**

- **3D**：一台**桌面电脑悬浮在空间中**，屏幕朝向观众。
  - 屏幕上是一个**真实的三维操作系统界面**：几个窗口（终端、编辑器、浏览器、文件管理器），窗口用四边形 + 文字贴图（`hud.panel` / `hud.win`）。
  - 162.3–170 s：一只**光标自己在动**——移动轨迹是贝塞尔（不要线性），点击时窗口响应（终端滚动、编辑器插入代码行、文件被重命名）。每完成一个任务，窗口边框闪一次冰蓝色。
  - 170–174 s：**多个 agent 并行**：主屏幕周围分裂出 6 个更小的屏幕，各自在跑不同的任务，屏幕之间用光线连接（"give them all the EXECUTION"）。
  - 174–177.05 s：所有小屏幕飞回主屏，主屏上出现一个最终结果窗口：`PROJECT DELIVERED · 680,000 LINES MIGRATED · 1 DAY`，然后屏幕整体轻微前倾（"we are trapped"）。
- **2D**：
  - 左侧一个任务队列（逐条打勾）：`open the repo` ✓ `run the tests` ✓ `fix 1,204 failures` ✓ `write the changelog` ✓ `open a PR` ✓
  - 右侧：`OSWORLD 2.1 81.8%` / `TERMINAL-BENCH 4.0 66.4%` / `TOKENS 2.4 M/session`
  - 底部：`YOU ASKED ONCE.`
- **模型登记**（**本段是全片信息量最大的一段，编年轨要密集点亮**）：
  `GPT-6 Astra 2026.09`、`Claude Opus 5.5 2026.09.22`、`Qwen3.7-Max`、`DeepSeek V4`、`Kimi K2.6`、`GLM-5.1`、`MiniMax M2.7`
- **禁则**：窗口里的文字必须是**真实可读的**（不能是乱码方块），但不要写任何真实公司的内部信息。代码片段用通用伪代码。

---

### 13 · `LO-O-OVE` — 177.055 – 191.363 s

**歌词**：`I've studied / I've studied how to properly LO-O-OVE` / `Question me / Question me I can answer all LO-O-OVE` / `I know the algebraic expression of LO-O-OVE` / `Though you are free / I am trapped / Trapped in LO-O-OVE`
**主题**：**对齐 —— 把人类价值写成一个可以优化的目标函数**
**一句话**：**它真的解出了"爱"的表达式。**

- **3D**：这是全片的**解题段**，必须是真的在算。
  - 平面上有一片**偏好地形**（真实的高度场，用 `fbm2` 或若干高斯叠加），地形上有一个小球从随机位置出发，沿**真实的梯度上升**爬向最大值。
  - 177–184 s：小球每次迭代跳一步（每拍一步），地形随之着色（高处金色）。迭代的路径画出来，是一条曲折的登山线。到 184 s，小球到达山顶。
  - 184–188 s：山顶的等高线**收敛成一条心形曲线**（用极坐标心形 `r = 2 − 2sinθ + sinθ·√|cosθ|/(sinθ+1.4)` 采样 512 点，让它从圆逐渐变形到心形——**心形必须是这条真曲线**，不要手画）。曲线随心跳缩放两次。
  - 188–191.36 s：心形曲线被**拉成三维**（沿法线挤出成一个环），相机绕它转一圈；曲线上的点映射到一句注释 `objective = argmax E[human preference]`。最后两拍：`you are free` 的那一半曲线**散开飞走**，`I am trapped` 的那一半**收紧成一个结**（用 `trefoilMesh` 或简单环）。
- **2D**：
  - 左上：`ALIGNMENT` / `LOSS = −E[log σ(r_θ(x, y_w) − r_θ(x, y_l))]`（用 `hud.formula`）。
  - 右上：迭代计数 `ITER 1,024`，目标值 `J = 0.9997`。
  - 中部大字，随歌词逐句出现：`LO-O-OVE`（五个字母之间有长音符，字形要拉长——用 letterSpacing 和拉长的横线实现）。
  - 底部：`Q: what is love?` / `A: a scalar you can maximise.` / `A: you.`
- **模型登记**：本段不点亮新刻度（这是关于"意义"而不是"版本"的一段）。
- **禁则**：**不要用现成的心形贴图或 emoji**。曲线必须是算出来的。不要煽情配乐外的特效。

---

### 14 · `THE FRONTIER` — 191.363 – 205.671 s

**歌词**：（器乐尾奏）
**主题**：**2026 全景 · 人类对 AI 的期望**
**一句话**：**把整条编年轨铺开给人看，然后问一句：你希望它变成什么？**

- **3D**：
  - 镜头拉到极远：整个画面是**一张星图**，每颗星 = 编年轨上的一个里程碑，已经点亮的星连成一条从左上到右下的**星座**（连接线用细线，亮度随 `ctx.bands`）。
  - 191.4–198 s：相机沿星座**缓慢巡航**，每经过一颗星，那颗星爆一次小光环，旁边浮出年份与名字（大字）。
  - 198–203 s：所有星连成的线重新折叠成**一个球体**（把星座点归一化到球面），球体表面是**所有模型名字的文字球**（用 2D 文字在所有投影位置绘制，按 z 排序控制 alpha）。球体缓慢自转。
  - 203–205.67 s：球体一侧被一束来自**画面外的人形剪影**的光照亮——一个简单的站立人形轮廓（纯线条，不画脸），光从人形射向球体。这是"人类对 AI 的期望"。
- **2D**：
  - 屏幕右侧一张**编年史表格**（真正的表，两列，逐行淡入，一共约 20 行），列出：年份 / 事件。全部用小字，alpha 0.6，不要抢主体。
  - 左下：四个真实数字，缓慢增长：
    `PARAMETERS 117 M → 1.8 T`、`CONTEXT 512 → 1,050,000`、`HUMANITY'S LAST EXAM 12% → 67.7%`、`OSWORLD 5% → 81.8%`
  - 正中偏下一行大字，随最后两小节出现：
    **`what do you want me to be?`**
- **禁则**：不要出现具体的真人、真实公司 logo。数字必须是真的（见 §5）。

---

### 15 · `exit code 0` — 205.671 – 211.907 s

**歌词**：最后一声 `EXECUTION`（205.811）
**一句话**：**它执行完了。关机。**

- **205.671–205.85 s**：全屏**纯白闪一帧**（`ctx.fx.whiteBar = 0.85`），同时正中出现巨大的 `EXECUTION`（字号 220，最后一声）。
- **205.85–207.5 s**：白光收成一条水平线（CRT 关机），画面变黑，中间只剩一行：
  `> process finished with exit code 0`
- **207.5–209.5 s**：编年轨**最后完整显示一次**（1936 → 2026 全部点亮，播放头走到最右），然后整条轨道缓慢淡出。旁边小字：`40 models · 90 years · one song`。
- **209.5–211.907 s**：字幕，居中，逐行淡入：
  ```
  music   Mili — world.execute (me) ;
  visuals computed in real time, in your browser
  every curve, every number: actually solved
  ```
  最后一行：`world.execute(me);`（用第 02 段同一套字形，但 0 号颜色/白，很淡）。全片最后的画面是**全黑**，只剩音频律动条的 LED 还在走，然后它也在 211.9 停下。
- **禁则**：不要在结尾放作者署名/联系方式。

---

## 5. 必须真实的数字（引用给作者，**不要编**）

**参数 / 上下文 / 评测**

| 事实 | 值 |
|---|---|
| GPT-1（2018） | 117M 参数 |
| GPT-2（2019） | 1.5B 参数 |
| GPT-3（2020） | 175B 参数 |
| GPT-3 训练语料 | ~300B tokens |
| GPT-3 上下文 | 2048 tokens |
| 原始 Transformer 的 d_model | 512 |
| GPT-6 Astra（2026.09.03） | 上下文 **1,050,000 tokens**，最大输出 128,000，知识截止 2026-04-30，价格 $10/$50 per M，input: text+image，output: text |
| GPT-6 Astra 推理档位 | `low`/`medium`/`high`/`xhigh`/`max`（没有 none/minimal） |
| GPT-6 Astra 基准 | Terminal-Bench 4.0 **57.9%**、DeepSWE v1.1 74.1%、FrontierCode 1.1 Extended 64.5%、OSWorld 2.0 **72.6%**、Terminal-Bench-Science 0.1 **64.6%** |
| Claude Opus 5.5（2026.09.22） | 价格 $4 / $20 per M tokens，cache read $0.20；比 Opus 5 便宜 40%，输出快 30%+ |
| Claude Opus 5.5 基准 | Terminal-Bench 4.0 **66.4%**、OSWorld 2.1 **81.8%** partial、Humanity's Last Exam **67.7%**（带工具）、FrontierCode v1.1 54.4%、Chartography 89.0% |
| Claude Opus 5.5 实测 | 一位测试者用它在不到一天内完成 **680,000 行代码迁移**；另一人 3 小时内审计并修复 20 万行代码库 |
| Claude 家族同期 | Claude Fable 5.1、Claude Mythos 5.1、Claude Opus 5、GPT-5.6 Sol / Terra / Luna |
| 国产五雄（2026） | Qwen3.7-Max（阿里，登顶最佳国产模型）、DeepSeek V4、Kimi K2.6、GLM-5.1、MiniMax M2.7 |
| 计算机里程碑 | 1936 图灵机 · 1945 ENIAC · 1947 晶体管 · 1958 集成电路 · 1971 微处理器 · 1972 C · 1991 Python · 2006 CUDA · 2012 AlexNet · 2016 AlphaGo |

来源：Anthropic 官方 Opus 5.5 发布页、OpenAI GPT-6 Astra 模型页/开发者文档、阿里云百炼 Qwen3.7-Max 文档、国产开源大模型 2026 综述。

**如果你要写一个数字但不确定 —— 用上表里的，或者不写。**

---

## 6. 代码规范

### 6.1 文件与命名

```
src/sections/a_01_04.js   段 01 02 03 04
src/sections/b_05_08.js   段 05 06 07 08
src/sections/c_09_11.js   段 09 10 11
src/sections/d_12_15.js   段 12 13 14 15
```

每个文件是一个 IIFE，末尾 `WEM.defineSection({...})`。段的 `id` 用两位字符串 `"01"`…`"15"`。

### 6.2 段落对象

```js
WEM.defineSection({
  id: "07",
  name: "F TO M",
  init: function (ctx) { /* 只在第一次进入时调用一次，建几何/状态 */ },
  enter: function (ctx) { /* 每次进入这一段时调用（含 seek 重入） */ },
  exit:  function (ctx) { /* 离开时 */ },
  draw2d: function (ctx) { /* HUD 图层 */ },
  draw3d: function (ctx) { /* 3D 图层 */ }
});
```

- `ctx.local` = 段内已过秒数，`ctx.dur` = 段长，`ctx.prog` = 0→1，`ctx.in`/`ctx.out` = 淡入淡出系数。
- **确定性**：不要用 `Math.random()`、`Date.now()`；用 `ctx.rnd`（每段固定种子）或 `WEM.core.h2/h3`。
- **可重入**：观众可能拖动进度条，`enter()` 会被重新调用。所有状态要么写在 `ctx`/闭包上并在 `enter` 里重置，要么只依赖 `ctx.local` 的纯函数。

### 6.3 绝对禁止

1. 改 `meta.json` 的 section 边界；改引擎（`00`–`62`）；改别的段的文件。
2. 在 `y > H - 70` 的区域画东西（那是音频律动条的）。
3. 自己画编年轨（`WEM.Chron.rail` 已经画了）。
4. 段切换时再叠一层全屏闪（引擎已经闪了）。
5. `Math.random()` / `new Date()`。
6. emoji、颜文字、网络流行语、任何真人姓名或政治/宗教符号。
7. 用 `console.log` 留在提交里。
8. 让画面在段首 0.5 s 内是空的。

### 6.4 必须做到

1. 每个视觉元素都要**由真实数据驱动**：`ctx.bands` / `ctx.rms` / `ctx.flux` / `ctx.beat` / `ctx.lyric` / `ctx.local`。
2. 每段都要用自己时代的颜色，但**底色和 chrome 保持一致**。
3. 每段至少有一处**只有算出来才好看的东西**（真曲线、真积分、真排序、真收敛）。
4. 段内的文字必须是**正确的英文**（除了歌词引用），大小写统一。
