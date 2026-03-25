from __future__ import annotations

from sqlalchemy.orm import Session

from app.models.entities import AuditLog


def log_action(db: Session, *, actor_user_id, action: str, entity_type: str = '', entity_id: str = '', metadata: dict | None = None) -> AuditLog:
    row = AuditLog(
        actor_user_id=actor_user_id,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        metadata_json=metadata or {},
    )
    db.add(row)
    return row
