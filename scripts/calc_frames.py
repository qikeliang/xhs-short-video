#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
calc_frames.py —— 量音频时长并换算成 Remotion 帧号（声画同步的核心）

用法:
  /usr/bin/python3 calc_frames.py <音频目录> [句数] [停顿秒] [fps]

输出可直接粘贴进组件的 SEGMENTS / totalFrames。
"""
import os, subprocess, sys


def duration(path):
    """用 ffprobe 量精确时长"""
    try:
        out = subprocess.check_output(
            ["ffprobe", "-v", "error", "-show_entries",
             "format=duration", "-of", "csv=p=0", path],
            timeout=20,
        )
        return float(out.decode().strip())
    except Exception as e:
        print(f"  !! 无法读取 {path}: {e}", flush=True)
        return 0.0


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        return 1
    indir = sys.argv[1]
    n = int(sys.argv[2]) if len(sys.argv) > 2 else 4
    gap = float(sys.argv[3]) if len(sys.argv) > 3 else 0.20
    fps = int(sys.argv[4]) if len(sys.argv) > 4 else 30

    durs = []
    for i in range(n):
        p = os.path.join(indir, f"s{i}.mp3")
        if os.path.exists(p):
            durs.append(duration(p))
        else:
            print(f"  !! 缺失 {p}，按 0 处理", flush=True)
            durs.append(0.0)

    print("\n=== 各句时长 ===")
    for i, d in enumerate(durs):
        print(f"  s{i} = {d:.3f}s")

    starts, t = [], 0.0
    for d in durs:
        starts.append(t)
        t += d + gap

    print(f"\n=== 总时长 {t:.3f}s  ({int(t*fps)} 帧) ===\n")
    print("// 直接粘贴到组件：")
    print("const SEGMENTS = [")
    scenes = ["intro", "foreign", "domestic", "codex"]
    for i, s in enumerate(starts):
        frm = round(s * fps)
        to = round((s + durs[i]) * fps)
        sc = scenes[i] if i < len(scenes) else "scene"
        print(f'  {{ from: {frm}, to: {to}, text: "第{i+1}句字幕", scene: "{sc}" }},'
              f'  // {s:.2f}-{s+durs[i]:.2f}s')
    print("];\n")
    total = round(t * fps)
    print(f"const TOTAL_FRAMES = {total};  // {t:.2f}s")

    # 第一段 from 补 0 对齐（避免浮点误差）
    print(f"\n// 提示：第一段建议 from:0，末段建议 to:{total}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
