from __future__ import annotations

from datetime import date, datetime, time
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field


class MessageResponse(BaseModel):
    message: str


class UserOut(BaseModel):
    id: UUID
    email: str
    full_name: str
    role: str
    is_email_verified: bool


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = 'bearer'
    user: UserOut


class AuthRegisterIn(BaseModel):
    full_name: str = Field(min_length=2, max_length=255)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    business_name: str | None = Field(default=None, max_length=255)
    phone: str = Field(default='', max_length=40)
    address: str = Field(default='', max_length=255)
    locality: str = Field(default='', max_length=120)
    category: str = Field(default='', max_length=120)
    description: str = Field(default='', max_length=4000)


class AuthLoginIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


class AdminLoginIn(BaseModel):
    identifier: str | None = Field(default=None, min_length=2, max_length=255)
    email: EmailStr | None = None
    password: str = Field(min_length=8, max_length=128)


class VerifyEmailIn(BaseModel):
    token: str


class RecoverIn(BaseModel):
    recovery_type: Literal['usuario', 'contrasena', 'cuenta']
    identifier: str = Field(min_length=2, max_length=255)


class ResetPasswordIn(BaseModel):
    token: str
    new_password: str = Field(min_length=8, max_length=128)


class BusinessHourIn(BaseModel):
    day_of_week: int = Field(ge=0, le=6)
    is_open: bool = True
    open_time: time | None = None
    close_time: time | None = None


class BusinessIn(BaseModel):
    name: str = Field(min_length=2, max_length=255)
    address: str = ''
    locality: str = ''
    category: str = ''
    description: str = ''
    whatsapp: str = ''
    instagram: str = ''
    facebook: str = ''
    youtube: str = ''
    has_delivery: bool = False
    logo_path: str = ''
    published: bool = False
    hours: list[BusinessHourIn] = Field(default_factory=list)


class BusinessHourOut(BusinessHourIn):
    id: UUID


class BusinessImageOut(BaseModel):
    id: UUID
    file_path: str
    position: int


class FilePathOut(BaseModel):
    file_path: str


class BusinessOut(BaseModel):
    id: UUID
    owner_user_id: UUID
    slug: str
    name: str
    address: str
    locality: str
    category: str
    description: str
    whatsapp: str
    instagram: str
    facebook: str
    youtube: str
    has_delivery: bool
    logo_path: str
    published: bool
    hours: list[BusinessHourOut] = Field(default_factory=list)
    images: list[BusinessImageOut] = Field(default_factory=list)


class PromotionCreateIn(BaseModel):
    title: str = Field(min_length=3, max_length=180)
    content_html: str = Field(min_length=3)
    image_path: str = ''
    images: list['PromotionImageIn'] = Field(default_factory=list)
    starts_at: date | None = None
    ends_at: date | None = None


class PromotionUpdateIn(BaseModel):
    title: str = Field(min_length=3, max_length=180)
    content_html: str = Field(min_length=3)
    image_path: str = ''
    images: list['PromotionImageIn'] = Field(default_factory=list)
    starts_at: date | None = None
    ends_at: date | None = None


class PromotionImageIn(BaseModel):
    file_path: str = Field(min_length=1, max_length=255)
    description: str = Field(default='', max_length=500)


class PromotionImageOut(BaseModel):
    file_path: str
    description: str = ''
    position: int = 0


class PromotionOut(BaseModel):
    id: UUID
    business_id: UUID
    title: str
    content_html: str
    image_path: str
    images: list[PromotionImageOut] = Field(default_factory=list)
    status: str
    published_at: datetime | None
    starts_at: date | None
    ends_at: date | None
    relaunch_count: int


class WAContactIn(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    email: str = Field(default='', max_length=255)
    phone: str = Field(min_length=7, max_length=40)


class WAContactOut(BaseModel):
    id: UUID
    business_id: UUID
    name: str
    email: str
    phone: str
    created_at: datetime
    updated_at: datetime


class WAPromotionIn(BaseModel):
    emoji: str = Field(default='🔥', min_length=1, max_length=16)
    title: str = Field(min_length=1, max_length=180)
    msg: str = Field(min_length=1)
    image_path: str = ''


class WAPromotionOut(BaseModel):
    id: UUID
    business_id: UUID
    emoji: str
    title: str
    msg: str
    image_path: str
    created_at: datetime
    updated_at: datetime


class WASendLogIn(BaseModel):
    promo_id: UUID
    contact_id: UUID


class WASendLogOut(BaseModel):
    id: UUID
    business_id: UUID
    promo_id: UUID
    contact_id: UUID
    sent_at: datetime


class PlanOut(BaseModel):
    id: UUID
    code: str
    name: str
    months: int
    price_cop: int
    max_images: int
    max_promotions_month: int


class CurrentSubscriptionOut(BaseModel):
    status: str
    plan_name: str
    plan_code: str
    price_cop: int
    max_images: int
    max_promotions_month: int
    started_at: datetime | None
    expires_at: datetime | None
    is_trial: bool
    trial_days: int | None = None


class AdminPlanUpdateIn(BaseModel):
    id: UUID
    price_cop: int = Field(ge=0)


class AdminLimitsUpdateIn(BaseModel):
    max_images: int = Field(ge=1, le=1000)
    max_promotions_month: int = Field(ge=1, le=1000)


class PlatformSettingsOut(BaseModel):
    trial_days: int
    expiry_notice_days: int
    notify_expiration_alert: bool
    notify_new_registration: bool
    notify_payment_confirmation: bool
    notify_weekly_summary: bool


class AdminPlatformSettingsIn(BaseModel):
    trial_days: int = Field(ge=1, le=365)
    expiry_notice_days: int = Field(ge=1, le=365)
    notify_expiration_alert: bool
    notify_new_registration: bool
    notify_payment_confirmation: bool
    notify_weekly_summary: bool


class ActivateCodeIn(BaseModel):
    code: str = Field(min_length=4, max_length=40)


class SubscriptionUpgradeIn(BaseModel):
    plan_id: UUID
    payment_method: str = Field(min_length=2, max_length=60)
    notes: str = ''


class PaymentReceiptCreateIn(BaseModel):
    plan_id: UUID
    amount_cop: int = Field(gt=0)
    payment_method: str = Field(min_length=2, max_length=60)
    notes: str = ''


class ReceiptOut(BaseModel):
    id: UUID
    business_id: UUID
    plan_id: UUID
    amount_cop: int
    payment_method: str
    support_file_path: str
    notes: str
    status: str
    submitted_at: datetime
    decided_at: datetime | None
    rejection_reason: str


class ReceiptDecisionIn(BaseModel):
    reason: str = ''


class PromoCodeCreateIn(BaseModel):
    code: str = Field(min_length=4, max_length=40)
    trial_days: int = Field(default=30, ge=1, le=90)


class AdminCreateIn(BaseModel):
    email: EmailStr
    full_name: str = Field(min_length=2, max_length=255)
    password: str = Field(min_length=8, max_length=128)


class AdminBusinessOut(BaseModel):
    id: UUID
    owner_user_id: UUID
    owner_email: str
    owner_full_name: str
    slug: str
    name: str
    category: str
    locality: str
    created_at: datetime
    subscription_status: str
    subscription_plan: str
    subscription_expires_at: datetime | None


class AdminClientOut(BaseModel):
    id: UUID
    email: str
    full_name: str
    created_at: datetime
    is_active: bool
    is_email_verified: bool
    business_id: UUID | None
    business_name: str | None
    subscription_status: str | None


class AdminPromotionOut(BaseModel):
    id: UUID
    business_id: UUID
    business_name: str
    business_slug: str
    owner_email: str
    title: str
    status: str
    created_at: datetime
    published_at: datetime | None


class PromoCodeOut(BaseModel):
    id: UUID
    code: str
    trial_days: int
    is_active: bool
    expires_at: datetime | None


class DashboardOut(BaseModel):
    total_businesses: int
    active_subscriptions: int
    pending_receipts: int
    published_promotions: int


class AuditOut(BaseModel):
    id: UUID
    actor_user_id: UUID | None
    action: str
    entity_type: str
    entity_id: str
    metadata_json: dict
    created_at: datetime


class OutboxOut(BaseModel):
    id: UUID
    user_id: UUID
    business_id: UUID | None
    type: str
    subject: str
    body: str
    status: str
    payload_json: dict
    created_at: datetime


class PublicBusinessCardOut(BaseModel):
    slug: str
    name: str
    category: str
    locality: str
    logo_path: str
    published: bool


class PublicBusinessOut(BaseModel):
    slug: str
    name: str
    address: str
    locality: str
    category: str
    description: str
    whatsapp: str
    instagram: str
    facebook: str
    youtube: str
    has_delivery: bool
    logo_path: str
    published: bool
    gallery: list[str] = Field(default_factory=list)
    hours: list[BusinessHourOut] = Field(default_factory=list)
    promotions: list[PromotionOut] = Field(default_factory=list)

