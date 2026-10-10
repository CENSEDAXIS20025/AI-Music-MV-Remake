# 《world.search (you) ;》— THE INDEX OF YOU
## 分镜总纲 / Storyboard bible（亮色 · 纸张版）

> **这部片子的主题：语义检索。**
> 一台机器想把「你」找出来，它的办法是——假设你变成别的东西，然后描述那个东西。
> 桌子、茄子、猫、牛排、花、人。它一直在搜，但你要么不完全符合，"somehow you can't
> stop transforming"。最后它终于想起那个词：**Lo-o-o-ove**。
> 全片是**一叠索引卡**：从 1945 年 Vannevar Bush 的 memex，到 2026 年 1,050,000 token
> 的上下文窗口——检索的历史，一格一格被点亮。

**硬性前提**

| 项 | 值 |
|---|---|
| 项目根 | `D:\DSH\测试2\ai-index` |
| 曲目 | Mili《world.search (you) ;》 |
| 时长 | 295.3467 s（4:55.35） |
| BPM / 拍长 | 139.5349 / 0.4300 s，相位 0.200 s |
| 段落 | `meta.json` 里已固定 **22 段**，边界不要改 |
| 主题 | **亮色（纸张）**：`window.WEM_THEME = "light"` 已在 `index.html` 里设死 |
| 产出 | 只要 HTML，**不渲染视频** |

---

## 1. 全片叙事弧

| 幕 | 段 | 时间 | 内容 | 情绪 |
|---|---|---|---|---|
| Ⅰ 索引 | 01–03 | 0:00–0:40.8 | 比较、排序、卡片目录、把记忆插进过去 | 手工、安静、纸张 |
| Ⅱ 描述 | 04–09 | 0:40.8–2:03.5 | 桌子 / 茄子 / 猫 / 牛排 / 花——**用属性去搜一个人** | 好奇、精确、温柔 |
| Ⅲ 找不到 | 10–11 | 2:03.5–2:31.7 | 人；再说一次「I'm searching」 | 渴望 |
| Ⅳ 那个词 | 12–13 | 2:31.7–2:59.6 | **typeahead / 舌尖现象**：DOPE？→ **LO-O-OVE** | **全片高潮** |
| Ⅴ 一直在变 | 14–18 | 2:59.6–3:53.8 | 到处都有你、你一直在变、旧的我、一桶一桶的爱、切成碎片再合起来 | 翻涌 → 澄明 |
| Ⅵ 不再需要检索 | 19–22 | 3:53.8–4:55.3 | 长上下文吞掉整个档案柜；查询学会了自己改写；小狗和番茄 | 释然 |

**歌词 → 检索概念 的对应（必须照做）**

| 歌词 | 概念 | 段 |
|---|---|---|
| `Side by side, the lovelier goes up` / `till the bubble pops` | 两两比较、冒泡、排序 | 01 |
| `Reach for the top` | 排名函数、倒排索引 | 02 |
| `Take a memory, insert to the past` / `Which one is the sweetest? Save it for the last` | 有序插入、微缩胶片、卡片目录 | 03 |
| `If you turn into a table / You must be at the height of my elbows` / `Odd stubby leg makes you wobbly` | **硬约束过滤**，结果集从百万掉到一 | 04 |
| `If you turn into an eggplant / You'll be my purple friend / Scratchy nail marks on your body` | **模糊匹配**：颜色直方图 + 划痕 | 05 |
| `I'm searching` | 查询本身——空结果 | 06 |
| `If you're a cat… blue point / Meowing a lot / Hissing a lot / But you never purr` | **facet 与否定约束（NOT）** | 07 |
| `If you're a steak… browned on the outside / Medium-rare inside` | **多模态查询**：用一张图去搜；真实温度场 | 08 |
| `If you turn into a flower… Even if you bloom just occasionally` | **稀疏命中**：偶尔才有结果 | 09 |
| `If you turn into a human / all the warmth coming from your hands / stinky breath, hair that's unruly` | 搜到人：**不完美本身就是查询** | 10 |
| `I'm searching` | 神经网络检索：两塔模型、余弦相似 | 11 |
| `a piece of sheet / What's that word again? / "Do-o-o-o-ope"?` | **自动补全 / 舌尖现象**：候选被逐个划掉 | 12 |
| `"Lo-o-o-ove"?` | 词向量：那个词终于出现 | 13 |
| `I can see you in most everything / but somehow you can't stop transforming` | 语义地图：到处都有影子，但目标一直在变 | 14 |
| `searching for, searching for, searching for` ×6 / `A-Ah` | 高速重试：每次改写都重排整面卡墙 | 15 |
| `My old self that's gone since you have left` | **丢的不是你，是我**。全片最干净的一格 | 16 |
| `Each one of us has a bucket of love / some of us empty, some of us filled up` | 直方图 / 桶排序 | 17 |
| `Cut this into pieces, break us down to the cell / Merge us back up, we have evolved now` | **分词 → 嵌入 → 池化**，合并后的向量真的变了 | 18 |
| （器乐 27 s） | **长上下文**：整面卡墙被吞进一个窗口，档案柜不再需要 | 19 |
| `I like hug the warmth come from your hands`（歌词改了） | 查询学会了自己改写，分数一路上升 | 20 |
| `If you're a dog… ruff ruff ruff / If you're a fruit / a tomato / full of juice` | 搜索重新变得简单，而且**立刻就成功** | 21 |
| （尾奏） | 还在搜。光标还在闪。 | 22 |

---

## 2. 全局视觉规范（所有段落必须遵守）

### 2.1 这是纸

**整部片子是印刷品。** 亮色不是「深色画面调亮」，是**纸张与墨**：卡片、横格纸、索引标签、印章、红笔批注、荧光笔、点阵打印纸、微缩胶片、档案抽屉。

| 元素 | 规定 |
|---|---|
| 底 | 纸张白（由引擎的纸主题反转产生，你不用管，按深色写就行） |
| 文字 | 深墨；大标题用 mono 700 |
| 强调 | 该段的时代墨色（下表） |
| 高亮 | 荧光笔黄 `#fff2a8`、红笔 `#ff4d5e`、印章蓝 `#2b4fd4` |
| 禁忌 | **霓虹感、发光管、扫描线审美、深色底的荧光**——那些是第一部的语言，这一部不要 |

> 引擎会统一做「亮度反转 + 纸纤维颗粒 + 印刷套印偏差」。所以**你照深色约定写**：
> 写 `rgba(238,242,246,...)` 的白字，成片就是墨字；写亮色，成片就是深色墨。

### 2.2 时代墨色

| 段 | 时代 | main | alt | 段 | 时代 | main | alt |
|---|---|---|---|---|---|---|---|
| 01 | 比较 | `#ff9a4d` | `#ffd166` | 12 | typeahead | `#5ce1c8` | `#8ad4ff` |
| 02 | 索引 | `#ffc94a` | `#ff8a3d` | 13 | 词向量 | `#ff4d8e` | `#b48cff` |
| 03 | 目录 | `#8ad4ff` | `#6b8cff` | 14 | 语义地图 | `#8f7bff` | `#35e0ff` |
| 04 | 约束 | `#5ce1c8` | `#8ad4ff` | 15 | 重试 | `#ff4d5e` | `#ff9a5c` |
| 05 | 模糊 | `#b48cff` | `#ff6fb0` | 16 | 旧的我 | `#9aa3ad` | `#c3cad2` |
| 06 | 空 | `#ff6fb0` | `#b48cff` | 17 | 桶 | `#ffb020` | `#ffd166` |
| 07 | facets | `#6b8cff` | `#35e0ff` | 18 | tokens | `#35e0ff` | `#5ce1c8` |
| 08 | 多模态 | `#ff9a5c` | `#ffd166` | 19 | 长上下文 | `#7ee787` | `#35e0ff` |
| 09 | 稀疏 | `#ffd166` | `#ff9a5c` | 20 | 学会 | `#5ce1c8` | `#7ee787` |
| 10 | 人 | `#ffffff` | `#8ad4ff` | 21 | 快乐 | `#ffd166` | `#ff9a5c` |
| 11 | 神经检索 | `#ff6fb0` | `#ffffff` | 22 | 未解 | `#e8eef4` | `#8ad4ff` |

用 `WEM.Idx.css(ctx.t)` / `css2(ctx.t)` 取，`WEM.Idx.rgbA(hex, a)` 给 `gfx` 用。

### 2.3 字号

| 用途 | 字号 | 说明 |
|---|---|---|
| 巨型展示（`LO-O-OVE`、`I'M SEARCHING`、结果数） | 96–200 | mono 700，允许 `spacing` |
| 段落标题 | 40–60 | sans/mono 600，全大写 |
| 面板标题 / 查询文本 | 15–19 | |
| 正文 / 读数 | 12–14 | |
| 注解小字 | 9–10 | alpha ≤ 0.5 |

### 2.4 版面安全区

```
(0,0)                                                          (1920,0)
  ┌─────────────────────────────────────────────────────────────┐
  │ 顶部信息条  y 0..50                                          │
  │ 查询栏      y 60..102   ← 全片统一装置，chrome 已画，勿重复画  │
  │                                                              │
  │ 主要构图区  y 120 .. H-150                                    │
  │                                                              │
  │ 索引轨      y H-140 .. H-99  ← chrome 已画，勿重复画          │
  │ 音频律动条  y H-64 .. H-8    ← 引擎自带，勿覆盖               │
  └─────────────────────────────────────────────────────────────┘
(0,H)                                                       (1920,H)
```

- 左右各留 40 px（顶部信息条的内容从 x=46 开始）。
- **任何东西都不许画进 `y > H-150`（=930）。**
- 查询栏与索引轨由 `WEM.Idx.chrome(ctx)` 统一绘制，**段落不要自己画**。

### 2.5 两个全片统一装置

**(a) 查询栏**：顶部那条搜索框。它显示**当前歌词行**作为查询词，右侧是命中数。
命中数由段落决定：在 `draw2d` 里写 `ctx.hits = 数字或字符串`（不设就是 `—`）。
想让查询词不是当前歌词，可以自己调
`WEM.Idx.queryBar(ctx, {text:"…", hits:12, note:"RESULTS", prog:0.4})`，
并在 `draw2d` 里设 `ctx.__qDrawn = ctx.t;` 阻止 chrome 再画一遍。

**(b) 索引轨**：底部从 1945 到 2026 的检索史，随歌逐格点亮（`WEM.Idx.MILESTONES`）。
你可以在段里用 `WEM.Idx.litCount(ctx.t)`（此刻亮了几格）驱动画面，比如「亮了几格就有几张卡片立起来」。

### 2.6 转场

- 段间硬切由引擎负责（自带一次闪 + glitch + disp）。**不要再叠全屏闪**。
- `ctx.in` / `ctx.out` 已经是 0→1 的淡入淡出系数。
- 段首 0.5 s 内必须已经能看到主要构图。
- 节奏一律来自 `ctx.beat`（`pulse` / `barPulse` / `kick` / `beatInBar`）、`ctx.bands`、`ctx.rms`、`ctx.flux`。
- **不要用 `Math.sin(t*k)` 自己造节奏。**

---

## 3. 逐段分镜

> 每段实现为 `WEM.defineSection({id, name, init, enter, draw2d, draw3d})`。
> `id` 必须是 `"01"`…`"22"`（两位字符串），`name` 用下表。
> **只写你自己的文件，不要改引擎、不要改别人的文件。**

---

### 01 · `SIDE BY SIDE` — 0.000 – 14.370

**歌词**：`Side by side, the lovelier goes up` / `Reach for the top, till the bubble pops` / `Take a memory, insert to the past` / `Which one is the sweetest? Save it for the last`
**一句话**：**一切从比较开始。**

- **3D**：一张工作台的长镜头（木质桌面 + 一盏铜台灯 + 一个抽屉）。一叠空白索引卡平铺开来，**每拍两两比较一次**：两张卡升起、并排、更"可爱"的那张浮得更高，另一张落下。用真实比较器（按卡上的分数）。
  - 4–8 s：卡片越堆越高，`Reach for the top`；8.2 s 的一声（用 `ctx.fx` 的 `whiteBar` 0.2，**不要 hit**）——**泡泡破了**，整摞卡片炸开四散再缓缓落下。
  - 9–12 s：桌面中央出现一条**长横线**（时间轴），一张卡从右侧飞来，**插进线的中间**，两边的卡被真实推开（`insert to the past`）。
  - 12–14.37 s：所有卡收拢成一摞，最上面那张被单独抽出来放到一边（`Save it for the last`）。
- **2D**：
  - 左上横格卡上打字打出四行歌词（每行随 `ctx.lyric` 高亮）。
  - 左下计数器：`COMPARISONS 01/64`（每拍 +1）、`SWAPS 00/31`。
  - 右下小卡：`SORT · BUBBLE · n = 64`，一条真实的气泡排序进度条。
  - `ctx.hits`：`1048576`（还没有查询，只是全集）。
- **史实小字**（右下，10 px，alpha 0.45）：`1945 VANNEVAR BUSH · "AS WE MAY THINK" · THE MEMEX`
- **禁则**：不要出现屏幕、不要出现任何电子设备。这是 1945 年，纸和铜。

---

### 02 · `RANK` — 14.370 – 28.230

**歌词**：（器乐；延续 `Reach for the top`）
**一句话**：**分数决定了谁在上面；然后第一次出现了「索引」。**

- **3D**：
  - 14.4–21 s：一列**垂直的排名塔**——32 张卡像瀑布一样挂在空中，按真实分数实时排序（用插入排序，每拍交换一对）。卡片高度随分数上升。镜头缓慢上摇（`Reach for the top`）。
  - 21–28.2 s：画面右后方一台**点阵打印机**开始吐纸，纸带从画面上方垂下、堆到桌面。纸上打印的是**这首歌自己的倒排索引**：`WORD → LINE NUMBERS`，用 `ctx.data.lrc` 真算出来（每个词出现在哪几行），并按 **真实 TF-IDF**（`tf × log(N/df)`）降序排列，权重高的词印得更黑。
  - 纸越堆越多，打印机每拍打一行。
- **2D**：
  - 左侧排名表：`RANK / DOC / SCORE`，12 行，分数每拍刷新（0.001 精度）。
  - 右侧打印预览：`INVERTED INDEX · 131 LINES · 214 TERMS`，下面列出权重最高的 8 个词（真的算出来的）。
  - 顶部一条 `PRINTER 22 CPS · PAPER 1,204 SHEETS`。
  - `ctx.hits` 每拍下降：1048576 → … → 65536。
- **史实小字**：`1960 INVERTED INDEX · 1972 TF-IDF · KAREN SPÄRCK JONES`
- **禁则**：不要把它做成"数据可视化"的样子——它必须像**一间 1970 年代的机房里真实发生的事**。

---

### 03 · `TAKE A MEMORY` — 28.230 – 40.770

**歌词**：`Take a memory, insert to the past` / `Which one is the sweetest? Save it for the last`
**一句话**：**卡片目录与微缩胶片——把一段记忆插回它应该在的位置。**

- **3D**：
  - 28.2–34 s：一整面**图书馆卡片柜**（抽屉阵列，黄铜拉手，单点透视）。一个抽屉滑出来，里面是一根穿卡的钢杆；一张写着日期的卡片飞过来，**插进正确的位置**，后面的卡依次被推开一格。做三次，插入的日期越来越早（2026 → 1998 → 1972）。
  - 34–40.8 s：镜头转向一台**微缩胶片阅读器**：胶卷盘转动，胶片上一格一格的画面扫过镜头，投影到画面上。胶片格里的内容逐格变化（用简单的图像 patch 拼）。最后停在标着 `SWEETEST` 的那一格。
- **2D**：
  - 左侧一条**时间轴**，刻度 1945…2026，三张卡被插进去的瞬间刻度亮一下。
  - 右上：`CATALOG · DRAWER 07 · CARD 0412`，下面是这张卡的字段表。
  - `ctx.hits` 缓慢下降 65536 → 8192。
- **史实小字**：`1951 MICROFILM CATALOG · 1989 THE WEB`
- **禁则**：不要出现鼠标和窗口。这一段是**实物**。

---

### 04 · `TABLE` — 40.770 – 54.350

**歌词**：`If you turn into a table` / `You must be at the height of my elbows` / `Odd stubby leg makes you wobbly` / `You're the only perfect table for me`
**一句话**：**加一条约束，候选就少一大截。**

- **3D**：中央一张**桌子**，几何是参数化的：桌面高 `h`、腿数 `legs`（3–6）、腿长偏差 `err`。
  - 40.8–46 s：桌子自己旋转展示。约束逐条落下（每两拍一条），每次落下时画面里的**网格桌面**（候选集）被真实筛掉一片：
    `h ∈ [0.70, 0.74] m`（`at the height of my elbows`，用 0.72 这个真值）→ `legs = 4` → `err < 0.01`。
  - 46–50 s：`Odd stubby leg makes you wobbly`——腿数切成 3 或 5，桌子开始**真实晃动**（阻尼摆/单摆积分，晃动幅度 ∝ 1/腿数）。
  - 50–54.35 s：腿数回到 4，晃动归零，候选集只剩 1，桌子**稳稳站住**，桌面正中浮出那张"完美"的卡。
- **2D**：
  - 查询栏下方的**约束 chips** 一行一行出现并变成实心：`H = 0.72m` `LEGS = 4` `WOBBLE < 0.01`。
  - 右侧结果数**垂直大字**：`1,048,576 → 4,096 → 64 → 4 → 1`，每次下降都在拍点上并配一次卡片翻页声的视觉（不要闪）。
  - 左下：`WOBBLE ω = 2.41 rad/s  ζ = 0.06`（真实阻尼振荡参数）。
- **史实小字**：`1994 BM25 · 1998 PAGERANK`
- **禁则**：不要用 emoji 桌椅，一切用几何体。

---

### 05 · `EGGPLANT` — 54.350 – 68.060

**歌词**：`If you turn into an eggplant` / `You'll be my purple friend` / `Scratchy nail marks on your body` / `You're the only perfect eggplant for me`
**一句话**：**不精确，但刚好是我要的。**

- **3D**：
  - 中央一颗**茄子**（参数曲面，纺锤形，56×40 细分，有限差分法线），缓慢自转，紫色带高光。
  - 54.4–60 s：**颜色直方图**——把茄子表面的颜色真采样成 24 个 bin，画成一个立体的环状柱状图围在它周围。查询的直方图（一个标准茄子）在另一侧，两者用**真实的直方图交集**打分。
  - 60–64 s：`Scratchy nail marks on your body`——表面出现**划痕**：用真实的位移（沿法线的窄高斯槽），划痕随拍增加，每条划痕让"完美度"下降一点点，但最终分数仍然最高。
  - 64–68.06 s：五颗候选茄子排成一排（不同形状/颜色），它们头顶浮出分数；只有一颗最终被框起来。
- **2D**：
  - 右侧 `HISTOGRAM INTERSECTION`，两条真实直方图叠在一起（query / candidate），下面是 `0.941`。
  - 左下 `CANDIDATES 5 · TOP SCORE 0.941`，五行结果行（用 `Idx.resultRow`）。
  - `ctx.hits`：`5,120 → 1`。
- **史实小字**：`2003 TOPIC MODELS · LATENT SEMANTIC INDEXING`
- **禁则**：不要把它做成食谱或植物图鉴的可爱风，要保持**博物馆标本**的冷静。

---

### 06 · `I'M SEARCHING` — 68.060 – 82.680

**歌词**：`I'm searching`
**一句话**：**第一次说出这句话，结果是空的。**

- **3D**：**阅览室**。一张长桌、一排空椅子、头顶的日光灯（几何体，不用贴图）。桌上一叠结果卡，被一阵风吹散（真实的风场：每张卡受一个缓慢的涡旋位移场影响，带旋转落地）。
  - 74 s 起：镜头缓慢推近，桌上只剩一张卡，卡面上是 `NO MATCH`。
  - 全段保持**极安静**：没有闪烁，没有爆点。它是全片的**留白**。
- **2D**：
  - 查询栏里只有 `I'm searching`，光标慢慢闪。
  - 结果列表滚动：20 行，**全部灰**，最高分 `0.041`，每行右侧一条几乎空的分数条。
  - 中央一枚**印章**：`NO MATCH`（红色 `#ff4d5e`），在 `I'm searching` 那一句落下的拍点上盖下去（用旋转 + 缩放的砸落，不要全屏闪）。
  - `ctx.hits`：`0`。
- **史实小字**：`2004 MAPREDUCE`
- **禁则**：不要增加内容。这一段的"空"就是它的内容。段落里最多 3 个视觉元素。

---

### 07 · `CAT` — 82.680 – 96.470

**歌词**：`If you're a cat` / `A little kitten` / `You must be blue point` / `Meowing a lot` / `Hissing a lot` / `But you never purr`
**一句话**：**facet 筛选——每勾一个框，就少一批。**

- **3D**：一只**低多边形蓝重点色猫**坐在桌上（耳、脸、身体、尾；毛色用蓝灰 + 深色重点部位渐变）。
  - **左侧一列真实的 facet 复选列表**（用 2D 画在一张卡上）：`BREED: BLUE POINT` / `VOCAL: HIGH` / `HISSING: YES` / `PURRING: NO`。每拍勾上一项，画面里的猫群（初始 64 只，排成方阵）就按真实筛选条件少一批，直到只剩 1 只。
  - `But you never purr` 是**否定条件**：勾上时那一条被画一道斜杠划掉，同时右下角一条**purr 波形**从有变成一条直线，读数 `PURR 0.000 Hz`。
  - 结尾：只剩的一只猫抬起头，看向镜头。
- **2D**：
  - 右侧 facet 面板（勾选框真画）+ `64 → 32 → 12 → 3 → 1` 的计数。
  - 左下真实波形：`50 ms/div · 2 mV`，前 4/5 是猫的叫声（用 `ctx.bands` 驱动），最后一段是平的。
- **史实小字**：`2010 FACETED SEARCH · NEGATIVE CONSTRAINTS`
- **禁则**：不要可爱化（不要卡通眼睛、不要表情）。保持**标本/检索结果**的冷静。

---

### 08 · `STEAK` — 96.470 – 109.500

**歌词**：`If you're a steak` / `A fillet mignon covered in mushroom sauce` / `Browned on the outside` / `Medium-rare inside`
**一句话**：**用一张图去搜；煮熟的梯度是真算的。**

- **3D**：
  - 一块**菲力牛排**被横切开：剖面是一个 2D 温度场。用**真的一维热传导解**（`T(x,τ) = T∞ + (T0−T∞)·erf(x/(2√(ατ)))`，`erf` 用 Abramowitz-Stegun 近似实现），按真实温度着色：`52°C` 中心 → `65°C` 表面，外面焦褐、里面玫红。
  - `covered in mushroom sauce`：剖面之上撒一层**蘑菇片**——用真实的 Voronoi 站点 + 抖动生成，每片是一个小圆盘，落在表面并轻微下落。
  - 时间推进：`τ` 从 0 到 12 分钟，热锋向内推进，颜色实时改变。
- **2D**：
  - 查询栏上方浮出一枚**图像查询 chip**（32×32 的 patch 拼图，代表"这就是我要找的东西"），标 `QUERY BY IMAGE`。
  - 右侧**熟度标尺**：`RARE 52° · MEDIUM RARE 55° · MEDIUM 60° · WELL 71°`，指针在 55 附近。
  - 左下热传导参数：`α = 1.4e-7 m²/s · τ = 12.0 min · Bi = 3.2`。
  - `ctx.hits`：`48,201 → 12`。
- **史实小字**：`2012 DEEP VISION · IMAGENET`
- **禁则**：不要画血、不要写实肉类纹理（用色块和等温线）。

---

### 09 · `FLOWER` — 109.500 – 123.500

**歌词**：`If you turn into a flower` / `You must be the most delicate ever` / `Even if you bloom just occasionally` / `You're the only perfect flower for me`
**一句话**：**它很少开花，所以每一次开都算数。**

- **3D**：一朵**叶序（phyllotaxis）花**——用真实黄金角 `137.5077°` 排布的花蕊点阵（`WEM.Lab.phyllotaxis`），外圈花瓣。
  - 全段大部分时间它是**合着的**（花瓣收拢）。
  - 只有 4 次打开，落在歌词的 4 个关键拍上（`the most delicate ever` / `bloom just occasionally` / `you're the only perfect flower for me` 等）。每次打开 1.2 s，花瓣按真实角度外翻，花蕊点逐圈亮起。
  - 其余时间花在轻微呼吸（`barPulse`）。
- **2D**：
  - 结果列表 16 行，**只有 1 行是亮的**，其余 alpha 0.25。那一行的分数 `0.998`。
  - 右上 `BLOOM EVENTS 4 / 12.8 s`，一条只有 4 个尖峰的稀疏事件条。
  - `ctx.hits`：`3 → 1`。
- **史实小字**：`2013 WORD2VEC · WORDS BECOME DIRECTIONS`
- **禁则**：不要满屏开花。**克制**是这一段的一切。

---

### 10 · `HUMAN` — 123.500 – 137.220

**歌词**：`If you turn into a human` / `I'd like all the warmth coming from your hands` / `Bit of stinky breath, with hair that's unruly` / `You're the only perfect human for me`
**一句话**：**搜索第一次落到了人身上。**

- **3D**：**一双手**（低多边形：手掌 + 五指，有真实关节角度，缓慢开合）捧着一个微温的东西。
  - 掌心有**热分布**：用几个高斯叠加出的温度场，随心跳（`ctx.beat.pulse`）轻微脉动。
  - `hair that's unruly`：画面边缘几缕**真实积分的发丝**（每根用弹簧-阻尼解一条曲线，参数随机但确定），随气流轻轻飘。
  - 全段暖色，是全片最暖的一格。
- **2D**：
  - 查询栏的查询词逐字打出 `the warmth coming from your hands`。
  - 右侧：`THERMAL · PALM 34.2 °C · Δ 1.8 °C`，一个真实的热像小方块（16×16 由温度场采样）。
  - 左下：`BREATH 4.1 kPa CO₂`（一个真实量级的小读数），一段平缓的呼吸波形。
  - `ctx.hits`：`1`。**第一次命中 1。**
- **史实小字**：`2014 · 2015 · RETRIEVAL BECOMES PERSONAL`
- **禁则**：**不要画脸、不要画身体、不要画写实皮肤。**只有手、发丝和温度。

---

### 11 · `SEARCHING AGAIN` — 137.220 – 151.670

**歌词**：`I'm searching`
**一句话**：**检索变成了神经网络——不再比字面，比意思。**

- **3D**：**两塔模型**。左边是"查询塔"，右边是"文档塔"，各是一叠卡片穿过几层透明的平板（层）。
  - 卡片的向量由每张卡自己的 `WEM.Model` 嵌入给出（用 `WEM.Model.build` 训好的 12 维向量降成 3 维画出来）。
  - 每拍计算一次**真实的余弦相似度矩阵**（query × 20 documents），把矩阵画成一张 20×20 的方格纸（每个格子明暗 = 相似度）。
  - 最高分的那一格被红笔圈起来。
- **2D**：
  - 左：`QUERY TOWER`，向量条形图（12 维真值）。
  - 右：`DOC TOWER`，`20 × 768`。
  - 中下：`cos(q,d) = 0.812`，以及被圈出的文档标题。
  - `ctx.hits`：`20 → 3`。
- **史实小字**：`2016 NEURAL RETRIEVAL · DUALLY EMBEDDED`
- **禁则**：不要写"AI 神经网络"的通用插画（不要脑图、不要节点云）。要像**工程图纸**。

---

### 12 · `WHAT'S THAT WORD` — 151.670 – 165.530  ★全片灵魂

**歌词**：`If you're a piece / A piece of sheet / You must be… U-Um?` / `What, what's it called?` / `What's that word again?` / `"Do-o-o-o-ope"?` / `If you could stay / Stay there where you are / So I can… U-Um?` / `Oh, what, what's it called?` / `What's that word again?` / `"Lo-o-o-ove"?`
**一句话**：**舌尖现象——它知道那个词就在附近，但抓不住。**

- **3D**：**词空间**。
  - 一团真实的嵌入点云（用 `WEM.Model.build(ctx)`，12 维 → PCA 3 维），每个点是一个词，词是**这首歌自己的歌词词表**。
  - 一个"查询点"在空间里游荡，它每拍向最近的邻居移动一步（真实梯度：朝最近邻走）。
  - 每拍，最近的 5 个候选被线连到查询点，然后**被逐个划掉**（画一道删除线），因为分数不够。
  - 154–160 s：候选里出现 `DOPE`，分数 0.612，被划掉。
  - 160–165.4 s：**`LOVE`** 出现在候选里，分数一路爬到 0.994；点云里所有点向它靠拢一次；那个词被**红笔圈住**。
- **2D**：
  - 查询栏下方一个**真实的 typeahead 下拉**：5 行，每行 `候选词 / 分数 / 来源`，每拍刷新，被否掉的候选画删除线并淡出。
  - 打字段：`a piece of sheet ▸ U-Um?`，末尾光标乱闪（比正常快 2 倍）。
  - 每次否掉一个候选，右下角 `ATTEMPTS` +1。
  - `ctx.hits`：`20 → 5 → 2 → 1`，最后一行变成 `1` 并短暂显示 `← THE WORD`。
  - `LO-O-OVE` 出现时字号 150，**长音符用真实的横线画在字母之间**（用 `hud.measureText` 量出字宽再画横线）。
- **史实小字**：`2017 ATTENTION IS ALL YOU NEED`
- **禁则**：**这是全片最重要的一段，必须做得最好。** 不要让词云糊成一片；点云要有层次（近亮远淡），候选要清晰可读。不要用发光特效堆砌。

---

### 13 · `LOVE` — 165.530 – 179.600

**歌词**：`"Lo-o-o-ove"?`
**一句话**：**词找到了，现在看它周围有什么。**

- **3D**：
  - 镜头**推进**词空间，`LOVE` 这个点放大成整个画面。
  - 它的 **k 近邻**（真实的余弦前 12 名）排成一个环，与它连线，线的粗细 = 相似度。
  - 做**真实的向量运算**并画出平行四边形：`YOU − ME + TIME = ?`、`SEARCH − FIND + HOLD = ?`，结果点用红笔标出，旁边写真实算出的最近词。
  - 全段缓慢旋转，像一个**仪器**在展示。
- **2D**：
  - 左侧一张"词条卡"：`LOVE / lʌv / noun` + 五行定义（自己写，简短）。
  - 右侧邻居表：`12 NEIGHBOURS`，每行 `词 / cos`（真值）。
  - 底部：`analogy: YOU − ME + TIME → HOLD  0.847`。
  - `ctx.hits`：`1`，并显示 `EXACT MATCH`。
- **史实小字**：`2018 BERT · BIDIRECTIONAL CONTEXT`
- **禁则**：不要画心形、不要画情侣、不要用粉红浪漫滤镜。**要冷静得像一本字典。**

---

### 14 · `EVERYWHERE` — 179.600 – 193.300

**歌词**：`I'm searching for` / `Searching for you everywhere` / `I can see you in most everything` / `But somehow you can't stop transforming`
**一句话**：**到处都有你的影子，但你一直在变。**

- **3D**：
  - 一整面**卡片墙**（40×24 = 960 张，instanced quads），每张卡上是不同的东西（用简单图形 patch 表示：花、猫、桌子、手……）。
  - 一个查询向量扫过整面墙，被扫到的卡按**真实余弦**亮起——**到处都在亮**（`I can see you in most everything`）。
  - 然后 `you can't stop transforming`：**每拍，被点亮的卡的内容会变**（图形 patch 换成另一个），于是上一秒的匹配失效，分数集体掉下去，只能重新扫。这个循环做 8 次。
  - 镜头缓慢横移，让"一直在变"这件事有面积感。
- **2D**：
  - 顶部一行 8 个**影子缩略图**，每个旁边一个分数，随时间衰减。
  - 右：`MATCHES 486 / 960 · TOP 0.731 · Δ −0.212`（Δ 是这一拍掉了多少）。
  - `ctx.hits`：`960 → 486 → 312 → …`，每拍抖一次。
- **史实小字**：`2019 VECTOR DATABASE · ANN · FAISS`
- **禁则**：不要让它变成"万花筒"。卡片要有纸的质感与秩序感。

---

### 15 · `RAPID` — 193.300 – 203.150

**歌词**：`I'm searching for, searching for, searching for` ×6 / `A-Ah`
**一句话**：**改一次查询，整面卡墙就重排一次。**

- **3D**：上一段的卡片墙还在，但进入**高速重试**。
  - 每 1.7 s（4 拍）改写一次查询（6 次），每次改写让**全部 960 张卡同时飞起、重排、落下**，落点由新的相似度决定（高分的浮到前排，低分的沉到后排）。
  - 每次重排的落地都落在拍点上，落地的瞬间墙面轻微震动（`ctx.fx.shakeY` 小幅度）。
  - 最后一次 `A-Ah`（203.0 s）时全部卡片停住，画面短暂静止 0.4 s。
- **2D**：
  - 查询栏的查询词**每 1.7 s 换一次**（6 个不同措辞，自己写，都要是"我在找你"的变体）。
  - 右上 `REWRITES 06 · BEST 0.731`，一条锯齿状的分数曲线。
  - `ctx.hits` 每次改写都跳一次：`312 / 508 / 194 / 623 / 88 / 411`。
- **史实小字**：`2020 RAG · RETRIEVAL AUGMENTED GENERATION`
- **禁则**：**不要闪烁**。快是通过运动表达的，不是通过闪。全段最多用 1 次 `ctx.fx.hit(0.3)`。

---

### 16 · `MY OLD SELF` — 203.150 – 207.230

**歌词**：`My old self that's gone since you have left`
**一句话**：**丢的不是你，是我。**（全片最干净的一格）

- **3D**：**几乎没有 3D**。画面正中一张**旧卡片**（一张 quad），卡上是一张褪色的照片剪影（用简单图形拼：一个背影/一只手），右下角一个手写的目录号 `№ 0412`。
  - 卡片在 203.15–206 s 之间**慢慢褪色**（alpha 从 1 掉到 0.35，同时去色）。
  - 206.2 s：一枚**印章**从上方砸下，盖在卡片上：`WITHDRAWN`（红笔色），然后卡片轻轻一沉。
- **2D**：
  - 只有三样东西：上面那行歌词（居中，18 px，alpha 0.8）、左下 `CARD № 0412 · LAST SEEN 2021`、右下 `MATCH 0.000`。
  - 查询栏里的查询词是空的（`ctx.lyric.text` 就是那行歌词，正常显示）。
  - **`ctx.chromeAmt` 可以在最后 0.6 s 降到 0.75**，让画面更安静（不要降到 0）。
- **史实小字**：`2021 · WHAT WAS LOST`
- **禁则**：**绝对不要堆内容。** 这一段只有一张卡、一行字、一枚章。人像用剪影，不要画脸。

---

### 17 · `BUCKETS` — 207.230 – 221.030

**歌词**：`Each one of us has a bucket of love` / `Some of us empty, some of us filled up`
**一句话**：**一桶一桶的爱，有的空，有的满。**

- **3D**：一排**玻璃罐 / 铁桶**（圆柱体，12 个）摆在架子上，液面高度各不相同。
  - 液面数据来自**真实的直方图**：把本曲的 131 行歌词按"每行含 love/hug/warm 等词的数量"分桶（或者用 `ctx.data.rms(t)` 的分布），得到 12 个真实的计数，就是 12 个液面高度——**有的 0，有的溢出**。
  - 每拍，某一个桶的液面上升一点（按真实直方图值），满的会**溢出来**（溢出用落下的点表示，带重力）。
  - 镜头缓慢横移过整排桶。
- **2D**：
  - 上方一条**真实直方图**（12 个柱，与桶一一对应），柱高 = 桶内液面。
  - 右侧：`DISTRIBUTION · μ = 4.17 · σ = 3.02 · EMPTY 3/12`。
  - 左下：`EACH ONE OF US HAS A BUCKET`。
  - `ctx.hits`：`12`。
- **史实小字**：`2022 CHATGPT · EVERYBODY STARTS ASKING`
- **禁则**：不要把"爱"画成心形或粉色液体。就用**普通的液体**——干净、透明、有点暖色。

---

### 18 · `BREAK US DOWN` — 221.030 – 233.800

**歌词**：`Cut this into pieces, break us down to the cell` / `Merge us back up, we have evolved now`
**一句话**：**切碎、嵌入、再合起来——合起来的那个东西变了。**

- **3D**：
  - 221–226 s：**一句歌词被真的切碎**。拿 `"each one of us has a bucket of love"`，用真实的空白/标点切分成 token；每个 token 变成一张卡，飘起来，然后散进三维嵌入空间（用 `WEM.Model` 训好的向量）。
  - 226–230 s：`break us down to the cell` —— 每张卡进一步裂成几个"字素"小块（字符级），小块再各自嵌入。
  - 230–233.8 s：`Merge us back up` —— 所有向量**真的做平均池化**，得到一个合成的中心点；画一条从每个输入点到中心的线，中心点用红笔圈出。
  - 关键：**把中心点与每个输入 token 的余弦相似度显示出来**（都在 0.6–0.8 之间，但**不等于 1**），并显示 `MERGED ≠ ANY INPUT`。这就是 `we have evolved now`。
- **2D**：
  - 左侧 token 列表（真实切分结果），每个 token 一行，右侧是它的 12 维向量第一次主成分的小条形图。
  - 中间：`POOL` 的均值公式 `v̄ = (1/n) Σ vᵢ`。
  - 右侧浓度表：`cos(v̄, vᵢ)` 每个 token 一个值，最大的那个被标 `MOST SIMILAR 0.812`。
  - 大字（字号 44，sans 600）：`we have evolved now`。
  - `ctx.hits`：`12 → 1`。
- **史实小字**：`2023 EMBEDDINGS EVERYWHERE · TOKENIZATION · POOLING`
- **禁则**：不要把 token 画成积木或糖果。要像**实验室的标本切片**。

---

### 19 · `CALLBACK` — 233.800 – 261.210 （27 秒器乐）

**歌词**：（无）
**一句话**：**把整个档案柜吞进一个窗口——检索这件事，不再需要了。**

- **3D**：
  - 233.8–248 s：上一段的卡片墙还在，但正前方出现一个**狭长的窗口/槽口**（一个细长的矩形框）。整面卡墙开始被**吸入**：卡片排成一列，像纸带一样被卷进槽口。用真实的运动（每张卡的 x/y 向槽口插值，越靠后越慢）。
  - 墙越来越薄；同时背景里的**档案柜抽屉一个接一个自动关上**（`retrieval` 的装置在退场）。
  - 248–261.2 s：槽口合上，画面里只剩**一条长长的纸带**，上面密密的都是字的痕迹（用小方块表示 token），纸带从画面左到右缓慢流动。纸带末端延伸出画面之外——**长得看不到头**。
- **2D**：
  - 一个**上下文计量表**在右上角持续增长：`CONTEXT 2,048 → 128,000 → 1,050,000 TOKENS`，每拍跳一次，后半段跳动越来越快。
  - 下方 `TOKENS SWALLOWED` 一个真实累加的计数器。
  - 左侧一行小字，随段落推进依次点亮：
    `2024 · 128,000 TOKENS` → `2025 · REASONING MODELS` → `2026 · 1,050,000 TOKENS`
  - `ctx.hits`：显示 `1`，note 改成 `IN CONTEXT`（用 `Idx.queryBar` 自定义）。
- **史实小字**：`2024 LONG CONTEXT · 2026 GPT-6 ASTRA · 1,050,000 TOKEN CONTEXT`
- **禁则**：不要用"黑洞/漩涡"这类夸张比喻。要像**归档**：安静、有序、不可逆。

---

### 20 · `LEARNED` — 261.210 – 275.650

**歌词**：`If you turn into a flower… If you turn into a human… I like hug the warmth come from your hands` / `I'm searching`
**一句话**：**查询学会了自己改写自己。**

- **3D**：画面中央是**查询本身**的文字（3D 挤出或大号 2D 都行），它会**被自己改写**：
  - 261.2–266 s：第一次改写——`if you turn into a human` → 自动补上 `+ warmth + hands`；
  - 266–270 s：第二次——`+ unruly hair + stinky breath`（**不完美的细节正是匹配的关键**）；
  - 270–275.6 s：第三次——`= you`。
  - 每次改写时，旧文字**碎成字符**飞散，新文字从字符聚合成形（真实字符动画，不是淡入淡出）。
  - 旁边一条**分数曲线**随每次改写上升：`0.412 → 0.688 → 0.901 → 0.997`。
- **2D**：
  - 左侧一张"改写日志"卡，三行：`REWRITE 01 · +warmth +hands · 0.688`…（用真实分数）。
  - 右上 `ITERATIONS 3 · SCORE 0.997`。
  - 底部：`the query improves itself`。
  - `ctx.hits`：`1`。
- **史实小字**：`2025 REASONING MODELS · THE SEARCHER REWRITES THE QUERY`
- **禁则**：不要画机器人思考的插画。就是**文字在改写**。

---

### 21 · `DOG · TOMATO` — 275.650 – 287.330

**歌词**：`If you're a dog` / `A little puppy` / `Going ruff ruff ruff` / `If you're a fruit` / `A tomato` / `Full of juice`
**一句话**：**搜索重新变得简单，而且立刻成功。**

- **3D**：同一张桌子上，左边一只**低多边形小狗**，右边一颗**番茄**。
  - `ruff ruff ruff`：3 次真实的**瞬态**——每一次是一个短促的声波脉冲（画成同心圆扩散 + 小狗身体的一次弹跳，用真实阻尼振荡）。三次落在 `ruff ruff ruff` 的三个音节上。
  - `a tomato / full of juice`：番茄被**挤了一下**（真实形变：球体沿一个轴压扁，体积守恒 → 横向鼓起），然后**汁水喷出**——一批粒子受到真实重力 + 初速度，落地留痕。
  - `You're the only perfect X for me` 在这一段**立刻命中**：分数直接是 `1.000`，结果数直接是 `1`。全片第一次"毫不费力"。
- **2D**：
  - 两条结果行，都是 `1.000`，都带 `EXACT` 标记。
  - 左下：`TASTY 10/10`（一个玩笑式但用系统字体的评价条），`JUICINESS 0.94`。
  - `ctx.hits`：`1`。
  - 全段色调最暖最亮。
- **史实小字**：`2026 CLAUDE OPUS 5.5 · GPT-6 ASTRA · QWEN3.7-MAX · DEEPSEEK V4 · KIMI K2.6 · GLM-5.1 · MINIMAX M2.7`
- **禁则**：不要卡通表情、不要 emoji。**用几何把"可爱"做出来，而不是贴上去。**

---

### 22 · `STILL SEARCHING` — 287.330 – 295.347

**歌词**：（尾奏）
**一句话**：**还在搜。光标还在闪。**

- **3D**：
  - 回到 06 段的**阅览室**，但这次是空镜：长桌、一排空椅子、灯光。
  - 桌上留着**一张卡**，卡上是 `№ 0412`（呼应第 16 段）。
  - 镜头极缓慢地推近那张卡，最后停在它上面。
- **2D**：
  - 查询栏里查询词还在，光标还在闪（保持到最后一帧）。
  - 287.3–291 s：索引轨做**最后一次全亮**（`WEM.Idx.litCount(291)` = 26），旁边一行小字 `26 MILESTONES · 81 YEARS · ONE QUERY`。
  - 291–293.5 s：`ctx.chromeAmt` 从 1 降到 0（**但底部律动条会继续跑**，这是 chrome 之外的，别管）。
  - 293.5 s 起字幕居中逐行淡入：
    ```
    music   Mili — world.search (you) ;
    visuals computed in real time, in your browser
    every score, every neighbour: actually computed
    ```
    最后一行是一句查询：`still searching for you`，然后它慢慢淡掉，只剩空的查询栏。
  - 最后一帧：纸面 + 一个还在闪的光标。
- **禁则**：不要在结尾放作者署名/联系方式。不要黑场到底——**最后留下的应该是纸和那根光标**。

---

## 4. 必须真实的数字（**不要编**）

**检索史**

| 事实 | 值 |
|---|---|
| Vannevar Bush《As We May Think》 | 1945 年 7 月，The Atlantic；提出 memex |
| Shannon 信息论 | 1948，*A Mathematical Theory of Communication* |
| 倒排索引 | 1950s–60s 普及（KWIC 索引 1958–62） |
| TF-IDF | Karen Spärck Jones，1972 |
| BM25 | 1994（Okapi） |
| PageRank | 1998（Brin & Page） |
| 主题模型 LSI / LDA | 1990 / 2003 |
| MapReduce | 2004（Google） |
| Faceted search | 2000s 中后期普及 |
| word2vec | 2013（Mikolov 等） |
| Attention / Transformer | 2017，*Attention Is All You Need* |
| BERT | 2018 |
| CLIP | 2021 |
| RAG | 2020（Lewis 等） |
| 熟度温度 | Rare 52°C · Medium rare 55°C · Medium 60°C · Well done 71°C |
| 牛肉热扩散率 α | ≈ 1.3–1.4 × 10⁻⁷ m²/s |

**2026 年的模型（本片只在 19–21 段出现）**

| 事实 | 值 |
|---|---|
| GPT-6 Astra（2026-09-03） | 上下文 **1,050,000 tokens**，最大输出 128,000，知识截止 2026-04-30，$10/$50 per M，输入 text+image |
| GPT-6 Astra 基准 | Terminal-Bench 4.0 **57.9%**、DeepSWE v1.1 74.1%、OSWorld 2.0 **72.6%**、Terminal-Bench-Science 0.1 **64.6%** |
| Claude Opus 5.5（2026-09-22） | $4 / $20 per M，cache read $0.20；比 Opus 5 便宜 40% |
| Claude Opus 5.5 基准 | Terminal-Bench 4.0 **66.4%**、OSWorld 2.1 **81.8%**、Humanity's Last Exam **67.7%**（带工具） |
| Claude Opus 5.5 实测 | 680,000 行代码迁移，不到一天 |
| 国产五雄（2026） | Qwen3.7-Max（阿里）· DeepSeek V4 · Kimi K2.6 · GLM-5.1 · MiniMax M2.7 |
| 长上下文里程碑 | 2024 前后主流 128,000 tokens；2026 达到 1,050,000 |

来源：Anthropic Claude Opus 5.5 发布页、OpenAI GPT-6 Astra 模型页与开发者文档、阿里云百炼 Qwen3.7-Max 文档、2026 国产开源大模型综述。
**不确定的数字，就用上表里的；再不确定，就别写。**

---

## 5. 代码规范

### 5.1 文件与命名

```
src/sections/a_01_06.js   段 01–06
src/sections/b_07_12.js   段 07–12
src/sections/c_13_17.js   段 13–17
src/sections/d_18_22.js   段 18–22
```

每个文件一个 IIFE，末尾若干 `WEM.defineSection({...})`。**顺序必须是升序的**——
`App` 用 `WEM.sections[i]` 与 `meta.json` 的第 i 段**按位置对应**，顺序错了整片错位。

### 5.2 段落对象

```js
WEM.defineSection({
  id: "07",
  name: "CAT",
  init:  function (ctx) { /* 只在第一次进入时调用一次：建几何、跑训练 */ },
  enter: function (ctx) { /* 每次进入都调用（拖动进度条后也会） */ },
  exit:  function (ctx) { },
  draw2d: function (ctx) { /* 设相机 + 画 HUD */ },
  draw3d: function (ctx) { /* 画几何 */ }
});
```

### 5.3 绝对禁止

1. 改 `meta.json` 的边界；改引擎（`00`–`62`、`28_index`）；改别人的段文件。
2. 在 `y > H-150` 画东西；自己画查询栏或索引轨。
3. 段首再叠一次全屏闪（引擎已经闪了）。
4. `Math.random()` / `new Date()` / `Date.now()`。
5. emoji、颜文字、网络流行语、真人姓名、政治宗教符号。
6. `console.log` 留在文件里。
7. 段首 0.5 s 画面是空的。
8. **在 `draw3d` 里改相机**——`cam.update()` 在 `draw2d` 和 `draw3d` 之间跑，改在 `draw3d` 会晚一帧。
9. 加性发光（`gfx.points` / `gfx.lines` 的 `add:true`）时**忘了 `depthWrite:false`**：粒子会写深度，把它背后的东西整片剔除，出现硬边黑洞。

### 5.4 必须做到

1. 每个视觉元素都由真实数据驱动：`ctx.bands` / `ctx.rms` / `ctx.flux` / `ctx.beat` / `ctx.lyric` / `ctx.local`。
2. 用自己时代的墨色，但版面与 chrome 与全片一致。
3. 每段至少有一处**只有算出来才好看的东西**（真排序、真倒排索引、真直方图交集、真热传导、真余弦、真池化）。
4. 段内文字必须是**正确的英文**（歌词引用除外），机器标签用全大写。
5. 每段在 `draw2d` 里设 `ctx.hits`，让查询栏有读数。
