"""Video vertical (1080x1920, 15 s) con revelado del logo.

Personalidad de movimiento: Premium / ceremonial (skill motion-design).
  - Curva firma: cubic-bezier(0.4, 0, 0.2, 1), sin rebote.
  - Duraciones: 0.9 s (estandar), 1.2 s (revelado), 1.0 s (salida).
  - Coreografia: emblema -> titulo -> cinta (escalonado), luego lineas tricolor.
  - Capas: primaria (logo), secundaria (resplandor, brillo metalico, lineas),
    ambiental (particulas, luz de fondo que respira, zoom lento).

Uso: python3 scripts/render_logo_video.py assets/logo output/logo_200_vertical.mp4
"""
import subprocess
import sys

import numpy as np
from PIL import Image, ImageFilter

W, H, FPS, DUR = 1080, 1920, 30, 15.0
N = int(FPS * DUR)
LOGO_W = 1000            # ancho del logo en pantalla
LOGO_CY = 900            # centro vertical del logo
MARGIN = 120             # margen transparente alrededor del logo (para el resplandor)

RED, YELLOW, GREEN = (213, 43, 30), (249, 227, 0), (0, 121, 52)


# ---------- curvas ----------
def bezier(p1x, p1y, p2x, p2y):
    def f(x):
        x = min(max(x, 0.0), 1.0)
        lo, hi = 0.0, 1.0
        for _ in range(30):
            s = (lo + hi) / 2
            bx = 3 * (1 - s) ** 2 * s * p1x + 3 * (1 - s) * s ** 2 * p2x + s ** 3
            lo, hi = (s, hi) if bx < x else (lo, s)
        s = (lo + hi) / 2
        return 3 * (1 - s) ** 2 * s * p1y + 3 * (1 - s) * s ** 2 * p2y + s ** 3
    return f


ease = bezier(0.4, 0.0, 0.2, 1.0)        # firma (entradas)
ease_in = bezier(0.4, 0.0, 1.0, 1.0)     # salidas: acelerar


def prog(t, start, dur):
    return min(max((t - start) / dur, 0.0), 1.0)


# ---------- recursos ----------
def load_layers(folder):
    layers = {}
    for name in ("emblem", "title", "ribbon"):
        im = Image.open(f"{folder}/{name}.png")
        h = round(im.height * LOGO_W / im.width)
        im = im.resize((LOGO_W, h), Image.LANCZOS)
        a = np.asarray(im, dtype=np.float32)[..., 3] / 255.0
        layers[name] = a
    return layers


def metallic(h, w):
    """Blanco plateado con degradado vertical (la barrida de luz lo lleva a blanco puro)."""
    g = np.linspace(1.0, 0.0, h, dtype=np.float32)[:, None, None]
    top = np.array([245, 246, 250], np.float32)
    bottom = np.array([200, 204, 214], np.float32)
    return np.broadcast_to(bottom + (top - bottom) * g, (h, w, 3)).copy()


def background():
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    base = np.array([6, 8, 14], np.float32)
    d = np.sqrt(((xx - W / 2) / W) ** 2 + ((yy - LOGO_CY) / H) ** 2)
    vignette = np.clip(1.0 - d * 1.4, 0, 1)[..., None]
    glow = np.exp(-(d / 0.28) ** 2)[..., None]
    return base * (0.6 + 0.4 * vignette), glow * np.array([38, 46, 70], np.float32)


def make_particles(rng, n=80):
    return dict(
        x=rng.uniform(0, W, n), y=rng.uniform(0, H, n),
        vy=rng.uniform(-30, -10, n), vx=rng.uniform(-6, 6, n),
        r=rng.uniform(1.0, 2.6, n), a=rng.uniform(0.15, 0.55, n),
        ph=rng.uniform(0, 2 * np.pi, n), fq=rng.uniform(0.3, 0.9, n),
    )


SPRITE_R = 6
_sy, _sx = np.mgrid[-SPRITE_R:SPRITE_R + 1, -SPRITE_R:SPRITE_R + 1].astype(np.float32)


def draw_particles(img, p, t, strength):
    for i in range(len(p["x"])):
        x = (p["x"][i] + p["vx"][i] * t) % W
        y = (p["y"][i] + p["vy"][i] * t) % H
        tw = 0.6 + 0.4 * np.sin(p["ph"][i] + 2 * np.pi * p["fq"][i] * t)
        a = p["a"][i] * tw * strength
        spr = np.exp(-(_sx ** 2 + _sy ** 2) / (2 * p["r"][i] ** 2)) * a
        xi, yi = int(x), int(y)
        x0, x1 = max(xi - SPRITE_R, 0), min(xi + SPRITE_R + 1, W)
        y0, y1 = max(yi - SPRITE_R, 0), min(yi + SPRITE_R + 1, H)
        s = spr[y0 - (yi - SPRITE_R):y1 - (yi - SPRITE_R), x0 - (xi - SPRITE_R):x1 - (xi - SPRITE_R)]
        img[y0:y1, x0:x1] += s[..., None] * np.array([230, 225, 205], np.float32)


def paste(dst, src_rgb, src_a, cx, cy):
    """Composicion alfa con recorte en los bordes."""
    h, w = src_a.shape
    x0, y0 = int(round(cx - w / 2)), int(round(cy - h / 2))
    dx0, dy0 = max(x0, 0), max(y0, 0)
    dx1, dy1 = min(x0 + w, W), min(y0 + h, H)
    if dx1 <= dx0 or dy1 <= dy0:
        return
    sx0, sy0 = dx0 - x0, dy0 - y0
    a = src_a[sy0:sy0 + dy1 - dy0, sx0:sx0 + dx1 - dx0, None]
    rgb = src_rgb[sy0:sy0 + dy1 - dy0, sx0:sx0 + dx1 - dx0]
    region = dst[dy0:dy1, dx0:dx1]
    region *= 1 - a
    region += rgb * a


def add_glow(dst, glow, cx, cy):
    h, w = glow.shape[:2]
    x0, y0 = int(round(cx - w / 2)), int(round(cy - h / 2))
    dx0, dy0 = max(x0, 0), max(y0, 0)
    dx1, dy1 = min(x0 + w, W), min(y0 + h, H)
    dst[dy0:dy1, dx0:dx1] += glow[dy0 - y0:dy1 - y0, dx0 - x0:dx1 - x0]


def scale_arr(a, s):
    if abs(s - 1.0) < 1e-4:
        return a
    h, w = a.shape[:2]
    im = Image.fromarray(a.astype(np.float32), "F") if a.ndim == 2 else None
    if im is not None:
        return np.asarray(im.resize((max(1, round(w * s)), max(1, round(h * s))), Image.BILINEAR))
    chans = [scale_arr(a[..., c], s) for c in range(a.shape[2])]
    return np.dstack(chans)


def shift_scale_into(canvas_a, layer_a, s, dy):
    """Escala la capa respecto a su centro y la mueve dy px; la escribe en el lienzo del logo."""
    L = scale_arr(layer_a, s)
    ch, cw = canvas_a.shape
    lh, lw = L.shape
    x0 = (cw - lw) // 2
    y0 = (ch - lh) // 2 + int(round(dy))
    ys0, xs0 = max(-y0, 0), max(-x0, 0)
    ye, xe = min(lh, ch - y0), min(lw, cw - x0)
    np.maximum(canvas_a[y0 + ys0:y0 + ye, x0 + xs0:x0 + xe],
               L[ys0:ye, xs0:xe], out=canvas_a[y0 + ys0:y0 + ye, x0 + xs0:x0 + xe])


def tricolor(img, cy, t, start, alpha):
    """Tres lineas finas (rojo, amarillo, verde) que se dibujan desde el centro."""
    for k, col in enumerate((RED, YELLOW, GREEN)):
        p = ease(prog(t, start + k * 0.1, 0.9))
        half = 330 * p
        if half < 1:
            continue
        y = int(cy + (k - 1) * 12)
        x0, x1 = int(W / 2 - half), int(W / 2 + half)
        xs = np.arange(x0, x1, dtype=np.float32)
        fade = np.clip(1 - np.abs(xs - W / 2) / 340, 0, 1) ** 0.6  # puntas suaves
        seg = img[y - 2:y + 3, x0:x1]
        a = (fade * alpha)[None, :, None]
        seg *= 1 - a
        seg += np.array(col, np.float32) * a


# ---------- render ----------
def main(layers_dir, out_path):
    layers = load_layers(layers_dir)
    lh, lw = layers["emblem"].shape
    ch, cw = lh + 2 * MARGIN, lw + 2 * MARGIN
    metal = metallic(ch, cw)
    bg_base, bg_glow = background()
    particles = make_particles(np.random.default_rng(7))

    yy, xx = np.mgrid[0:ch, 0:cw].astype(np.float32)
    top_line = LOGO_CY - lh / 2 - 70
    bottom_line = LOGO_CY + lh / 2 + 70

    ff = subprocess.Popen(
        ["ffmpeg", "-loglevel", "error", "-y",
         "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
         "-f", "lavfi", "-i", "anullsrc=r=48000:cl=stereo",
         "-shortest", "-c:v", "libx264", "-preset", "slow", "-crf", "17",
         "-pix_fmt", "yuv420p", "-c:a", "aac", "-movflags", "+faststart", out_path],
        stdin=subprocess.PIPE)

    for f in range(N):
        t = f / FPS
        exit_p = ease_in(prog(t, 14.0, 1.0))
        master = 1 - exit_p

        # fondo + luz que respira (ambiental)
        bg_in = ease(prog(t, 0.0, 1.2))
        breathe = 0.85 + 0.15 * np.sin(2 * np.pi * t / 5.0)
        img = bg_base + bg_glow * bg_in * breathe
        draw_particles(img, particles, t, bg_in)

        # logo por capas (primaria)
        canvas_a = np.zeros((ch, cw), np.float32)
        pe = ease(prog(t, 0.6, 1.2))
        pt = ease(prog(t, 1.5, 0.9))
        pr = ease(prog(t, 2.0, 0.9))
        shift_scale_into(canvas_a, layers["emblem"] * min(pe / 0.6, 1.0), 1.15 - 0.15 * pe, 0)
        shift_scale_into(canvas_a, layers["title"] * pt, 1.0, 40 * (1 - pt))
        shift_scale_into(canvas_a, layers["ribbon"] * pr, 1.0, 40 * (1 - pr))

        # barrida de luz diagonal (secundaria)
        sweep = np.zeros((ch, cw), np.float32)
        for s0 in (4.0, 10.0):
            sp = prog(t, s0, 1.3)
            if 0 < sp < 1:
                pos = -400 + (cw + 800) * ease(sp)
                band = np.exp(-(((xx + yy * 0.45) - pos - ch * 0.2) / 70) ** 2)
                sweep = np.maximum(sweep, band)
        rgb = metal + (255 - metal) * sweep[..., None]

        # resplandor: pico al aterrizar el emblema + durante la barrida
        land = np.exp(-((t - 1.8) / 0.5) ** 2)
        bloom_k = 0.35 * pe + 0.5 * land + 0.6 * sweep.max()
        glow_src = Image.fromarray((canvas_a * (0.6 + sweep) * 255).clip(0, 255).astype(np.uint8))
        glow = np.asarray(glow_src.filter(ImageFilter.GaussianBlur(28)), np.float32) / 255.0
        glow_rgb = glow[..., None] * np.array([120, 135, 170], np.float32) * bloom_k

        # zoom lento de toda la pieza (ambiental) + leve contraccion al salir
        g = 1.0 + 0.05 * (t / DUR) - 0.03 * exit_p
        canvas_s = scale_arr(canvas_a, g)
        rgb_s = scale_arr(rgb, g)
        glow_s = scale_arr(glow_rgb, g)

        add_glow(img, glow_s, W / 2, LOGO_CY)
        paste(img, rgb_s, canvas_s, W / 2, LOGO_CY)

        # lineas tricolor arriba y abajo (secundaria)
        tricolor(img, top_line - (g - 1) * lh / 2, t, 3.0, 1.0)
        tricolor(img, bottom_line + (g - 1) * lh / 2, t, 3.15, 1.0)

        img *= master
        ff.stdin.write(np.clip(img, 0, 255).astype(np.uint8).tobytes())
        if f % 60 == 0:
            print(f"cuadro {f}/{N}", flush=True)

    ff.stdin.close()
    ff.wait()
    print("listo:", out_path)


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
