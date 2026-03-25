from __future__ import annotations

import logging
from typing import Callable
from uuid import uuid4

from fastapi import Request, Response


LOG_FORMAT = '%(asctime)s %(levelname)s %(name)s %(message)s'


def configure_logging() -> None:
    logging.basicConfig(level=logging.INFO, format=LOG_FORMAT)


async def request_id_middleware(request: Request, call_next: Callable) -> Response:
    request_id = request.headers.get('x-request-id', str(uuid4()))
    request.state.request_id = request_id
    response = await call_next(request)
    response.headers['x-request-id'] = request_id
    return response
