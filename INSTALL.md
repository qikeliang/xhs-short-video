# xhs-short-video Skill 部署说明（工作电脑）

## 一、放到工作电脑（3 步）

1. 下载 `xhs-short-video-skill.zip`
2. 解压，把整个 `xhs-short-video` 文件夹放到 CodeBuddy 的 skills 目录：

| 系统 | 路径 |
|---|---|
| macOS / Linux | `~/.codebuddy/skills/` |
| Windows | `C:\Users\<你的用户名>\.codebuddy\skills\` |

3. 确认最终结构（**层级不能错**，SKILL.md 必须在这层）：

```
~/.codebuddy/skills/xhs-short-video/
├── SKILL.md              ← CodeBuddy 靠它识别这个 Skill
├── INSTALL.md            ← 本文件
├── scripts/
│   ├── tts_fast.py       配音（edge-tts）
│   ├── calc_frames.py    量时长 → 算帧号（同步核心）
│   └── mix_audio.py      逐句拼接 + 响度归一
└── assets/
    └── ReplicaTemplate.tsx   已验证组件（9 个真实品牌 SVG 图标）
```

## 二、安装前置依赖（每台机器只需一次）

Skill 的脚本依赖下面 3 个，**缺一个就跑不动**：

| 依赖 | 作用 | 安装命令 |
|---|---|---|
| **ffmpeg + ffprobe** | 量音频时长、拼接音轨 | mac: `brew install ffmpeg`<br>win: 下载 [gyan.dev](https://www.gyan.dev/ffmpeg/builds/) 的 essentials 版，解压后把 `bin` 加进 PATH |
| **edge-tts** | 配音合成（免费、无需 key） | `pip install edge-tts`<br>（若报 PEP 668 用 `pip install --break-system-packages edge-tts`）|
| **Node.js 18+** | 跑 Remotion 渲染 | [nodejs.org](https://nodejs.org) 装 LTS |

## 三、初始化 Remotion 项目（渲染用，只需一次）

渲染需要一个 Remotion 项目，在你自己的工作目录执行一次：

```bash
npx create-video@latest remotion-videos
cd remotion-videos
npm i remotion@4.0.534      # 锁版本，与本机 Chromium 匹配
```

然后把模板组件搬进去并注册：

```bash
cp ~/.codebuddy/skills/xhs-short-video/assets/ReplicaTemplate.tsx \
   remotion-videos/src/compositions/ReplicaTemplate.tsx
```

在 `src/Root.tsx` 里注册（照抄模板底部那段 `<Composition ... />`），
再把配音文件放进 `public/`，改名与模板里 `audioFile` 一致（默认 `clone_voiceover.wav`）。

渲染命令：

```bash
cd remotion-videos
npx remotion render src/index.ts <CompositionId> output/out.mp4 --concurrency=2
```

> `--concurrency=2` 别开高，开高了会卡死（踩过）。

## 四、验证（3 条全过即可开工）

```bash
# 1. 配音脚本能跑（/tmp/t 下应生成 s0.mp3）
python3 ~/.codebuddy/skills/xhs-short-video/scripts/tts_fast.py "测试一句话" /tmp/t "+10%"

# 2. edge-tts 有中文音色
python3 -m edge_tts --list-voices | grep zh-CN

# 3. ffmpeg 可用
ffprobe -version
```

三条都通过 → 直接对 CodeBuddy 说「做个短视频」，它会自己走这套流程。

## 五、踩过的坑（换机器容易复现）

| 现象 | 原因 / 解决 |
|---|---|
| `python3 -m edge_tts` 找不到 | edge-tts 装到了别的 python。**用哪个 python 装的，就用哪个跑**（本机是 `/usr/bin/python3`，不是 pyenv 那个）|
| 配音句失败 "No audio was received" | 中英混排（如 `Codex 对...`）。脚本已内置三级降级：去空格 → 音译 → 降语速 |
| 渲染出来声画不同步 | 帧号是**凭感觉填**的。必须先 `ffprobe` 量真实时长再换算（`calc_frames.py` 就是干这个的）|
| 预览面板看不到 mp4 | 中文文件名在某些环境渲染异常。**交付时加一份纯英文副本** |
| 视频被限流 | 见 SKILL.md 的「合规红线」：禁用排名/领先/横评/国产对比等词 |

## 六、同步更新

Skill 改了之后，重新打包 zip 覆盖工作电脑的同名目录即可（备份你本地改过的文件）。
