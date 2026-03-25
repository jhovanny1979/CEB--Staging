"""platform settings table

Revision ID: 20260312_0003
Revises: 20260312_0002
Create Date: 2026-03-12 18:40:00
"""

from __future__ import annotations

from alembic import op
from sqlalchemy import inspect

from app import models  # noqa: F401
from app.db.base import Base

revision = '20260312_0003'
down_revision = '20260312_0002'
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)
    existing = set(inspector.get_table_names())
    if 'platform_settings' in existing:
        return
    Base.metadata.create_all(bind=bind, tables=[Base.metadata.tables['platform_settings']])


def downgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)
    existing = set(inspector.get_table_names())
    if 'platform_settings' in existing:
        op.drop_table('platform_settings')
