"""Captura cuadros sueltos: python3 preview.py [--vertical] t1 t2 ... -> build/preview/{h,v}_<t>.png"""
import functools
import http.server
import sys
import threading
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).parent
REPO = ROOT.parent
CHROME = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome"


def serve():
    class Quiet(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *a):
            pass

    srv = http.server.ThreadingHTTPServer(("127.0.0.1", 0), functools.partial(Quiet, directory=str(REPO)))
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return srv


def page_url(port, vertical):
    return f"http://127.0.0.1:{port}/{ROOT.name}/{'vertical' if vertical else 'index'}.html"


def viewport(vertical):
    return {"width": 1080, "height": 1920} if vertical else {"width": 1920, "height": 1080}


def main(times, vertical):
    srv = serve()
    out = ROOT / "build" / "preview"
    out.mkdir(parents=True, exist_ok=True)
    with sync_playwright() as p:
        b = p.chromium.launch(executable_path=CHROME)
        pg = b.new_page(viewport=viewport(vertical))
        pg.on("pageerror", lambda e: print("ERROR:", e))
        pg.on("console", lambda m: print("console:", m.text) if m.type == "error" else None)
        pg.goto(page_url(srv.server_port, vertical))
        pg.evaluate("window.ready")
        for t in times:
            pg.evaluate(f"window.seek({t})")
            pg.screenshot(path=str(out / f"{'v' if vertical else 'h'}_{t:07.2f}.png"))
        print("eventos:", pg.evaluate("window.EVENTS.length"))
        b.close()


if __name__ == "__main__":
    args = [a for a in sys.argv[1:] if a != "--vertical"]
    main([float(x) for x in args], "--vertical" in sys.argv)
