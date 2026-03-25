from enum import Enum


class RoleEnum(str, Enum):
    client = 'client'
    admin = 'admin'


class SubscriptionStatusEnum(str, Enum):
    trial = 'trial'
    pending = 'pending'
    active = 'active'
    expired = 'expired'
    cancelled = 'cancelled'


class PromotionStatusEnum(str, Enum):
    draft = 'draft'
    published = 'published'
    expired = 'expired'


class ReceiptStatusEnum(str, Enum):
    pending = 'pending'
    approved = 'approved'
    rejected = 'rejected'


class NotificationStatusEnum(str, Enum):
    pending = 'pending'
    sent = 'sent'
    failed = 'failed'
