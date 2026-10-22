"""Render del tutorial MINERVA cuadro por cuadro (Chromium en paralelo) + audio.

Uso: python3 render.py [--vertical] [--workers 4]
Salida: renders/guia-horizontal.mp4 o renders/guia-vertical.mp4 (+ .srt)
"""
import argparse
import json
import multiprocessing as mp
import subprocess
import sys
import time
from pathlib import Path

ROOT = Path(__file__).parent
sys.path.insert(0, str(ROOT))


def render_chunk(args):
    idx, f0, f1, fps, port, vertical = args
    from playwright.sync_api import sync_playwright
    from preview import CHROME, page_url, viewport
    pre = "v" if vertical else "h"
    out = ROOT / "build" / f"chunks_{pre}" / f"c{idx:02d}.mp4"
    ff = subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-f", "image2pipe", "-framerate", str(fps), "-c:v", "mjpeg", "-i", "-",
                           "-c:v", "libx264", "-preset", "medium", "-crf", "18", "-pix_fmt", "yuv420p", "-r", str(fps), str(out)],
                          stdin=subprocess.PIPE)
    with sync_playwright() as p:
        b = p.chromium.launch(executable_path=CHROME)
        pg = b.new_page(viewport=viewport(vertical))
        pg.goto(page_url(port, vertical))
        pg.evaluate("window.ready")
        t0 = time.time()
        for f in range(f0, f1):
            pg.evaluate(f"window.seek({f / fps})")
            ff.stdin.write(pg.screenshot(type="jpeg", quality=93))
            if (f - f0) % 300 == 0:
                print(f"[{idx}] {f - f0}/{f1 - f0} ({time.time() - t0:.0f}s)", flush=True)
        b.close()
    ff.stdin.close()
    ff.wait()
    return str(out)


def srt_time(s):
    ms = int(round(s * 1000))
    return f"{ms // 3600000:02d}:{ms // 60000 % 60:02d}:{ms // 1000 % 60:02d},{ms % 1000:03d}"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--vertical", action="store_true")
    ap.add_argument("--workers", type=int, default=4)
    a = ap.parse_args()
    from preview import serve
    pre = "v" if a.vertical else "h"
    tl = json.loads((ROOT / "build" / f"timeline_{pre}.json").read_text())
    fps = tl["fps"]
    total = int(round(tl["duration"] * fps))
    srv = serve()
    (ROOT / "build" / f"chunks_{pre}").mkdir(parents=True, exist_ok=True)
    n = a.workers * 3
    step = (total + n - 1) // n
    jobs = [(i, i * step, min(total, (i + 1) * step), fps, srv.server_port, a.vertical) for i in range(n) if i * step < total]
    t0 = time.time()
    with mp.get_context("spawn").Pool(a.workers) as pool:
        parts = pool.map(render_chunk, jobs, chunksize=1)
    lst = ROOT / "build" / f"chunks_{pre}" / "list.txt"
    lst.write_text("".join(f"file '{Path(x).name}'\n" for x in parts))
    video = ROOT / "build" / f"video_noaudio_{pre}.mp4"
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", str(lst), "-c", "copy", str(video)], check=True)
    print(f"video sin audio en {time.time() - t0:.0f}s")
    out_dir = ROOT / "renders"
    out_dir.mkdir(exist_ok=True)
    final = out_dir / ("guia-vertical.mp4" if a.vertical else "guia-horizontal.mp4")
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(video), "-i", str(ROOT / "build" / f"mix_{pre}.wav"), "-c:v", "copy",
                    "-af", "loudnorm=I=-16:TP=-1.5:LRA=11", "-ar", "48000", "-c:a", "aac", "-b:a", "192k", "-shortest",
                    "-movflags", "+faststart", str(final)], check=True)
    lines = []
    for i, c in enumerate(tl["cues"], 1):
        lines += [str(i), f"{srt_time(c['start'])} --> {srt_time(c['end'])}", c["text"], ""]
    final.with_suffix(".srt").write_text("\n".join(lines), encoding="utf-8")
    print("final:", final)


if __name__ == "__main__":
    main()
