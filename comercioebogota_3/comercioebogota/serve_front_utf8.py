from __future__ import annotations

import argparse
import os
import urllib.error
import urllib.request
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer


class UTF8StaticHandler(SimpleHTTPRequestHandler):
    """Serve static files with explicit UTF-8 charset for text assets."""

    extensions_map = {
        **SimpleHTTPRequestHandler.extensions_map,
        ".html": "text/html; charset=utf-8",
        ".css": "text/css; charset=utf-8",
        ".js": "application/javascript; charset=utf-8",
        ".json": "application/json; charset=utf-8",
        ".txt": "text/plain; charset=utf-8",
    }
    backend_origin = os.environ.get("CEB_BACKEND_ORIGIN", "http://127.0.0.1:8000").rstrip("/")
    proxy_prefixes = ("/api/", "/uploads/", "/health/")
    proxy_paths = ("/docs", "/openapi.json")

    def end_headers(self) -> None:
        # Dev server: always disable cache to avoid stale mojibake snapshots in browser.
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        self.send_header("Content-Language", "es-CO")
        super().end_headers()

    def _should_proxy(self) -> bool:
        path = self.path or "/"
        for prefix in self.proxy_prefixes:
            if path.startswith(prefix):
                return True
        for p in self.proxy_paths:
            if path == p or path.startswith(p + "?"):
                return True
        return False

    def _copy_response(self, status_code: int, headers: dict[str, str], body: bytes) -> None:
        self.send_response(status_code)
        skip_headers = {
            "transfer-encoding",
            "connection",
            "keep-alive",
            "proxy-authenticate",
            "proxy-authorization",
            "te",
            "trailers",
            "upgrade",
        }
        for key, value in headers.items():
            if key.lower() in skip_headers:
                continue
            self.send_header(key, value)
        self.end_headers()
        if body:
            self.wfile.write(body)

    def _proxy(self) -> None:
        target_url = f"{self.backend_origin}{self.path}"
        body = None
        if self.command in {"POST", "PUT", "PATCH", "DELETE"}:
            content_len = int(self.headers.get("Content-Length", "0") or "0")
            body = self.rfile.read(content_len) if content_len > 0 else None

        req = urllib.request.Request(target_url, data=body, method=self.command)
        for key, value in self.headers.items():
            lk = key.lower()
            if lk in {"host", "connection", "content-length"}:
                continue
            req.add_header(key, value)

        try:
            with urllib.request.urlopen(req, timeout=60) as resp:
                resp_body = resp.read()
                self._copy_response(resp.status, dict(resp.headers.items()), resp_body)
        except urllib.error.HTTPError as err:
            err_body = err.read()
            self._copy_response(err.code, dict(err.headers.items()), err_body)
        except Exception:
            payload = b'{"detail":"Backend no disponible"}'
            self._copy_response(502, {"Content-Type": "application/json; charset=utf-8"}, payload)

    def _dispatch(self) -> None:
        if self._should_proxy():
            self._proxy()
        else:
            super().do_GET()

    def do_GET(self) -> None:  # noqa: N802
        self._dispatch()

    def do_HEAD(self) -> None:  # noqa: N802
        self._dispatch()

    def do_POST(self) -> None:  # noqa: N802
        if self._should_proxy():
            self._proxy()
        else:
            self.send_error(405, "Method Not Allowed")

    def do_PUT(self) -> None:  # noqa: N802
        if self._should_proxy():
            self._proxy()
        else:
            self.send_error(405, "Method Not Allowed")

    def do_PATCH(self) -> None:  # noqa: N802
        if self._should_proxy():
            self._proxy()
        else:
            self.send_error(405, "Method Not Allowed")

    def do_DELETE(self) -> None:  # noqa: N802
        if self._should_proxy():
            self._proxy()
        else:
            self.send_error(405, "Method Not Allowed")

    def do_OPTIONS(self) -> None:  # noqa: N802
        if self._should_proxy():
            self._proxy()
            return
        self.send_response(204)
        self.end_headers()


def main() -> None:
    parser = argparse.ArgumentParser(description="Serve frontend with UTF-8 headers.")
    parser.add_argument("--host", default="127.0.0.1", help="Bind host (default: 127.0.0.1)")
    parser.add_argument("--port", type=int, default=5500, help="Bind port (default: 5500)")
    args = parser.parse_args()

    web_root = os.path.dirname(os.path.abspath(__file__))
    os.chdir(web_root)

    server = ThreadingHTTPServer((args.host, args.port), UTF8StaticHandler)
    print(f"Serving UTF-8 frontend at http://{args.host}:{args.port}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
