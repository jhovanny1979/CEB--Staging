from __future__ import annotations

from sqlalchemy.orm import Session

from app.models.entities import NotificationOutbox


def queue_notification(
    db: Session,
    *,
    user_id,
    business_id,
    notification_type: str,
    subject: str,
    body: str,
    payload: dict | None = None,
) -> NotificationOutbox:
    row = NotificationOutbox(
        user_id=user_id,
        business_id=business_id,
        type=notification_type,
        subject=subject,
        body=body,
        payload_json=payload or {},
    )
    db.add(row)
    return row
