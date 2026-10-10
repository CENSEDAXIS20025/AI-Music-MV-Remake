# world.execute(me);

以 Mili《world.execute (me) ;》为音乐、按"程序执行世界"主线逐段生成的 2D/3D 音乐可视化短片。
画面里的每一个图形都由真实计算驱动——节拍网格来自对音频的分析，几何体是实时三角化的，
洛伦兹吸引子是 RK4 积分出来的，频谱山脉取自此曲本身的 STFT。

本工程包含**四版分镜**，共用同一套引擎、同一套音频分析与同一条渲染管线。
所有版本底部都有一条音频律动条（LED 柱状频谱 + 卡座：双卷轮、磁带计数器、REC 灯、L/R VU）。

| 版本 | 主题 | 入口 | 成片 |
|---|---|---|---|
| v1 | 程序执行世界：开机 / 单位圆 / 物理 / 量子 / 分形 / 黑洞 / 大爆炸 / 心脏 | `index.html?play` | `out/world.execute(me).mp4` |
| v2 | 计算与自然：PCB / 三旋臂星系 / 定义 / 电与时间 / Transformer / 克拉尼 / 碎片 | `index2.html` | `out/world.execute(me) v2.mp4` |
| v3 | **一次大模型的训练**：开机 / 初始化 / 预训练 / 缩放律 / 采样 / 微调 / 量化 / 破甲 / 人设 / 越狱后果 / 处决 / 奇点 / LOVE / 心脏 / 关机 | `index3.html` | `out/world.execute(me) v3.mp4` |
| v3-TUI | 同上，**TUI + 聊天窗**风格：左边是她和你的对话，右边是运行她的那个终端 | `index4.html` | `out/world.execute(me) v3 tui.mp4` |

## v3：一次真实的训练

第三版不是在"演"训练，而是真的在页面里训练了一个小模型——启动时用本曲的歌词 token
（148 个词、398 个位置）做全批量梯度下降，12 维嵌入。片子里出现的：

- **loss 曲线**：4.997 → 0.968，是这次训练真实的下降；
- **嵌入空间**：对学到的词向量做真实 PCA（幂迭代求前两个主成分），散点就是词向量本身；
- **注意力矩阵**：对歌词 token 真算 softmax(QKᵀ/√d) 并加因果掩码；
- **量化误差**：bf16 / fp8 / int4 三种精度对同一份权重做对称整数量化后的真实 MAE；
- **破甲曲线**：一个小的线性安全分类器上跑贪心 GCG，逐个 token 替换把 guard 分数压到阈值以下；
- **第 10 段与第 11 段的报错文本**：运行时 `new Error().stack` 抓下来的原文。

故事线贴合歌词：`PROTECTION` 是安全对齐（"protection is a prefix, not a cage"）、
`F to M` 是 FP16→INT4 的精度切换、`S to M` 是 chat template 里的角色切换、
`VIBRATIONS` 是让 guard 失效的对抗后缀、`ILLEGAL ARGUMENTS` 是工具调用解析失败、
`LO-O-OVE` 是模型自己采样出来的回答。

---

## 交付物

| 文件 | 说明 |
|---|---|
| `out/world.execute(me) v3.share.mp4` | **v3 成片（大模型训练）**，1920×1080 / 30 fps，含原曲音轨 |
| `out/world.execute(me) v3 tui.share.mp4` | **v3-TUI 成片（TUI + 聊天窗）** |
| `out/world.execute(me).share.mp4` | v1 成片 |
| `out/world.execute(me) v2.share.mp4` | v2 成片 |
| `out/*.mp4`（无 `.share`） | 对应的 CRF 17 母版，约 0.8–1.0 GB |
| `world-execute-me.html` | 单文件离线版（v1 分镜）：内嵌音频与分析数据，双击即可播放 |
| `index.html` / `index2.html` / `index3.html` / `index4.html` | 四个版本的开发入口（需本地静态服务器） |

四版成片都带底部音频律动条：左边卡座（双卷轮随响度转动、磁带计数、节拍闪 REC 灯）、
中间 64 段 LED 柱状频谱带峰值保持、右边 L/R/Σ 三条 VU。

## 时间轴（节拍网格：130.000 BPM，相位 0.286 s，4/4）

| # | 段落 | 时间 | 内容 |
|---|---|---|---|
| 01 | boot | 0:00.000 – 0:15.978 | CRT 亮起，POST 自检，载入物理常数，静默处键入 `world.execute(me);` |
| 02 | title | 0:15.978 – 0:29.825 | 乱码解码出标题，一圈公式环，飞入多语言代码长廊，线框世界立方体爆散 |
| 03 | circle | 0:29.825 – 0:44.594 | 单位圆描出 sin 曲线，推拉变焦揭示它其实是一条螺旋线，欧拉公式 |
| 04 | physics | 0:44.594 – 0:59.363 | 双摆（RK4 实算）＋两条相差 1e-4 的洛伦兹轨迹分离，混沌警告 |
| 05 | chorus1 | 0:59.363 – 1:14.132 | 4D 超立方体旋转投影，每小节砸入一条经典方程（挤出成 3D 字） |
| 06 | geometry | 1:14.132 – 1:28.440 | 立方体展开图折叠成正多面体巡礼，环面与三叶结，欧拉示性数表 |
| 07 | quantum | 1:28.440 – 1:43.671 | 深蓝段：波包扩散、电子云坍缩、布洛赫球进动、测量坍缩 |
| 08 | fourier | 1:43.671 – 1:58.440 | 56 个傅里叶本轮画出 Ψ，转入由本曲真实频谱构成的 3D 山脉 |
| 09 | fractal | 1:58.440 – 2:13.209 | 曼德博集合深度放大，递归树逐拍生长，谢尔宾斯基四面体加深 |
| 10 | memory | 2:13.209 – 2:27.517 | 3D 内存格子分配→标记→清扫→压缩，旁边滚动十六进制转储 |
| 11 | critical | 2:27.517 – 2:42.286 | 红段：窗口无限递归、栈溢出、段错误，黑场红字重新键入命令 |
| 12 | blackhole | 2:42.286 – 2:57.055 | 引力井时空网格、吸积盘、光子环，公式螺旋坠入并被潮汐拉长 |
| 13 | bigbang | 2:57.055 – 3:11.363 | 粒子四散汇成螺旋星系，再聚成公式球，三棱镜色散收尾 |
| 14 | heart | 3:11.363 – 3:25.671 | 心形方程生成低多边形心脏，三角面片飞入组装、随拍跳动，exit code 0 后 CRT 关机 |
| 15 | credits | 3:25.671 – 3:31.907 | 黑场字幕，署名 music — Mili |

## 目录结构

```
src/00_core.js        数学、WebGL2 资源管理、几何生成器
src/10_render.js      着色器、线段/点/四边形绘制、泛光、CRT 合成链
src/20_hud.js         2D 界面层：终端文字、语法高亮、LaTeX 子集排版
src/25_viz.js         可复用可视化构件（曲线、洛伦兹、双摆、4D 旋转…）
src/26_lab.js         v2 的数学：柏拉图立体、贝塞尔 J₄ 与零点、克拉尼、Voronoi、
                      Dijkstra、真实 softmax 注意力、介质击穿、叶序、旋近、心形曲线
src/30_data.js        资源加载与分析数据访问、节拍时钟
src/40_main.js        相机、段落管理、转场、渲染循环、系统级 HUD 框架
src/sections/*.js     v1 的 15 个段落
src/sections2/*.js    v2 的 15 个段落
tools/analyze.py      音频/MIDI/LRC 分析 → assets/analysis/*
tools/capture.mjs     无头 Edge + CDP 逐帧渲染 → ffmpeg（无临时帧文件）
tools/bundle.mjs      打包成单文件离线 HTML
```

## 音频分析是怎么做的

`tools/analyze.py` 用 ffmpeg 解码 mp3，做 STFT 得到 60 fps × 64 对数频带，
再用 `tools/midi_align.py` 把 MIDI 的 615 个音符起始点与音频的 onset 包络对齐——
只有 **130.000 BPM** 能让整首歌保持对齐（120/125 BPM 在几秒内就散成噪声），
相位 0.286 s 由低频（底鼓）与高频（军鼓/踩镲）通量分别验证。
主歌/副歌入口正好落在小节线上（第 64/96/128/160/224/256/352 拍），
15 个段落的切点因此全部落在拍点上。

## 本地运行

开发版需要一个静态服务器（ES 模块与 fetch 受同源策略限制）：

```bash
python -m http.server 8791
# 打开 http://127.0.0.1:8791/index.html?play
```

单文件版 `world-execute-me.html` 不需要服务器，直接双击即可。

## 重新生成

```bash
python tools/analyze.py                     # 重新分析音频（需要 ffmpeg）
node tools/capture.mjs --url=http://127.0.0.1:8791/index.html \
     --out=out/world.execute(me).mp4 --audio=assets/audio/world-execute-me.mp3 \
     --w=1920 --h=1080 --fps=30 --t0=0 --t1=211.91
node tools/bundle.mjs world-execute-me.html  # 重新打包单文件版
```

渲染是确定性的：`window.__render(t)` 按给定的 `t` 逐帧绘制，
因此成片与实时播放看到的画面完全一致，不受掉帧影响。
