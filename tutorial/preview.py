"""Captura cuadros sueltos para revisar: python3 preview.py [--vertical] t1 t2 ... -> build/preview/f_<t>.png"""
import functools
import http.server
import sys
import threading
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).parent


def serve():
    class Quiet(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *a):
            pass

    handler = functools.partial(Quiet, directory=str(ROOT))
    srv = http.server.ThreadingHTTPServer(("127.0.0.1", 0), handler)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return srv


def main(times, vertical=False):
    srv = serve()
    out = ROOT / "build" / "preview"
    out.mkdir(parents=True, exist_ok=True)
    with sync_playwright() as p:
        b = p.chromium.launch(executable_path="/opt/pw-browsers/chromium-1194/chrome-linux/chrome")
        vp = {"width": 1080, "height": 1920} if vertical else {"width": 1920, "height": 1080}
        pg = b.new_page(viewport=vp)
        pg.on("console", lambda m: print("console:", m.text))
        pg.on("pageerror", lambda e: print("ERROR:", e))
        pg.goto(f"http://127.0.0.1:{srv.server_port}/{'vertical.html' if vertical else 'index.html'}")
        pg.evaluate("window.ready")
        for t in times:
            pg.evaluate(f"window.seek({t})")
            pg.screenshot(path=str(out / f"{'v' if vertical else 'f'}_{t:07.2f}.png"))
        print("eventos:", pg.evaluate("window.EVENTS.length"))
        b.close()


if __name__ == "__main__":
    args = [a for a in sys.argv[1:] if a != "--vertical"]
    main([float(x) for x in args], "--vertical" in sys.argv)
