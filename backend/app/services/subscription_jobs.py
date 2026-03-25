from __future__ import annotations

from datetime import UTC, datetime, timedelta

from sqlalchemy import and_, func, select
from sqlalchemy.orm import Session

from app.models.entities import AuditLog, Business, NotificationOutbox, Subscription
from app.models.enums import SubscriptionStatusEnum
from app.services.notifications import queue_notification
from app.services.platform_settings import get_platform_settings_row


def queue_expiration_reminders(db: Session) -> int:
    settings = get_platform_settings_row(db)
    if not bool(settings.notify_expiration_alert):
        return 0

    notice_days = max(1, int(settings.expiry_notice_days or 5))
    today = datetime.now(UTC).date()
    target = today + timedelta(days=notice_days)

    stmt = select(Subscription).where(
        and_(Subscription.status == SubscriptionStatusEnum.active, func.date(Subscription.expires_at) == target)
    )
    due = db.scalars(stmt).all()
    total = 0

    for sub in due:
        already = db.scalar(
            select(func.count(AuditLog.id)).where(
                and_(AuditLog.action == 'subscription_reminder_queued', AuditLog.entity_id == str(sub.id))
            )
        )
        if already:
            continue

        business = db.get(Business, sub.business_id)
        if not business:
            continue

        queue_notification(
            db,
            user_id=business.owner_user_id,
            business_id=business.id,
            notification_type='subscription.expiring',
            subject='Tu suscripcion vence pronto',
            body=f'Tu suscripcion vence en {notice_days} dias. Actualizala para evitar interrupciones.',
            payload={'subscription_id': str(sub.id)},
        )
        db.add(
            AuditLog(
                actor_user_id=None,
                action='subscription_reminder_queued',
                entity_type='subscription',
                entity_id=str(sub.id),
                metadata_json={'target_date': str(target)},
            )
        )
        total += 1

    return total
