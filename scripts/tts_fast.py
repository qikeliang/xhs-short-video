#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
tts_fast.py —— 极速配音生成（edge-tts，含多级降级重试）

用法:
  /usr/bin/python3 tts_fast.py "句1|句2|句3" <输出目录> [语速] [音色]

参数:
  语速  默认 "+18%"（快节奏）；"0%" 标准；"-8%" 沉稳
  音色  默认 zh-CN-YunxiNeural（年轻自然）
        备选: zh-CN-YunyangNeural 沉稳新闻感 / zh-CN-XiaoxiaoNeural 女声温暖

特性:
  - 逐句生成 + 心跳打印
  - 自动验证文件>2KB（过滤空文件）
  - 中英混排失败自动三级降级：去空格 -> 音译 -> 降语速
  - 单句 try/except 兜底，失败不阻断整条流水线
"""
import asyncio, os, sys, time

DEFAULT_VOICE = "zh-CN-YunxiNeural"
# 常见品牌/技术词的中文音译兜底
TRANSLIT = {
    "codex": "科德克斯", "cursor": "柯色", "claude": "克劳德",
    "vscode": "VS 扣的", "windsurf": "温德瑟夫", "github": "给特哈布",
}


def log(m):
    print(f"[{time.strftime('%H:%M:%S')}] {m}", flush=True)


def build_alts(sent, rate):
    """为一个句子生成多级降级候选"""
    alts = [(rate, sent), (rate, sent.replace(" ", "")), (rate, sent.replace("  ", " "))]
    # 音译兜底：把识别到的英文词换成中文
    lowered = sent.lower()
    replaced = sent
    for en, zh in TRANSLIT.items():
        if en in lowered:
            import re
            replaced = re.sub(en, zh, replaced, flags=re.IGNORECASE)
    if replaced != sent:
        alts.append((rate, replaced))
    # 最后放慢语速再试一次（慢一点往往更容易合成）
    alts.append(("-5%", sent.replace(" ", "")))
    return alts


async def synth_one(i, sent, outdir, rate, voice):
    import edge_tts
    path = os.path.join(outdir, f"s{i}.mp3")
    for level, (r, txt) in enumerate(build_alts(sent, rate)):
        try:
            await asyncio.wait_for(
                edge_tts.Communicate(txt, voice, rate=r).save(path),
                timeout=25,
            )
            size = os.path.getsize(path) if os.path.exists(path) else 0
            if size > 2000:
                log(f"  [{i}] OK {size}B  (rate={r}, level={level}) -> {txt[:24]}")
                return path
            log(f"  [{i}] 文件过小({size}B) level={level}，降级重试")
        except asyncio.TimeoutError:
            log(f"  [{i}] 超时 level={level}，跳过")
        except Exception as e:
            log(f"  [{i}] 失败 level={level}: {str(e)[:60]}")
    log(f"  [{i}] !! 全部候选失败: {sent[:20]}")
    return None


async def main():
    if len(sys.argv) < 3:
        print(__doc__)
        sys.exit(1)
    sents = [s.strip() for s in sys.argv[1].split("|") if s.strip()]
    outdir = sys.argv[2]
    rate = sys.argv[3] if len(sys.argv) > 3 else "+18%"
    voice = sys.argv[4] if len(sys.argv) > 4 else DEFAULT_VOICE

    os.makedirs(outdir, exist_ok=True)
    log(f"共 {len(sents)} 句 | 语速 {rate} | 音色 {voice}")

    tasks = [synth_one(i, s, outdir, rate, voice) for i, s in enumerate(sents)]
    results = await asyncio.gather(*tasks, return_exceptions=True)

    ok = [r for r in results if isinstance(r, str)]
    log(f"完成 {len(ok)}/{len(sents)} 句 -> {outdir}")
    for r in ok:
        print(f"RESULT {r}", flush=True)
    return 0 if len(ok) == len(sents) else 1


if __name__ == "__main__":
    try:
        sys.exit(asyncio.run(main()))
    except Exception as e:
        log(f"致命: {e}")
        sys.exit(2)
