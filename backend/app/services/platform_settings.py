from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.entities import PlatformSetting
from app.schemas.api import PlatformSettingsOut


def get_platform_settings_row(db: Session) -> PlatformSetting:
    row = db.scalar(select(PlatformSetting).order_by(PlatformSetting.created_at.asc()))
    if row:
        return row

    row = PlatformSetting(
        trial_days=30,
        expiry_notice_days=5,
        notify_expiration_alert=True,
        notify_new_registration=True,
        notify_payment_confirmation=False,
        notify_weekly_summary=True,
    )
    db.add(row)
    db.flush()
    return row


def serialize_platform_settings(row: PlatformSetting) -> PlatformSettingsOut:
    return PlatformSettingsOut(
        trial_days=int(row.trial_days or 30),
        expiry_notice_days=int(row.expiry_notice_days or 5),
        notify_expiration_alert=bool(row.notify_expiration_alert),
        notify_new_registration=bool(row.notify_new_registration),
        notify_payment_confirmation=bool(row.notify_payment_confirmation),
        notify_weekly_summary=bool(row.notify_weekly_summary),
    )

