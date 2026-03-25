from __future__ import annotations

from datetime import UTC, datetime
import uuid

from sqlalchemy import (
    JSON,
    Boolean,
    Date,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    String,
    Text,
    Time,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.enums import (
    NotificationStatusEnum,
    PromotionStatusEnum,
    ReceiptStatusEnum,
    RoleEnum,
    SubscriptionStatusEnum,
)


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(UTC))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), onupdate=lambda: datetime.now(UTC)
    )


class User(Base, TimestampMixin):
    __tablename__ = 'users'

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    full_name: Mapped[str] = mapped_column(String(255))
    role: Mapped[RoleEnum] = mapped_column(Enum(RoleEnum), default=RoleEnum.client)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_email_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    last_login_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class EmailVerificationToken(Base):
    __tablename__ = 'email_verification_tokens'

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey('users.id', ondelete='CASCADE'))
    token: Mapped[str] = mapped_column(String(128), unique=True, index=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    used_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(UTC))


class PasswordResetToken(Base):
    __tablename__ = 'password_reset_tokens'

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey('users.id', ondelete='CASCADE'))
    token: Mapped[str] = mapped_column(String(128), unique=True, index=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    used_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(UTC))


class Business(Base, TimestampMixin):
    __tablename__ = 'businesses'

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    owner_user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey('users.id', ondelete='CASCADE'), unique=True)
    slug: Mapped[str] = mapped_column(String(140), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(255))
    address: Mapped[str] = mapped_column(String(255), default='')
    locality: Mapped[str] = mapped_column(String(120), default='')
    category: Mapped[str] = mapped_column(String(120), default='')
    description: Mapped[str] = mapped_column(Text, default='')
    whatsapp: Mapped[str] = mapped_column(String(40), default='')
    instagram: Mapped[str] = mapped_column(String(255), default='')
    facebook: Mapped[str] = mapped_column(String(255), default='')
    youtube: Mapped[str] = mapped_column(String(255), default='')
    has_delivery: Mapped[bool] = mapped_column(Boolean, default=False)
    logo_path: Mapped[str] = mapped_column(String(255), default='')
    published: Mapped[bool] = mapped_column(Boolean, default=False)

    owner: Mapped[User] = relationship(User)


class BusinessHour(Base):
    __tablename__ = 'business_hours'
    __table_args__ = (UniqueConstraint('business_id', 'day_of_week', name='uq_business_day'),)

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    business_id: Mapped[uuid.UUID] = mapped_column(ForeignKey('businesses.id', ondelete='CASCADE'))
    day_of_week: Mapped[int] = mapped_column(Integer)
    is_open: Mapped[bool] = mapped_column(Boolean, default=True)
    open_time: Mapped[datetime | None] = mapped_column(Time, nullable=True)
    close_time: Mapped[datetime | None] = mapped_column(Time, nullable=True)


class BusinessImage(Base):
    __tablename__ = 'business_images'
    __table_args__ = (UniqueConstraint('business_id', 'position', name='uq_business_image_position'),)

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    business_id: Mapped[uuid.UUID] = mapped_column(ForeignKey('businesses.id', ondelete='CASCADE'), index=True)
    file_path: Mapped[str] = mapped_column(String(255))
    position: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(UTC))


class Promotion(Base, TimestampMixin):
    __tablename__ = 'promotions'

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    business_id: Mapped[uuid.UUID] = mapped_column(ForeignKey('businesses.id', ondelete='CASCADE'), index=True)
    title: Mapped[str] = mapped_column(String(180))
    content_html: Mapped[str] = mapped_column(Text)
    image_path: Mapped[str] = mapped_column(String(255), default='')
    status: Mapped[PromotionStatusEnum] = mapped_column(Enum(PromotionStatusEnum), default=PromotionStatusEnum.draft)
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    starts_at: Mapped[Date | None] = mapped_column(Date, nullable=True)
    ends_at: Mapped[Date | None] = mapped_column(Date, nullable=True)
    relaunch_count: Mapped[int] = mapped_column(Integer, default=0)


class PromotionImage(Base, TimestampMixin):
    __tablename__ = 'promotion_images'
    __table_args__ = (UniqueConstraint('promotion_id', 'position', name='uq_promotion_image_position'),)

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    promotion_id: Mapped[uuid.UUID] = mapped_column(ForeignKey('promotions.id', ondelete='CASCADE'), index=True)
    file_path: Mapped[str] = mapped_column(String(255))
    description: Mapped[str] = mapped_column(Text, default='')
    position: Mapped[int] = mapped_column(Integer, default=0)


class WAContact(Base, TimestampMixin):
    __tablename__ = 'wa_contacts'
    __table_args__ = (UniqueConstraint('business_id', 'phone', name='uq_wa_contact_business_phone'),)

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    business_id: Mapped[uuid.UUID] = mapped_column(ForeignKey('businesses.id', ondelete='CASCADE'), index=True)
    name: Mapped[str] = mapped_column(String(255))
    email: Mapped[str] = mapped_column(String(255), default='')
    phone: Mapped[str] = mapped_column(String(40))


class WAPromotionTemplate(Base, TimestampMixin):
    __tablename__ = 'wa_promotion_templates'

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    business_id: Mapped[uuid.UUID] = mapped_column(ForeignKey('businesses.id', ondelete='CASCADE'), index=True)
    emoji: Mapped[str] = mapped_column(String(16), default='🔥')
    title: Mapped[str] = mapped_column(String(180))
    message_text: Mapped[str] = mapped_column(Text)
    image_path: Mapped[str] = mapped_column(String(255), default='')


class WAPromotionSend(Base):
    __tablename__ = 'wa_promotion_sends'
    __table_args__ = (UniqueConstraint('template_id', 'contact_id', name='uq_wa_template_contact'),)

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    business_id: Mapped[uuid.UUID] = mapped_column(ForeignKey('businesses.id', ondelete='CASCADE'), index=True)
    template_id: Mapped[uuid.UUID] = mapped_column(ForeignKey('wa_promotion_templates.id', ondelete='CASCADE'), index=True)
    contact_id: Mapped[uuid.UUID] = mapped_column(ForeignKey('wa_contacts.id', ondelete='CASCADE'), index=True)
    sent_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(UTC))


class SubscriptionPlan(Base):
    __tablename__ = 'subscription_plans'

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    code: Mapped[str] = mapped_column(String(50), unique=True)
    name: Mapped[str] = mapped_column(String(120))
    months: Mapped[int] = mapped_column(Integer)
    price_cop: Mapped[int] = mapped_column(Integer)
    max_images: Mapped[int] = mapped_column(Integer, default=10)
    max_promotions_month: Mapped[int] = mapped_column(Integer, default=4)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(UTC))


class PlatformSetting(Base, TimestampMixin):
    __tablename__ = 'platform_settings'

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    trial_days: Mapped[int] = mapped_column(Integer, default=30)
    expiry_notice_days: Mapped[int] = mapped_column(Integer, default=5)
    notify_expiration_alert: Mapped[bool] = mapped_column(Boolean, default=True)
    notify_new_registration: Mapped[bool] = mapped_column(Boolean, default=True)
    notify_payment_confirmation: Mapped[bool] = mapped_column(Boolean, default=False)
    notify_weekly_summary: Mapped[bool] = mapped_column(Boolean, default=True)


class Subscription(Base, TimestampMixin):
    __tablename__ = 'subscriptions'

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    business_id: Mapped[uuid.UUID] = mapped_column(ForeignKey('businesses.id', ondelete='CASCADE'), index=True)
    plan_id: Mapped[uuid.UUID] = mapped_column(ForeignKey('subscription_plans.id'))
    status: Mapped[SubscriptionStatusEnum] = mapped_column(Enum(SubscriptionStatusEnum), default=SubscriptionStatusEnum.pending)
    source: Mapped[str] = mapped_column(String(60), default='manual_payment')
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(UTC))
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    approved_by_user_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey('users.id'), nullable=True)


class PromoCode(Base):
    __tablename__ = 'promo_codes'

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    code: Mapped[str] = mapped_column(String(40), unique=True, index=True)
    trial_days: Mapped[int] = mapped_column(Integer, default=30)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_by_user_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey('users.id'), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(UTC))


class PromoCodeRedemption(Base):
    __tablename__ = 'promo_code_redemptions'
    __table_args__ = (UniqueConstraint('promo_code_id', 'business_id', name='uq_code_business'),)

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    promo_code_id: Mapped[uuid.UUID] = mapped_column(ForeignKey('promo_codes.id', ondelete='CASCADE'))
    business_id: Mapped[uuid.UUID] = mapped_column(ForeignKey('businesses.id', ondelete='CASCADE'))
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey('users.id', ondelete='CASCADE'))
    subscription_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey('subscriptions.id'), nullable=True)
    redeemed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(UTC))


class PaymentReceipt(Base):
    __tablename__ = 'payment_receipts'

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    business_id: Mapped[uuid.UUID] = mapped_column(ForeignKey('businesses.id', ondelete='CASCADE'), index=True)
    subscription_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey('subscriptions.id'), nullable=True)
    plan_id: Mapped[uuid.UUID] = mapped_column(ForeignKey('subscription_plans.id'))
    amount_cop: Mapped[int] = mapped_column(Integer)
    payment_method: Mapped[str] = mapped_column(String(60), default='manual')
    support_file_path: Mapped[str] = mapped_column(String(255), default='')
    notes: Mapped[str] = mapped_column(Text, default='')
    status: Mapped[ReceiptStatusEnum] = mapped_column(Enum(ReceiptStatusEnum), default=ReceiptStatusEnum.pending)
    submitted_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(UTC))
    decided_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    decided_by_user_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey('users.id'), nullable=True)
    rejection_reason: Mapped[str] = mapped_column(String(255), default='')


class NotificationOutbox(Base):
    __tablename__ = 'notification_outbox'

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey('users.id', ondelete='CASCADE'))
    business_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey('businesses.id'), nullable=True)
    type: Mapped[str] = mapped_column(String(80))
    subject: Mapped[str] = mapped_column(String(255))
    body: Mapped[str] = mapped_column(Text)
    status: Mapped[NotificationStatusEnum] = mapped_column(Enum(NotificationStatusEnum), default=NotificationStatusEnum.pending)
    payload_json: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(UTC))
    sent_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class AuditLog(Base):
    __tablename__ = 'audit_logs'

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    actor_user_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey('users.id'), nullable=True)
    action: Mapped[str] = mapped_column(String(120), index=True)
    entity_type: Mapped[str] = mapped_column(String(120), default='')
    entity_id: Mapped[str] = mapped_column(String(80), default='')
    metadata_json: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(UTC))
