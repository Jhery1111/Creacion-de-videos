"""Mezcla de audio: narracion + musica instrumental discreta + efectos.

- Narracion: clips de audio/ en los tiempos de build/timeline.json.
- Musica: sintetizada aqui (sin derechos de terceros): pad suave, arpegio y
  bajo en La menor, 92 BPM; baja de volumen cuando habla la voz.
- Efectos: clics, teclas, toques, transiciones; tiempos de build/events.json
  (exportados desde la pagina con: python3 audio.py --export-events).

Salida: build/mix.wav
"""
import json
import subprocess
import sys
from pathlib import Path

import numpy as np

ROOT = Path(__file__).parent
VERTICAL = "--vertical" in sys.argv
SUF = "_v" if VERTICAL else ""
PAGE = "vertical.html" if VERTICAL else "index.html"
VIEWPORT = {"width": 1080, "height": 1920} if VERTICAL else {"width": 1920, "height": 1080}
SR = 48000
rng = np.random.default_rng(3)


def export_events():
    sys.path.insert(0, str(ROOT))
    from preview import serve
    from playwright.sync_api import sync_playwright
    srv = serve()
    with sync_playwright() as p:
        b = p.chromium.launch(executable_path="/opt/pw-browsers/chromium-1194/chrome-linux/chrome")
        pg = b.new_page(viewport=VIEWPORT)
        pg.goto(f"http://127.0.0.1:{srv.server_port}/{PAGE}")
        pg.evaluate("window.ready")
        evs = pg.evaluate("window.EVENTS")
        b.close()
    (ROOT / "build" / f"events{SUF}.json").write_text(json.dumps(evs))
    print(len(evs), "eventos")


def load_audio(path):
    raw = subprocess.check_output(["ffmpeg", "-v", "error", "-i", str(path), "-f", "f32le", "-ac", "1", "-ar", str(SR), "-"])
    return np.frombuffer(raw, np.float32).copy()


def env(n, a, d):
    """Envolvente ataque/caida exponencial (segundos)."""
    t = np.arange(n) / SR
    return np.minimum(1, t / max(a, 1e-4)) * np.exp(-t / d)


def lowpass(x, cutoff):
    a = np.exp(-2 * np.pi * cutoff / SR)
    y = np.empty_like(x)
    acc = 0.0
    for i in range(len(x)):  # solo en efectos cortos
        acc = (1 - a) * x[i] + a * acc
        y[i] = acc
    return y


# ---------------- efectos ----------------
def sfx_click():
    n = int(0.05 * SR)
    t = np.arange(n) / SR
    s = rng.normal(0, 1, n) * env(n, 0.0005, 0.004) * 0.5 + np.sin(2 * np.pi * 2300 * t) * env(n, 0.0005, 0.012) * 0.35
    return s * 0.55


def sfx_key(i):
    n = int(0.04 * SR)
    t = np.arange(n) / SR
    f = 1500 + (i * 137) % 600
    s = rng.normal(0, 1, n) * env(n, 0.0004, 0.003) * 0.35 + np.sin(2 * np.pi * f * t) * env(n, 0.0004, 0.006) * 0.18
    return s * (0.30 + 0.08 * ((i * 7) % 3))


def sfx_tap():
    n = int(0.08 * SR)
    t = np.arange(n) / SR
    return np.sin(2 * np.pi * (260 - 900 * t) * t) * env(n, 0.001, 0.025) * 0.5


def sfx_whoosh():
    n = int(0.75 * SR)
    t = np.arange(n) / SR
    noise = rng.normal(0, 1, n)
    out = np.zeros(n)
    # barrido de filtro por bloques
    blk = 1200
    acc = 0.0
    for s0 in range(0, n, blk):
        p = s0 / n
        cut = 300 + 2600 * np.sin(np.pi * p)
        a = np.exp(-2 * np.pi * cut / SR)
        for i in range(s0, min(n, s0 + blk)):
            acc = (1 - a) * noise[i] + a * acc
            out[i] = acc
    shape = np.sin(np.pi * t / t[-1]) ** 2
    return out * shape * 0.9


def sfx_pop():
    n = int(0.16 * SR)
    t = np.arange(n) / SR
    f = 660 + 330 * np.minimum(1, t / 0.05)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * env(n, 0.002, 0.05) * 0.22


def sfx_chime():
    n = int(1.8 * SR)
    t = np.arange(n) / SR
    s = np.zeros(n)
    for k, (f, d) in enumerate([(880.0, 0.0), (1318.5, 0.11), (1760.0, 0.22)]):
        st = int(d * SR)
        m = n - st
        tt = t[:m]
        s[st:] += (np.sin(2 * np.pi * f * tt) + 0.3 * np.sin(2 * np.pi * 2 * f * tt)) * env(m, 0.003, 0.5) * (0.24 - k * 0.04)
    return s


# ---------------- musica ----------------
def note(midi):
    return 440.0 * 2 ** ((midi - 69) / 12)


def music(total):
    n = int(total * SR)
    out = np.zeros(n)
    bpm = 92.0
    beat = 60 / bpm
    bar = 4 * beat
    # Am  F  C  G  (2 compases cada uno)
    chords = [[57, 60, 64], [53, 57, 60], [48, 55, 60], [55, 59, 62]]
    bass = [45, 41, 48, 43]
    t_all = np.arange(n) / SR

    # pad: senos con leve desafinacion, cambios suaves de acorde
    seg = 2 * bar
    for ci in range(int(total / seg) + 1):
        c = chords[ci % 4]
        s0 = int(ci * seg * SR)
        s1 = min(n, int((ci + 1) * seg * SR) + int(1.0 * SR))
        if s0 >= n:
            break
        tt = np.arange(s1 - s0) / SR
        L = len(tt)
        shape = np.minimum(1, tt / 1.2) * np.minimum(1, (L / SR - tt) / 1.0)
        for m in c:
            for det in (-0.12, 0.12):
                f = note(m + 12) * (1 + det / 100)
                out[s0:s1] += np.sin(2 * np.pi * f * tt + det) * shape * 0.035
        # bajo
        fb = note(bass[ci % 4])
        out[s0:s1] += np.sin(2 * np.pi * fb * tt) * shape * 0.06

    # arpegio (corcheas) con caida suave
    eighth = beat / 2
    k = 0
    tt = np.arange(int(0.5 * SR)) / SR
    pl_env = env(len(tt), 0.004, 0.16)
    pattern = [0, 1, 2, 1, 2, 0, 1, 2]
    while k * eighth < total:
        t0 = k * eighth
        ci = int(t0 / seg) % 4
        m = chords[ci][pattern[k % 8]] + 24
        s0 = int(t0 * SR)
        s1 = min(n, s0 + len(tt))
        f = note(m)
        tone = (np.sin(2 * np.pi * f * tt) + 0.25 * np.sin(2 * np.pi * 2 * f * tt)) * pl_env
        accent = 1.0 if k % 2 == 0 else 0.7
        out[s0:s1] += tone[: s1 - s0] * 0.020 * accent
        k += 1

    # pulso ritmico muy suave (tick filtrado en cada tiempo)
    nt = int(0.03 * SR)
    tick = rng.normal(0, 1, nt) * env(nt, 0.0005, 0.006) * 0.012
    b = 0
    while b * beat < total:
        s0 = int(b * beat * SR)
        s1 = min(n, s0 + nt)
        out[s0:s1] += tick[: s1 - s0] * (1.0 if b % 2 else 0.6)
        b += 1

    # entrada/salida
    fade = np.minimum(1, t_all / 3.0) * np.minimum(1, (total - t_all) / 4.0)
    return out * np.clip(fade, 0, 1)


def main():
    tl = json.loads((ROOT / "build" / f"timeline{SUF}.json").read_text())
    evs = json.loads((ROOT / "build" / f"events{SUF}.json").read_text())
    total = tl["duration"]
    n = int(total * SR) + SR
    voice = np.zeros(n)
    fx = np.zeros(n)

    for sc in tl["scenes"]:
        for u in sc["utts"]:
            clip = load_audio(ROOT / "audio" / u["file"])
            s0 = int((sc["start"] + u["start"]) * SR)
            voice[s0:s0 + len(clip)] += clip[: n - s0]

    bank = {"click": sfx_click(), "tap": sfx_tap(), "whoosh": sfx_whoosh(), "pop": sfx_pop(), "chime": sfx_chime()}
    keys = [sfx_key(i) for i in range(6)]
    for i, e in enumerate(evs):
        s = keys[i % 6] if e["type"] == "key" else bank[e["type"]]
        s0 = int(e["t"] * SR)
        if s0 < 0 or s0 >= n:
            continue
        L = min(len(s), n - s0)
        fx[s0:s0 + L] += s[:L]

    mus = np.zeros(n)
    m = music(total)
    mus[: len(m)] = m

    # ducking: la musica baja ~7 dB mientras habla la voz
    win = int(0.05 * SR)
    lvl = np.sqrt(np.convolve(voice ** 2, np.ones(win) / win, mode="same"))
    active = (lvl > 0.01).astype(float)
    sm = int(0.35 * SR)
    active = np.convolve(active, np.ones(sm) / sm, mode="same")
    duck = 1 - 0.55 * np.clip(active, 0, 1)

    # normalizar voz a pico ~ -3 dBFS
    voice *= 0.70 / max(1e-6, np.abs(voice).max())
    mix = voice + fx * 0.55 + mus * duck * 0.55
    peak = np.abs(mix).max()
    if peak > 0.97:
        mix *= 0.97 / peak
    pcm = (np.clip(mix, -1, 1) * 32767).astype(np.int16)
    out = ROOT / "build" / f"mix{SUF}.wav"
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "s16le", "-ar", str(SR), "-ac", "1", "-i", "-", "-ac", "2", str(out)],
                   input=pcm.tobytes(), check=True)
    print("mezcla:", out, f"{total:.1f}s")


if __name__ == "__main__":
    if "--export-events" in sys.argv:
        export_events()
    else:
        main()
