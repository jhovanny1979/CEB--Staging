"""promotion images table

Revision ID: 20260313_0004
Revises: 20260312_0003
Create Date: 2026-03-13 12:30:00
"""

from __future__ import annotations

from alembic import op
from sqlalchemy import inspect

from app import models  # noqa: F401
from app.db.base import Base

revision = '20260313_0004'
down_revision = '20260312_0003'
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)
    existing = set(inspector.get_table_names())
    if 'promotion_images' in existing:
        return
    Base.metadata.create_all(bind=bind, tables=[Base.metadata.tables['promotion_images']])


def downgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)
    existing = set(inspector.get_table_names())
    if 'promotion_images' in existing:
        op.drop_table('promotion_images')
