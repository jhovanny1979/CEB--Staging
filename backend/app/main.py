from __future__ import annotations

from contextlib import asynccontextmanager
import logging

from apscheduler.schedulers.background import BackgroundScheduler
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api.router import api_router
from app.core.config import get_settings
from app.core.logging import configure_logging, request_id_middleware
from app.db.session import SessionLocal
from app.services.subscription_jobs import queue_expiration_reminders

scheduler = BackgroundScheduler()
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    settings.upload_path.mkdir(parents=True, exist_ok=True)

    if not scheduler.running:
        scheduler.configure(timezone=settings.app_timezone)

        def _job() -> None:
            db = SessionLocal()
            try:
                queued = queue_expiration_reminders(db)
                if queued:
                    logger.info('queued %s expiration reminders', queued)
                db.commit()
            except Exception:  # noqa: BLE001
                db.rollback()
                logger.exception('error on reminder job')
            finally:
                db.close()

        scheduler.add_job(_job, trigger='interval', hours=1, id='subscription-reminders', replace_existing=True)
        scheduler.start()

    yield

    if scheduler.running:
        scheduler.shutdown(wait=False)


def create_app() -> FastAPI:
    settings = get_settings()
    configure_logging()

    app = FastAPI(title=settings.app_name, debug=settings.debug, lifespan=lifespan)
    app.middleware('http')(request_id_middleware)
    if settings.env != 'production':
        # Local development: allow any origin to avoid loopback/IPv4/IPv6 CORS friction.
        app.add_middleware(
            CORSMiddleware,
            allow_origins=['*'],
            allow_credentials=False,
            allow_methods=['*'],
            allow_headers=['*'],
        )
    else:
        app.add_middleware(
            CORSMiddleware,
            allow_origins=settings.allowed_origins_list,
            allow_credentials=True,
            allow_methods=['*'],
            allow_headers=['*'],
        )

    app.include_router(api_router, prefix=settings.api_v1_prefix)

    @app.get('/health/live', tags=['system'])
    def _health_live() -> dict[str, str]:
        return {'status': 'ok'}

    @app.get('/health/ready', tags=['system'])
    def _health_ready() -> dict[str, str]:
        return {'status': 'ready'}

    uploads_mount = settings.upload_path.resolve()
    app.mount('/uploads', StaticFiles(directory=str(uploads_mount)), name='uploads')

    return app


app = create_app()

