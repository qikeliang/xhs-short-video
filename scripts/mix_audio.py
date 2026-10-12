#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
mix_audio.py —— 把逐句 mp3 拼成一条完整音轨（按时延排布 + 响度归一）

用法:
  /usr/bin/python3 mix_audio.py <音频目录> <输出wav> [停顿秒] [句数]

输出: 24kHz 单声道 wav，音量归一到 mean ≈ -18dB
依赖: ffmpeg
"""
import os, subprocess, sys, time


def log(m):
    print(f"[{time.strftime('%H:%M:%S')}] {m}", flush=True)


def run(cmd, timeout=60):
    r = subprocess.run(cmd, capture_output=True, timeout=timeout)
    if r.returncode != 0:
        raise RuntimeError(r.stderr.decode()[-300:])
    return r


def main():
    if len(sys.argv) < 3:
        print(__doc__)
        return 1
    indir = sys.argv[1]
    outwav = sys.argv[2]
    gap = float(sys.argv[3]) if len(sys.argv) > 3 else 0.20
    n = int(sys.argv[4]) if len(sys.argv) > 4 else 4

    tmpdir = os.path.join(indir, "_norm")
    os.makedirs(tmpdir, exist_ok=True)

    # 1) 逐句归一化到 24k 单声道
    norms, durs = [], []
    for i in range(n):
        src = os.path.join(indir, f"s{i}.mp3")
        dst = os.path.join(tmpdir, f"n{i}.wav")
        if not os.path.exists(src):
            log(f"  !! 缺失 {src}，跳过")
            continue
        try:
            run(["ffmpeg", "-hide_banner", "-y", "-i", src,
                 "-af", "loudnorm=I=-16:TP=-1.5:LRA=9",
                 "-ac", "1", "-ar", "24000", dst])
            d = float(subprocess.check_output(
                ["ffprobe", "-v", "error", "-show_entries",
                 "format=duration", "-of", "csv=p=0", dst]).decode().strip())
            norms.append(dst)
            durs.append(d)
            log(f"  [{i}] 归一化 {d:.3f}s")
        except Exception as e:
            log(f"  [{i}] 失败: {str(e)[:80]}")

    if not norms:
        log("!! 无有效音频")
        return 2

    # 2) 计算每句延迟（毫秒）
    delays, acc = [], 0.0
    for d in durs:
        delays.append(int(acc * 1000))
        acc += d + gap

    log(f"延迟序列(ms): {delays}  总时长 {acc:.2f}s")

    # 3) adelay + amix 合成
    inputs = []
    for p in norms:
        inputs += ["-i", p]
    filters = []
    labels = []
    for i, (p, dl) in enumerate(zip(norms, delays)):
        filters.append(f"[{i}:a]adelay={dl}|{dl}[a{i}]")
        labels.append(f"[a{i}]")
    filt = ";".join(filters)
    filt += f";{''.join(labels)}amix=inputs={len(norms)}:normalize=0[out]"

    try:
        run(["ffmpeg", "-hide_banner", "-y"] + inputs +
            ["-filter_complex", filt, "-map", "[out]",
             "-ac", "1", "-ar", "24000", outwav], timeout=120)
    except Exception as e:
        log(f"!! 合成失败: {str(e)[:200]}")
        return 2

    size = os.path.getsize(outwav)
    log(f"✓ 已输出 {outwav}  ({size/1024:.0f} KB)")

    # 4) 音量自检
    try:
        r = subprocess.run(["ffmpeg", "-hide_banner", "-i", outwav,
                            "-af", "volumedetect", "-f", "null", "/dev/null"],
                           capture_output=True, timeout=60)
        for line in r.stderr.decode().splitlines():
            if "mean_volume" in line or "max_volume" in line:
                print("   " + line.split("]")[-1].strip())
    except Exception:
        pass
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except Exception as e:
        log(f"致命: {e}")
        sys.exit(2)
