from __future__ import annotations

from datetime import UTC, datetime, timedelta

from sqlalchemy import select

from app.core.security import hash_password, slugify
from app.db.session import SessionLocal
from app.models.entities import Business, PromoCode, SubscriptionPlan, User
from app.models.enums import RoleEnum

ADMIN_EMAIL = 'admin@comercioebogota.com'
ADMIN_LEGACY_EMAIL = 'admin@comercioebogota.test'
DEMO_EMAIL = 'demo@comercioebogota.com'
DEMO_LEGACY_EMAIL = 'demo@comercioebogota.test'


def seed_plans(db):
    plans = [
        ('PLAN_1M', 'Plan 1 Mes', 1, 25000),
        ('PLAN_3M', 'Plan 3 Meses', 3, 72000),
        ('PLAN_6M', 'Plan 6 Meses', 6, 138000),
        ('PLAN_12M', 'Plan 12 Meses', 12, 252000),
    ]
    for code, name, months, price in plans:
        row = db.scalar(select(SubscriptionPlan).where(SubscriptionPlan.code == code))
        if row:
            # Preserve admin-controlled configuration on restarts.
            if not row.name:
                row.name = name
            if not row.months or int(row.months) < 1:
                row.months = months
            if row.price_cop is None or int(row.price_cop) < 0:
                row.price_cop = price
            if row.max_images is None or int(row.max_images) < 1:
                row.max_images = 10
            if row.max_promotions_month is None or int(row.max_promotions_month) < 1:
                row.max_promotions_month = 4
            row.is_active = True
            continue
        db.add(
            SubscriptionPlan(
                code=code,
                name=name,
                months=months,
                price_cop=price,
                max_images=10,
                max_promotions_month=4,
                is_active=True,
            )
        )


def seed_admin(db):
    admin = db.scalar(select(User).where(User.email == ADMIN_EMAIL))
    legacy = db.scalar(select(User).where(User.email == ADMIN_LEGACY_EMAIL))

    if not admin and legacy:
        legacy.email = ADMIN_EMAIL
        admin = legacy

    if not admin:
        admin = User(
            email=ADMIN_EMAIL,
            password_hash=hash_password('admin123'),
            full_name='Administrador CEB',
            role=RoleEnum.admin,
            is_email_verified=True,
            is_active=True,
        )
        db.add(admin)
        return

    # Keep a deterministic local admin for quick panel access.
    admin.password_hash = hash_password('admin123')
    admin.role = RoleEnum.admin
    admin.is_active = True
    admin.is_email_verified = True


def seed_demo_business(db):
    user = db.scalar(select(User).where(User.email == DEMO_EMAIL))
    legacy = db.scalar(select(User).where(User.email == DEMO_LEGACY_EMAIL))

    if not user and legacy:
        legacy.email = DEMO_EMAIL
        user = legacy

    if not user:
        user = User(
            email=DEMO_EMAIL,
            password_hash=hash_password('Demo12345!'),
            full_name='Demo Negocio',
            role=RoleEnum.client,
            is_email_verified=True,
        )
        db.add(user)
        db.flush()

    business = db.scalar(select(Business).where(Business.owner_user_id == user.id))
    if not business:
        db.add(
            Business(
                owner_user_id=user.id,
                slug=slugify('Panaderia San Jose'),
                name='Panaderia San Jose',
                address='Cll 38A Sur 79 12',
                locality='Kennedy',
                category='Panaderias',
                description='Negocio demo para pruebas de frontend y API.',
                whatsapp='3101234567',
                has_delivery=True,
                published=True,
            )
        )


def seed_promo_codes(db):
    for code in ['DEMO30D1', 'PROMO2024', 'BOGO2024A']:
        row = db.scalar(select(PromoCode).where(PromoCode.code == code))
        if row:
            continue
        db.add(
            PromoCode(
                code=code,
                trial_days=30,
                is_active=True,
                expires_at=datetime.now(UTC) + timedelta(days=365),
            )
        )


def main() -> None:
    db = SessionLocal()
    try:
        seed_plans(db)
        seed_admin(db)
        seed_demo_business(db)
        seed_promo_codes(db)
        db.commit()
        print('Seed completed successfully.')
    except Exception as exc:  # noqa: BLE001
        db.rollback()
        raise SystemExit(f'Seed failed: {exc}') from exc
    finally:
        db.close()


if __name__ == '__main__':
    main()
