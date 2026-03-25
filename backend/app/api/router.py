from fastapi import APIRouter

from app.api.routes import admin, auth, me, system

api_router = APIRouter()
api_router.include_router(system.router, tags=['system'])
api_router.include_router(auth.router, prefix='/auth', tags=['auth'])
api_router.include_router(me.router, prefix='/me', tags=['me'])
api_router.include_router(admin.router, prefix='/admin', tags=['admin'])
