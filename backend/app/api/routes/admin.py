from __future__ import annotations

from datetime import UTC, datetime, timedelta
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.deps import get_current_admin
from app.core.security import create_access_token, create_refresh_token, hash_password, verify_password
from app.db.session import get_db
from app.models.entities import (
    AuditLog,
    Business,
    NotificationOutbox,
    PaymentReceipt,
    PromoCode,
    Promotion,
    Subscription,
    SubscriptionPlan,
    User,
)
from app.models.enums import PromotionStatusEnum, ReceiptStatusEnum, RoleEnum, SubscriptionStatusEnum
from app.schemas.api import (
    AdminBusinessOut,
    AdminClientOut,
    AdminCreateIn,
    AdminLimitsUpdateIn,
    AdminLoginIn,
    AdminPlatformSettingsIn,
    AdminPlanUpdateIn,
    AdminPromotionOut,
    AuditOut,
    DashboardOut,
    MessageResponse,
    OutboxOut,
    PlanOut,
    PlatformSettingsOut,
    PromoCodeCreateIn,
    PromoCodeOut,
    ReceiptDecisionIn,
    ReceiptOut,
    TokenResponse,
    UserOut,
)
from app.services.audit import log_action
from app.services.notifications import queue_notification
from app.services.platform_settings import get_platform_settings_row, serialize_platform_settings

router = APIRouter()

DEFAULT_PLAN_CATALOG: list[tuple[str, str, int, int]] = [
    ('PLAN_1M', 'Plan 1 Mes', 1, 25000),
    ('PLAN_3M', 'Plan 3 Meses', 3, 72000),
    ('PLAN_6M', 'Plan 6 Meses', 6, 138000),
    ('PLAN_12M', 'Plan 12 Meses', 12, 252000),
]


def _user_out(user: User) -> UserOut:
    return UserOut(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        role=user.role.value,
        is_email_verified=user.is_email_verified,
    )


def _admin_by_identifier(db: Session, identifier: str) -> User | None:
    ident = identifier.strip().lower()
    if not ident:
        return None

    if '@' in ident:
        return db.scalar(select(User).where(func.lower(User.email) == ident))

    admins = db.scalars(select(User).where(User.role == RoleEnum.admin).order_by(User.created_at.asc())).all()
    if not admins:
        return None

    for cand in admins:
        prefix = (cand.email or '').split('@', 1)[0].lower()
        if prefix == ident:
            return cand

    if ident in {'admin', 'administrador'}:
        return admins[0]

    return None


def _latest_subscriptions_by_business(db: Session, business_ids: set[UUID]) -> dict[UUID, Subscription]:
    if not business_ids:
        return {}

    rows = db.scalars(
        select(Subscription)
        .where(Subscription.business_id.in_(business_ids))
        .order_by(Subscription.business_id.asc(), Subscription.created_at.desc())
    ).all()

    latest: dict[UUID, Subscription] = {}
    for row in rows:
        if row.business_id not in latest:
            latest[row.business_id] = row
    return latest


def _plan_map(db: Session, plan_ids: set[UUID]) -> dict[UUID, SubscriptionPlan]:
    if not plan_ids:
        return {}
    rows = db.scalars(select(SubscriptionPlan).where(SubscriptionPlan.id.in_(plan_ids))).all()
    return {p.id: p for p in rows}


def _plan_out(row: SubscriptionPlan) -> PlanOut:
    return PlanOut(
        id=row.id,
        code=row.code,
        name=row.name,
        months=row.months,
        price_cop=row.price_cop,
        max_images=row.max_images,
        max_promotions_month=row.max_promotions_month,
    )


def _active_plans(db: Session) -> list[SubscriptionPlan]:
    rows = db.scalars(
        select(SubscriptionPlan)
        .where(SubscriptionPlan.is_active.is_(True))
        .order_by(SubscriptionPlan.months.asc(), SubscriptionPlan.code.asc())
    ).all()
    if rows:
        return rows

    # Local resilience: if no active plans exist, bootstrap from existing rows
    # by months (legacy codes) or create the default catalog.
    existing = db.scalars(select(SubscriptionPlan).order_by(SubscriptionPlan.months.asc(), SubscriptionPlan.created_at.asc())).all()
    by_months: dict[int, SubscriptionPlan] = {}
    for row in existing:
        month_key = int(row.months or 0)
        if month_key > 0 and month_key not in by_months:
            by_months[month_key] = row

    changed = False
    for code, name, months, price in DEFAULT_PLAN_CATALOG:
        row = by_months.get(months)
        if row is None:
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
            changed = True
            continue

        if not row.is_active:
            row.is_active = True
            changed = True
        if row.max_images is None or int(row.max_images) < 1:
            row.max_images = 10
            changed = True
        if row.max_promotions_month is None or int(row.max_promotions_month) < 1:
            row.max_promotions_month = 4
            changed = True
        if not row.name:
            row.name = name
            changed = True

    if changed:
        db.commit()

    return db.scalars(
        select(SubscriptionPlan)
        .where(SubscriptionPlan.is_active.is_(True))
        .order_by(SubscriptionPlan.months.asc(), SubscriptionPlan.code.asc())
    ).all()


def _managed_plans(db: Session) -> list[SubscriptionPlan]:
    rows = db.scalars(
        select(SubscriptionPlan)
        .where(
            SubscriptionPlan.is_active.is_(True),
            SubscriptionPlan.price_cop > 0,
            ~SubscriptionPlan.code.ilike('TRIAL%'),
        )
        .order_by(SubscriptionPlan.months.asc(), SubscriptionPlan.code.asc())
    ).all()
    return rows


@router.post('/login', response_model=TokenResponse)
def admin_login(payload: AdminLoginIn, db: Session = Depends(get_db)) -> TokenResponse:
    identifier = (payload.identifier or payload.email or '').strip()
    if not identifier:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail='Debes enviar email o identifier')

    user = _admin_by_identifier(db, identifier)
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='Credenciales invalidas')
    if user.role != RoleEnum.admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail='No eres administrador')

    access_token = create_access_token(str(user.id), user.role.value)
    refresh_token = create_refresh_token(str(user.id), user.role.value)
    log_action(db, actor_user_id=user.id, action='admin_login', entity_type='user', entity_id=str(user.id))
    db.commit()
    return TokenResponse(access_token=access_token, refresh_token=refresh_token, user=_user_out(user))


@router.get('/users', response_model=list[UserOut])
def list_admin_users(db: Session = Depends(get_db), admin: User = Depends(get_current_admin)) -> list[UserOut]:
    rows = db.scalars(select(User).where(User.role == RoleEnum.admin).order_by(User.created_at.asc())).all()
    return [_user_out(u) for u in rows]


@router.get('/plans', response_model=list[PlanOut])
def list_admin_plans(db: Session = Depends(get_db), admin: User = Depends(get_current_admin)) -> list[PlanOut]:
    rows = _managed_plans(db)
    return [_plan_out(r) for r in rows]


@router.put('/plans', response_model=list[PlanOut])
def update_admin_plans(
    payload: list[AdminPlanUpdateIn],
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
) -> list[PlanOut]:
    if not payload:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='No enviaste planes para actualizar')

    managed_ids = {str(p.id) for p in _managed_plans(db)}
    if not managed_ids:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='No hay planes administrables')

    changed = 0
    for item in payload:
        row = db.get(SubscriptionPlan, item.id)
        if not row or not row.is_active or str(row.id) not in managed_ids:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Plan no encontrado')
        row.price_cop = int(item.price_cop)
        changed += 1

    log_action(
        db,
        actor_user_id=admin.id,
        action='admin_plan_prices_update',
        entity_type='subscription_plan',
        entity_id='bulk',
        metadata={'count': changed},
    )
    db.commit()
    rows = _managed_plans(db)
    return [_plan_out(r) for r in rows]


@router.put('/limits', response_model=MessageResponse)
def update_admin_limits(
    payload: AdminLimitsUpdateIn,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
) -> MessageResponse:
    rows = _managed_plans(db)
    if not rows:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='No hay planes activos')

    for row in rows:
        row.max_images = int(payload.max_images)
        row.max_promotions_month = int(payload.max_promotions_month)

    log_action(
        db,
        actor_user_id=admin.id,
        action='admin_platform_limits_update',
        entity_type='subscription_plan',
        entity_id='bulk',
        metadata={
            'max_images': int(payload.max_images),
            'max_promotions_month': int(payload.max_promotions_month),
            'count': len(rows),
        },
    )
    db.commit()
    return MessageResponse(message='Limites actualizados correctamente')


@router.get('/platform-settings', response_model=PlatformSettingsOut)
def get_admin_platform_settings(db: Session = Depends(get_db), admin: User = Depends(get_current_admin)) -> PlatformSettingsOut:
    row = get_platform_settings_row(db)
    db.commit()
    return serialize_platform_settings(row)


@router.put('/platform-settings', response_model=PlatformSettingsOut)
def update_admin_platform_settings(
    payload: AdminPlatformSettingsIn,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
) -> PlatformSettingsOut:
    row = get_platform_settings_row(db)
    row.trial_days = int(payload.trial_days)
    row.expiry_notice_days = int(payload.expiry_notice_days)
    row.notify_expiration_alert = bool(payload.notify_expiration_alert)
    row.notify_new_registration = bool(payload.notify_new_registration)
    row.notify_payment_confirmation = bool(payload.notify_payment_confirmation)
    row.notify_weekly_summary = bool(payload.notify_weekly_summary)

    log_action(
        db,
        actor_user_id=admin.id,
        action='admin_platform_settings_update',
        entity_type='platform_settings',
        entity_id=str(row.id),
        metadata={
            'trial_days': row.trial_days,
            'expiry_notice_days': row.expiry_notice_days,
            'notify_expiration_alert': row.notify_expiration_alert,
            'notify_new_registration': row.notify_new_registration,
            'notify_payment_confirmation': row.notify_payment_confirmation,
            'notify_weekly_summary': row.notify_weekly_summary,
        },
    )
    db.commit()
    db.refresh(row)
    return serialize_platform_settings(row)


@router.post('/users', response_model=UserOut)
def create_admin_user(
    payload: AdminCreateIn,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
) -> UserOut:
    email = payload.email.strip().lower()
    exists = db.scalar(select(func.count(User.id)).where(func.lower(User.email) == email))
    if exists:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Ya existe un usuario con ese correo')

    user = User(
        email=email,
        password_hash=hash_password(payload.password),
        full_name=payload.full_name.strip(),
        role=RoleEnum.admin,
        is_active=True,
        is_email_verified=True,
    )
    db.add(user)
    db.flush()
    log_action(db, actor_user_id=admin.id, action='admin_user_create', entity_type='user', entity_id=str(user.id))
    db.commit()
    db.refresh(user)
    return _user_out(user)


@router.delete('/users/{user_id}', response_model=MessageResponse)
def delete_admin_user(user_id: UUID, db: Session = Depends(get_db), admin: User = Depends(get_current_admin)) -> MessageResponse:
    target = db.get(User, user_id)
    if not target or target.role != RoleEnum.admin:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Administrador no encontrado')

    if target.id == admin.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='No puedes eliminar tu propio usuario administrador')

    total_admins = db.scalar(select(func.count(User.id)).where(User.role == RoleEnum.admin)) or 0
    if total_admins <= 1:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='No puedes eliminar el ultimo administrador')

    log_action(db, actor_user_id=admin.id, action='admin_user_delete', entity_type='user', entity_id=str(target.id))
    db.delete(target)
    db.commit()
    return MessageResponse(message='Administrador eliminado correctamente')


@router.get('/businesses', response_model=list[AdminBusinessOut])
def list_businesses(db: Session = Depends(get_db), admin: User = Depends(get_current_admin)) -> list[AdminBusinessOut]:
    rows = db.scalars(select(Business).order_by(Business.created_at.desc())).all()
    if not rows:
        return []

    owner_ids = {r.owner_user_id for r in rows}
    owners = db.scalars(select(User).where(User.id.in_(owner_ids))).all()
    owner_map = {u.id: u for u in owners}

    business_ids = {r.id for r in rows}
    latest_subs = _latest_subscriptions_by_business(db, business_ids)
    plan_ids = {s.plan_id for s in latest_subs.values()}
    plans = _plan_map(db, plan_ids)

    payload: list[AdminBusinessOut] = []
    for row in rows:
        owner = owner_map.get(row.owner_user_id)
        sub = latest_subs.get(row.id)
        plan = plans.get(sub.plan_id) if sub else None
        payload.append(
            AdminBusinessOut(
                id=row.id,
                owner_user_id=row.owner_user_id,
                owner_email=(owner.email if owner else ''),
                owner_full_name=(owner.full_name if owner else ''),
                slug=row.slug,
                name=row.name,
                category=row.category,
                locality=row.locality,
                created_at=row.created_at,
                subscription_status=(sub.status.value if sub else 'none'),
                subscription_plan=(plan.name if plan else 'Sin plan'),
                subscription_expires_at=(sub.expires_at if sub else None),
            )
        )
    return payload


@router.get('/clients', response_model=list[AdminClientOut])
def list_clients(db: Session = Depends(get_db), admin: User = Depends(get_current_admin)) -> list[AdminClientOut]:
    clients = db.scalars(select(User).where(User.role == RoleEnum.client).order_by(User.created_at.desc())).all()
    if not clients:
        return []

    user_ids = {u.id for u in clients}
    businesses = db.scalars(select(Business).where(Business.owner_user_id.in_(user_ids))).all()
    business_by_owner = {b.owner_user_id: b for b in businesses}

    business_ids = {b.id for b in businesses}
    latest_subs = _latest_subscriptions_by_business(db, business_ids)

    payload: list[AdminClientOut] = []
    for client_user in clients:
        biz = business_by_owner.get(client_user.id)
        sub = latest_subs.get(biz.id) if biz else None
        payload.append(
            AdminClientOut(
                id=client_user.id,
                email=client_user.email,
                full_name=client_user.full_name,
                created_at=client_user.created_at,
                is_active=client_user.is_active,
                is_email_verified=client_user.is_email_verified,
                business_id=(biz.id if biz else None),
                business_name=(biz.name if biz else None),
                subscription_status=(sub.status.value if sub else None),
            )
        )
    return payload


@router.get('/promotions', response_model=list[AdminPromotionOut])
def list_promotions(limit: int = 200, db: Session = Depends(get_db), admin: User = Depends(get_current_admin)) -> list[AdminPromotionOut]:
    rows = db.scalars(select(Promotion).order_by(Promotion.created_at.desc()).limit(min(limit, 500))).all()
    if not rows:
        return []

    business_ids = {r.business_id for r in rows}
    businesses = db.scalars(select(Business).where(Business.id.in_(business_ids))).all()
    business_map = {b.id: b for b in businesses}

    owner_ids = {b.owner_user_id for b in businesses}
    owners = db.scalars(select(User).where(User.id.in_(owner_ids))).all()
    owner_map = {o.id: o for o in owners}

    payload: list[AdminPromotionOut] = []
    for row in rows:
        biz = business_map.get(row.business_id)
        owner = owner_map.get(biz.owner_user_id) if biz else None
        payload.append(
            AdminPromotionOut(
                id=row.id,
                business_id=row.business_id,
                business_name=(biz.name if biz else ''),
                business_slug=(biz.slug if biz else ''),
                owner_email=(owner.email if owner else ''),
                title=row.title,
                status=row.status.value,
                created_at=row.created_at,
                published_at=row.published_at,
            )
        )
    return payload


@router.get('/receipts', response_model=list[ReceiptOut])
def list_receipts(
    status_filter: str = 'pending',
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
) -> list[ReceiptOut]:
    try:
        status_enum = ReceiptStatusEnum(status_filter)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Filtro invalido') from exc

    rows = db.scalars(
        select(PaymentReceipt)
        .where(PaymentReceipt.status == status_enum)
        .order_by(PaymentReceipt.submitted_at.desc())
    ).all()
    return [
        ReceiptOut(
            id=r.id,
            business_id=r.business_id,
            plan_id=r.plan_id,
            amount_cop=r.amount_cop,
            payment_method=r.payment_method,
            support_file_path=r.support_file_path,
            notes=r.notes,
            status=r.status.value,
            submitted_at=r.submitted_at,
            decided_at=r.decided_at,
            rejection_reason=r.rejection_reason,
        )
        for r in rows
    ]


@router.post('/receipts/{receipt_id}/approve', response_model=MessageResponse)
def approve_receipt(receipt_id: UUID, db: Session = Depends(get_db), admin: User = Depends(get_current_admin)) -> MessageResponse:
    receipt = db.get(PaymentReceipt, receipt_id)
    if not receipt:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Recaudo no encontrado')
    if receipt.status != ReceiptStatusEnum.pending:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Recaudo ya procesado')

    receipt.status = ReceiptStatusEnum.approved
    receipt.decided_at = datetime.now(UTC)
    receipt.decided_by_user_id = admin.id

    sub = db.get(Subscription, receipt.subscription_id) if receipt.subscription_id else None
    plan = db.get(SubscriptionPlan, receipt.plan_id)
    if sub and plan:
        sub.status = SubscriptionStatusEnum.active
        sub.started_at = datetime.now(UTC)
        sub.expires_at = datetime.now(UTC) + timedelta(days=30 * max(plan.months, 1))
        sub.approved_by_user_id = admin.id

    platform_settings = get_platform_settings_row(db)
    business = db.get(Business, receipt.business_id)
    if business and bool(platform_settings.notify_payment_confirmation):
        queue_notification(
            db,
            user_id=business.owner_user_id,
            business_id=business.id,
            notification_type='payment.approved',
            subject='Suscripcion aprobada',
            body='Tu pago fue aprobado y la suscripcion esta activa.',
            payload={'receipt_id': str(receipt.id)},
        )

    log_action(db, actor_user_id=admin.id, action='receipt_approve', entity_type='payment_receipt', entity_id=str(receipt.id))
    db.commit()
    return MessageResponse(message='Recaudo aprobado y suscripcion activada')


@router.post('/receipts/{receipt_id}/reject', response_model=MessageResponse)
def reject_receipt(
    receipt_id: UUID,
    payload: ReceiptDecisionIn,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
) -> MessageResponse:
    receipt = db.get(PaymentReceipt, receipt_id)
    if not receipt:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Recaudo no encontrado')
    if receipt.status != ReceiptStatusEnum.pending:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Recaudo ya procesado')

    receipt.status = ReceiptStatusEnum.rejected
    receipt.decided_at = datetime.now(UTC)
    receipt.decided_by_user_id = admin.id
    receipt.rejection_reason = payload.reason

    if receipt.subscription_id:
        sub = db.get(Subscription, receipt.subscription_id)
        if sub:
            sub.status = SubscriptionStatusEnum.cancelled

    platform_settings = get_platform_settings_row(db)
    business = db.get(Business, receipt.business_id)
    if business and bool(platform_settings.notify_payment_confirmation):
        queue_notification(
            db,
            user_id=business.owner_user_id,
            business_id=business.id,
            notification_type='payment.rejected',
            subject='Recaudo rechazado',
            body='Tu solicitud de actualizacion fue rechazada. Revisa el detalle en soporte.',
            payload={'receipt_id': str(receipt.id), 'reason': payload.reason},
        )

    log_action(
        db,
        actor_user_id=admin.id,
        action='receipt_reject',
        entity_type='payment_receipt',
        entity_id=str(receipt.id),
        metadata={'reason': payload.reason},
    )
    db.commit()
    return MessageResponse(message='Recaudo rechazado')


@router.get('/dashboard', response_model=DashboardOut)
def dashboard(db: Session = Depends(get_db), admin: User = Depends(get_current_admin)) -> DashboardOut:
    total_businesses = db.scalar(select(func.count(Business.id))) or 0
    active_subscriptions = db.scalar(
        select(func.count(Subscription.id)).where(Subscription.status == SubscriptionStatusEnum.active)
    ) or 0
    pending_receipts = db.scalar(
        select(func.count(PaymentReceipt.id)).where(PaymentReceipt.status == ReceiptStatusEnum.pending)
    ) or 0
    published_promotions = db.scalar(
        select(func.count(Promotion.id)).where(Promotion.status == PromotionStatusEnum.published)
    ) or 0

    return DashboardOut(
        total_businesses=total_businesses,
        active_subscriptions=active_subscriptions,
        pending_receipts=pending_receipts,
        published_promotions=published_promotions,
    )


@router.get('/audit-logs', response_model=list[AuditOut])
def list_audit_logs(limit: int = 100, db: Session = Depends(get_db), admin: User = Depends(get_current_admin)) -> list[AuditOut]:
    rows = db.scalars(select(AuditLog).order_by(AuditLog.created_at.desc()).limit(min(limit, 500))).all()
    return [
        AuditOut(
            id=r.id,
            actor_user_id=r.actor_user_id,
            action=r.action,
            entity_type=r.entity_type,
            entity_id=r.entity_id,
            metadata_json=r.metadata_json,
            created_at=r.created_at,
        )
        for r in rows
    ]


@router.post('/promo-codes', response_model=PromoCodeOut)
def create_promo_code(payload: PromoCodeCreateIn, db: Session = Depends(get_db), admin: User = Depends(get_current_admin)) -> PromoCodeOut:
    exists = db.scalar(select(func.count(PromoCode.id)).where(PromoCode.code == payload.code.upper()))
    if exists:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Codigo ya existe')

    trial_days = int(payload.trial_days)
    if 'trial_days' not in payload.model_fields_set:
        trial_days = int(serialize_platform_settings(get_platform_settings_row(db)).trial_days or trial_days)

    code = PromoCode(code=payload.code.upper(), trial_days=trial_days, created_by_user_id=admin.id)
    db.add(code)
    log_action(db, actor_user_id=admin.id, action='promo_code_create', entity_type='promo_code', entity_id=str(code.id))
    db.commit()
    db.refresh(code)
    return PromoCodeOut(id=code.id, code=code.code, trial_days=code.trial_days, is_active=code.is_active, expires_at=code.expires_at)


@router.get('/outbox', response_model=list[OutboxOut])
def list_outbox(limit: int = 100, db: Session = Depends(get_db), admin: User = Depends(get_current_admin)) -> list[OutboxOut]:
    rows = db.scalars(select(NotificationOutbox).order_by(NotificationOutbox.created_at.desc()).limit(min(limit, 500))).all()
    return [
        OutboxOut(
            id=r.id,
            user_id=r.user_id,
            business_id=r.business_id,
            type=r.type,
            subject=r.subject,
            body=r.body,
            status=r.status.value,
            payload_json=r.payload_json,
            created_at=r.created_at,
        )
        for r in rows
    ]
