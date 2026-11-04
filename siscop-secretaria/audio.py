"""Mezcla de audio del tutorial SISCOP (Secretaria): voz + musica corporativa + efectos.

La musica se sintetiza aqui (sin derechos de terceros), igual que en el tutorial MINERVA,
y baja bajo la voz. Los efectos siguen build/events_h.json (node preview.cjs --eventos).
Uso: python3 audio.py  ->  build/mix_h.wav
"""
import importlib.util
import json
import subprocess
from pathlib import Path

import numpy as np

ROOT = Path(__file__).parent
_spec = importlib.util.spec_from_file_location("tutorial_audio", ROOT.parent / "tutorial" / "audio.py")
A = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(A)
SR, env, note, load_audio = A.SR, A.env, A.note, A.load_audio
rng = np.random.default_rng(11)


def music(total):
    """Corporativa moderna: pad, arpegio en semicorcheas, bajo, bombo y hi-hat suaves (112 BPM)."""
    n = int(total * SR)
    out = np.zeros(n)
    beat = 60 / 112
    bar = 4 * beat
    chords = [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]]
    bass = [33, 29, 36, 31]
    seg = 2 * bar
    for ci in range(int(total / seg) + 1):
        s0 = int(ci * seg * SR)
        if s0 >= n:
            break
        s1 = min(n, int((ci + 1) * seg * SR) + int(0.6 * SR))
        tt = np.arange(s1 - s0) / SR
        shape = np.minimum(1, tt / 0.8) * np.minimum(1, (len(tt) / SR - tt) / 0.6)
        for m in chords[ci % 4]:
            for det in (-0.15, 0.15):
                out[s0:s1] += np.sin(2 * np.pi * note(m + 12) * (1 + det / 100) * tt) * shape * 0.026
    e8 = beat / 2
    k = 0
    tb = np.arange(int(0.35 * SR)) / SR
    while k * e8 < total:
        ci = int(k * e8 / seg) % 4
        s0 = int(k * e8 * SR)
        s1 = min(n, s0 + len(tb))
        f = note(bass[ci] + 12)
        tone = (np.sin(2 * np.pi * f * tb) + 0.3 * np.sin(4 * np.pi * f * tb)) * env(len(tb), 0.005, 0.12)
        out[s0:s1] += tone[: s1 - s0] * 0.07
        k += 1
    e16 = beat / 4
    k = 0
    ta = np.arange(int(0.3 * SR)) / SR
    pat = [0, 1, 2, 1, 2, 0, 2, 1]
    while k * e16 < total:
        ci = int(k * e16 / seg) % 4
        s0 = int(k * e16 * SR)
        s1 = min(n, s0 + len(ta))
        f = note(chords[ci][pat[k % 8]] + 24)
        tone = (np.sin(2 * np.pi * f * ta) + 0.2 * np.sin(6 * np.pi * f * ta)) * env(len(ta), 0.002, 0.07)
        out[s0:s1] += tone[: s1 - s0] * (0.017 if k % 4 == 0 else 0.011)
        k += 1
    tk = np.arange(int(0.25 * SR)) / SR
    kick = np.sin(2 * np.pi * (48 + 90 * np.exp(-tk * 28)) * tk) * env(len(tk), 0.002, 0.09) * 0.11
    nh = int(0.04 * SR)
    hat = rng.normal(0, 1, nh) * env(nh, 0.0005, 0.008)
    hat = np.diff(np.concatenate([[0], hat])) * 0.03
    b = 0
    while b * beat < total:
        s0 = int(b * beat * SR)
        out[s0:s0 + len(kick)] += kick[: max(0, min(len(kick), n - s0))]
        h0 = int((b + 0.5) * beat * SR)
        if h0 + nh < n:
            out[h0:h0 + nh] += hat
        b += 1
    t_all = np.arange(n) / SR
    return out * np.clip(np.minimum(1, t_all / 1.5) * np.minimum(1, (total - t_all) / 2.5), 0, 1)


def main():
    tl = json.loads((ROOT / "build" / "timeline_h.json").read_text())
    evs = json.loads((ROOT / "build" / "events_h.json").read_text())
    total = tl["duration"]
    n = int(total * SR) + SR
    voice, fx = np.zeros(n), np.zeros(n)
    for sc in tl["scenes"]:
        for u in sc["utts"]:
            clip = load_audio(ROOT / "audio" / u["file"])
            s0 = int((sc["start"] + u["start"]) * SR)
            voice[s0:s0 + len(clip)] += clip[: n - s0]
    bank = {"click": A.sfx_click(), "tap": A.sfx_tap(), "whoosh": A.sfx_whoosh() * 0.8, "pop": A.sfx_pop() * 0.8, "chime": A.sfx_chime()}
    keys = [A.sfx_key(i) for i in range(6)]
    for i, e in enumerate(evs):
        s = keys[i % 6] * 0.7 if e["type"] == "key" else bank[e["type"]]
        s0 = int(e["t"] * SR)
        if 0 <= s0 < n:
            L = min(len(s), n - s0)
            fx[s0:s0 + L] += s[:L]
    mus = np.zeros(n)
    m = music(total)
    mus[: len(m)] = m
    win = int(0.05 * SR)
    lvl = np.sqrt(np.convolve(voice ** 2, np.ones(win) / win, mode="same"))
    act = np.convolve((lvl > 0.01).astype(float), np.ones(int(0.3 * SR)) / int(0.3 * SR), mode="same")
    duck = 1 - 0.6 * np.clip(act, 0, 1)
    voice *= 0.72 / max(1e-6, np.abs(voice).max())
    mix = voice + fx * 0.5 + mus * duck * 0.6
    peak = np.abs(mix).max()
    if peak > 0.97:
        mix *= 0.97 / peak
    pcm = (np.clip(mix, -1, 1) * 32767).astype(np.int16)
    out = ROOT / "build" / "mix_h.wav"
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "s16le", "-ar", str(SR), "-ac", "1", "-i", "-", "-ac", "2", str(out)],
                   input=pcm.tobytes(), check=True)
    print("mezcla:", out, f"{total:.1f}s")


if __name__ == "__main__":
    main()
