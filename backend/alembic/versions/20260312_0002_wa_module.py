"""wa module persistence tables

Revision ID: 20260312_0002
Revises: 20260310_0001
Create Date: 2026-03-12 10:30:00
"""

from __future__ import annotations

from alembic import op
from sqlalchemy import inspect

from app import models  # noqa: F401
from app.db.base import Base

revision = '20260312_0002'
down_revision = '20260310_0001'
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)
    existing = set(inspector.get_table_names())
    target_names = ['wa_contacts', 'wa_promotion_templates', 'wa_promotion_sends']
    missing = [name for name in target_names if name not in existing]
    if not missing:
        return

    Base.metadata.create_all(bind=bind, tables=[Base.metadata.tables[name] for name in missing])


def downgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)
    existing = set(inspector.get_table_names())
    for table_name in ['wa_promotion_sends', 'wa_promotion_templates', 'wa_contacts']:
        if table_name in existing:
            op.drop_table(table_name)
