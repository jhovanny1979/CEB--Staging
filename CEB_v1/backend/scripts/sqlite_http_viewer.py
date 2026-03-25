from __future__ import annotations

import argparse
import html
import sqlite3
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse


def quote_ident(name: str) -> str:
    return '"' + name.replace('"', '""') + '"'


def to_int(value: str | None, default: int, minimum: int = 1, maximum: int = 500) -> int:
    if value is None:
        return default
    try:
        parsed = int(value)
    except ValueError:
        return default
    if parsed < minimum:
        return minimum
    if parsed > maximum:
        return maximum
    return parsed


class SQLiteViewerHandler(BaseHTTPRequestHandler):
    db_path: Path

    def _connect(self) -> sqlite3.Connection:
        conn = sqlite3.connect(str(self.db_path))
        conn.row_factory = sqlite3.Row
        return conn

    def _send_html(self, content: str, status: int = 200) -> None:
        body = content.encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _layout(self, title: str, body: str) -> str:
        safe_title = html.escape(title)
        return f"""<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{safe_title}</title>
  <style>
    body {{ font-family: Segoe UI, Arial, sans-serif; margin: 0; background: #0f1115; color: #e8e8e8; }}
    .wrap {{ max-width: 1200px; margin: 0 auto; padding: 20px; }}
    h1, h2 {{ margin: 0 0 14px; }}
    .meta {{ color: #9ca3af; font-size: 14px; margin-bottom: 16px; }}
    .card {{ background: #171a21; border: 1px solid #2a3140; border-radius: 10px; padding: 16px; margin-bottom: 16px; }}
    a {{ color: #f6c04b; text-decoration: none; }}
    a:hover {{ text-decoration: underline; }}
    table {{ width: 100%; border-collapse: collapse; font-size: 13px; }}
    th, td {{ border: 1px solid #2a3140; padding: 8px; text-align: left; vertical-align: top; }}
    th {{ background: #202636; position: sticky; top: 0; }}
    .small {{ color: #9ca3af; font-size: 12px; }}
    .pager {{ display: flex; gap: 10px; align-items: center; margin-top: 12px; }}
    .btn {{ display: inline-block; border: 1px solid #3c4458; border-radius: 7px; padding: 5px 10px; }}
    .row-count {{ color: #9ca3af; margin-bottom: 10px; }}
    .table-wrap {{ overflow: auto; max-height: 72vh; }}
    .mono {{ font-family: Consolas, monospace; }}
  </style>
</head>
<body>
  <div class="wrap">
    {body}
  </div>
</body>
</html>"""

    def _list_tables(self) -> str:
        with self._connect() as conn:
            rows = conn.execute(
                """
                SELECT name
                FROM sqlite_master
                WHERE type='table' AND name NOT LIKE 'sqlite_%'
                ORDER BY name
                """
            ).fetchall()

            table_rows = []
            for row in rows:
                name = row["name"]
                count = conn.execute(f"SELECT COUNT(*) FROM {quote_ident(name)}").fetchone()[0]
                table_rows.append((name, count))

        items = []
        for name, count in table_rows:
            safe_name = html.escape(name)
            items.append(
                f"<tr><td><a href='/table/{safe_name}'>{safe_name}</a></td><td>{count}</td></tr>"
            )

        body = f"""
        <h1>SQLite Viewer</h1>
        <div class="meta">BD: <span class="mono">{html.escape(str(self.db_path))}</span></div>
        <div class="card">
          <h2>Tablas</h2>
          <div class="table-wrap">
            <table>
              <thead><tr><th>Tabla</th><th>Registros</th></tr></thead>
              <tbody>{''.join(items) if items else '<tr><td colspan="2">Sin tablas</td></tr>'}</tbody>
            </table>
          </div>
        </div>
        """
        return self._layout("SQLite Viewer", body)

    def _show_table(self, table_name: str, query: dict[str, list[str]]) -> str:
        page = to_int((query.get("page") or [None])[0], 1, minimum=1, maximum=100000)
        page_size = to_int((query.get("page_size") or [None])[0], 50, minimum=1, maximum=200)
        offset = (page - 1) * page_size

        with self._connect() as conn:
            known = {
                row["name"]
                for row in conn.execute(
                    "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
                ).fetchall()
            }
            if table_name not in known:
                return self._layout("Tabla no encontrada", f"<h1>Tabla no encontrada: {html.escape(table_name)}</h1><p><a href='/'>Volver</a></p>")

            total = conn.execute(f"SELECT COUNT(*) FROM {quote_ident(table_name)}").fetchone()[0]
            data = conn.execute(
                f"SELECT * FROM {quote_ident(table_name)} LIMIT ? OFFSET ?",
                (page_size, offset),
            ).fetchall()

        columns = data[0].keys() if data else []
        headers = "".join(f"<th>{html.escape(str(c))}</th>" for c in columns)
        rows_html: list[str] = []
        for row in data:
            cells = []
            for col in columns:
                value = row[col]
                text = "" if value is None else str(value)
                if len(text) > 500:
                    text = text[:500] + "...(truncado)"
                cells.append(f"<td>{html.escape(text)}</td>")
            rows_html.append("<tr>" + "".join(cells) + "</tr>")

        prev_link = (
            f"<a class='btn' href='/table/{html.escape(table_name)}?page={page-1}&page_size={page_size}'>← Anterior</a>"
            if page > 1
            else ""
        )
        next_link = (
            f"<a class='btn' href='/table/{html.escape(table_name)}?page={page+1}&page_size={page_size}'>Siguiente →</a>"
            if offset + page_size < total
            else ""
        )

        body = f"""
        <h1>Tabla: {html.escape(table_name)}</h1>
        <div class="meta"><a href="/">← Volver a tablas</a></div>
        <div class="card">
          <div class="row-count">Total: {total} registro(s) · Página {page} · Tamaño {page_size}</div>
          <div class="table-wrap">
            <table>
              <thead><tr>{headers if headers else '<th>Sin columnas</th>'}</tr></thead>
              <tbody>{''.join(rows_html) if rows_html else '<tr><td>Sin registros</td></tr>'}</tbody>
            </table>
          </div>
          <div class="pager">{prev_link}<span class="small">page={page}</span>{next_link}</div>
        </div>
        """
        return self._layout(f"Tabla {table_name}", body)

    def do_GET(self) -> None:  # noqa: N802
        parsed = urlparse(self.path)
        path = parsed.path or "/"
        query = parse_qs(parsed.query)

        if path == "/":
            self._send_html(self._list_tables())
            return

        if path.startswith("/table/"):
            table_name = path.split("/table/", 1)[1]
            self._send_html(self._show_table(table_name, query))
            return

        self._send_html(self._layout("404", "<h1>404</h1><p>Ruta no encontrada.</p><p><a href='/'>Volver</a></p>"), status=404)

    def log_message(self, fmt: str, *args) -> None:
        # Keep console output concise
        print("[sqlite-viewer]", fmt % args)


def main() -> None:
    parser = argparse.ArgumentParser(description="Simple SQLite viewer over HTTP.")
    parser.add_argument("--db", required=True, help="Ruta al archivo .sqlite/.db")
    parser.add_argument("--host", default="127.0.0.1", help="Host bind (default 127.0.0.1)")
    parser.add_argument("--port", type=int, default=8765, help="Puerto (default 8765)")
    args = parser.parse_args()

    db_path = Path(args.db).resolve()
    if not db_path.exists():
        raise SystemExit(f"No existe la base de datos: {db_path}")

    SQLiteViewerHandler.db_path = db_path
    server = ThreadingHTTPServer((args.host, args.port), SQLiteViewerHandler)
    print(f"SQLite viewer en http://{args.host}:{args.port}")
    print(f"BD: {db_path}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
