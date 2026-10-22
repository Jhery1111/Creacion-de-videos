"""Renderiza el video cuadro por cuadro con Chromium (varios procesos en paralelo).

Uso: python3 render.py [--workers 4] [--from S --to S]
Salida: build/video_noaudio.mp4 y, con el audio de build/mix.wav,
        output/tutorial_sistemas_institucionales.mp4 + .srt
"""
import argparse
import json
import multiprocessing as mp
import subprocess
import sys
import time
from pathlib import Path

ROOT = Path(__file__).parent
CHROME = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome"


def render_chunk(args):
    idx, f0, f1, fps, port = args
    from playwright.sync_api import sync_playwright
    out = ROOT / "build" / "chunks" / f"c{idx:02d}.mp4"
    ff = subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-f", "image2pipe", "-framerate", str(fps), "-c:v", "mjpeg", "-i", "-",
                           "-c:v", "libx264", "-preset", "medium", "-crf", "18", "-pix_fmt", "yuv420p", "-r", str(fps), str(out)],
                          stdin=subprocess.PIPE)
    with sync_playwright() as p:
        b = p.chromium.launch(executable_path=CHROME)
        pg = b.new_page(viewport={"width": 1920, "height": 1080})
        pg.goto(f"http://127.0.0.1:{port}/index.html")
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


def write_srt(tl, path):
    lines = []
    for i, c in enumerate(tl["cues"], 1):
        lines += [str(i), f"{srt_time(c['start'])} --> {srt_time(c['end'])}", c["text"], ""]
    path.write_text("\n".join(lines), encoding="utf-8")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--workers", type=int, default=4)
    ap.add_argument("--from", dest="t_from", type=float, default=0)
    ap.add_argument("--to", dest="t_to", type=float, default=None)
    a = ap.parse_args()

    sys.path.insert(0, str(ROOT))
    from preview import serve
    tl = json.loads((ROOT / "build" / "timeline.json").read_text())
    fps = tl["fps"]
    f_start = int(a.t_from * fps)
    f_end = int(round((a.t_to if a.t_to is not None else tl["duration"]) * fps))
    srv = serve()
    (ROOT / "build" / "chunks").mkdir(parents=True, exist_ok=True)
    n = a.workers * 3  # trozos mas pequenos equilibran mejor la carga
    step = (f_end - f_start + n - 1) // n
    jobs = [(i, f_start + i * step, min(f_end, f_start + (i + 1) * step), fps, srv.server_port) for i in range(n)
            if f_start + i * step < f_end]
    t0 = time.time()
    with mp.get_context("spawn").Pool(a.workers) as pool:
        parts = pool.map(render_chunk, jobs, chunksize=1)
    lst = ROOT / "build" / "chunks" / "list.txt"
    lst.write_text("".join(f"file '{Path(x).name}'\n" for x in parts))
    video = ROOT / "build" / "video_noaudio.mp4"
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", str(lst), "-c", "copy", str(video)], check=True)
    print(f"video sin audio listo en {time.time() - t0:.0f}s")

    mix = ROOT / "build" / "mix.wav"
    out_dir = ROOT.parent / "output"
    out_dir.mkdir(exist_ok=True)
    final = out_dir / "tutorial_sistemas_institucionales.mp4"
    if mix.exists() and a.t_from == 0 and a.t_to is None:
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(video), "-i", str(mix), "-c:v", "copy", "-af", "loudnorm=I=-16:TP=-1.5:LRA=11", "-ar", "48000",
                        "-c:a", "aac", "-b:a", "192k",
                        "-shortest", "-movflags", "+faststart", str(final)], check=True)
        write_srt(tl, final.with_suffix(".srt"))
        print("final:", final)


if __name__ == "__main__":
    main()
