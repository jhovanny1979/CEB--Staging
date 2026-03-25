from __future__ import annotations

import os
from pathlib import Path

from sqlalchemy import create_engine, text
from sqlalchemy.exc import SQLAlchemyError


BACKEND_DIR = Path(__file__).resolve().parents[1]


def _url_from_env_file() -> str | None:
    env_file = BACKEND_DIR / '.env'
    if not env_file.exists():
        return None

    for raw in env_file.read_text(encoding='utf-8').splitlines():
        line = raw.strip()
        if not line or line.startswith('#'):
            continue
        if line.startswith('DATABASE_URL='):
            return line.split('=', 1)[1].strip()
    return None


def _candidate_urls() -> list[str]:
    urls: list[str] = []
    env_url = os.getenv('DATABASE_URL')
    if env_url:
        urls.append(env_url)

    file_url = _url_from_env_file()
    if file_url and file_url not in urls:
        urls.append(file_url)

    sqlite_path = BACKEND_DIR / 'dev.sqlite3'
    sqlite_url = f"sqlite+pysqlite:///{sqlite_path.as_posix()}"
    if sqlite_path.exists() and sqlite_url not in urls:
        urls.append(sqlite_url)

    return urls


def _pick_working_engine():
    last_error = None
    for url in _candidate_urls():
        try:
            kwargs = {'future': True}
            if url.startswith('postgresql'):
                kwargs['connect_args'] = {'connect_timeout': 2}
            engine = create_engine(url, **kwargs)
            with engine.connect() as conn:
                conn.execute(text('select 1'))
            return engine, url
        except Exception as exc:  # noqa: BLE001
            last_error = exc
            continue
    raise RuntimeError(f'No se pudo conectar a ninguna BD candidata. Ultimo error: {last_error}')


def _print_rows(title: str, rows) -> None:
    print(title)
    if not rows:
        print('  (sin datos)')
        return
    for row in rows:
        print('  -', tuple(row))


def main() -> None:
    try:
        engine, active_url = _pick_working_engine()
    except Exception as exc:  # noqa: BLE001
        raise SystemExit(f'[ERROR] {exc}') from exc

    print('===== RESUMEN BD LOCAL =====')
    print(f'Backend dir: {BACKEND_DIR}')
    print(f'BD activa:   {active_url}')
    print()

    try:
        with engine.connect() as conn:
            users = conn.execute(text('select count(*) from users')).scalar_one()
            businesses = conn.execute(text('select count(*) from businesses')).scalar_one()
            promotions = conn.execute(text('select count(*) from promotions')).scalar_one()
            outbox = conn.execute(text('select count(*) from notification_outbox')).scalar_one()

            print(f'users:                {users}')
            print(f'businesses:           {businesses}')
            print(f'promotions:           {promotions}')
            print(f'notification_outbox:  {outbox}')
            print()

            client_rows = conn.execute(
                text(
                    """
                    select
                      u.email,
                      u.full_name,
                      u.is_email_verified,
                      b.name,
                      b.locality,
                      b.category,
                      u.created_at
                    from users u
                    left join businesses b on b.owner_user_id = u.id
                    where u.role = 'client'
                    order by u.created_at desc
                    limit 10
                    """
                )
            ).all()
            _print_rows('--- ultimos clientes ---', client_rows)
            print()

            outbox_rows = conn.execute(
                text(
                    """
                    select type, subject, created_at
                    from notification_outbox
                    order by created_at desc
                    limit 10
                    """
                )
            ).all()
            _print_rows('--- outbox (correos) ---', outbox_rows)
    except SQLAlchemyError as exc:
        raise SystemExit(f'[ERROR] Fallo consultando tablas: {exc}') from exc


if __name__ == '__main__':
    main()

