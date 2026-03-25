from __future__ import annotations

from datetime import UTC, date, datetime, time, timedelta
from pathlib import Path
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, status
from sqlalchemy import and_, func, select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.config import get_settings
from app.core.security import slugify
from app.db.session import get_db
from app.models.entities import (
    Business,
    BusinessHour,
    BusinessImage,
    PaymentReceipt,
    PromoCode,
    PromoCodeRedemption,
    Promotion,
    PromotionImage,
    Subscription,
    SubscriptionPlan,
    User,
    WAContact,
    WAPromotionSend,
    WAPromotionTemplate,
)
from app.models.enums import PromotionStatusEnum, ReceiptStatusEnum, SubscriptionStatusEnum
from app.schemas.api import (
    ActivateCodeIn,
    BusinessHourOut,
    BusinessIn,
    BusinessImageOut,
    BusinessOut,
    CurrentSubscriptionOut,
    FilePathOut,
    MessageResponse,
    PaymentReceiptCreateIn,
    PlanOut,
    PromotionCreateIn,
    PromotionUpdateIn,
    PromotionImageOut,
    PromotionOut,
    ReceiptOut,
    SubscriptionUpgradeIn,
    WAContactIn,
    WAContactOut,
    WAPromotionIn,
    WAPromotionOut,
    WASendLogIn,
    WASendLogOut,
)
from app.services.audit import log_action
from app.services.notifications import queue_notification
from app.services.platform_settings import get_platform_settings_row, serialize_platform_settings

router = APIRouter()


def _ensure_business(db: Session, user: User) -> Business:
    business = db.scalar(select(Business).where(Business.owner_user_id == user.id))
    if business:
        return business

    business = Business(
        owner_user_id=user.id,
        slug=f'pendiente-{str(user.id)[:8]}',
        name=f'Negocio de {user.full_name}',
        published=False,
    )
    db.add(business)
    db.flush()
    return business


def _normalize_promo_code(raw: str) -> str:
    return ''.join(ch for ch in str(raw or '').upper() if ch.isalnum())


def _current_subscription_with_plan(db: Session, business_id: UUID) -> tuple[Subscription | None, SubscriptionPlan | None]:
    subs = db.scalars(
        select(Subscription)
        .where(Subscription.business_id == business_id)
        .order_by(Subscription.created_at.desc())
    ).all()

    if not subs:
        return None, None

    def _pick_latest(status: SubscriptionStatusEnum) -> Subscription | None:
        for row in subs:
            if row.status == status:
                return row
        return None

    # Prefer the currently effective subscription shown to the client:
    # active > trial > pending (pending should not replace active/trial in the UI).
    chosen_sub = _pick_latest(SubscriptionStatusEnum.active)
    if not chosen_sub:
        chosen_sub = _pick_latest(SubscriptionStatusEnum.trial)
    if not chosen_sub:
        chosen_sub = _pick_latest(SubscriptionStatusEnum.pending)
    if not chosen_sub:
        chosen_sub = subs[0]

    plan: SubscriptionPlan | None = db.get(SubscriptionPlan, chosen_sub.plan_id) if chosen_sub else None
    return chosen_sub, plan


def _current_plan_limits(db: Session, business_id: UUID) -> tuple[int, int]:
    default_images = 10
    default_promotions = 4

    _, plan = _current_subscription_with_plan(db, business_id)
    if not plan:
        plan = db.scalar(
            select(SubscriptionPlan)
            .where(SubscriptionPlan.is_active.is_(True))
            .order_by(SubscriptionPlan.months.asc(), SubscriptionPlan.code.asc())
        )

    if plan:
        max_images = int(plan.max_images or default_images)
        max_promotions = int(plan.max_promotions_month or default_promotions)
        return (max(1, max_images), max(1, max_promotions))

    return (default_images, default_promotions)


def _serialize_business(db: Session, business: Business) -> BusinessOut:
    hours = db.scalars(select(BusinessHour).where(BusinessHour.business_id == business.id)).all()
    images = db.scalars(select(BusinessImage).where(BusinessImage.business_id == business.id).order_by(BusinessImage.position)).all()

    return BusinessOut(
        id=business.id,
        owner_user_id=business.owner_user_id,
        slug=business.slug,
        name=business.name,
        address=business.address,
        locality=business.locality,
        category=business.category,
        description=business.description,
        whatsapp=business.whatsapp,
        instagram=business.instagram,
        facebook=business.facebook,
        youtube=business.youtube,
        has_delivery=business.has_delivery,
        logo_path=business.logo_path,
        published=business.published,
        hours=[
            BusinessHourOut(
                id=h.id,
                day_of_week=h.day_of_week,
                is_open=h.is_open,
                open_time=h.open_time,
                close_time=h.close_time,
            )
            for h in hours
        ],
        images=[BusinessImageOut(id=i.id, file_path=i.file_path, position=i.position) for i in images],
    )


@router.get('/business', response_model=BusinessOut)
def get_business(db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> BusinessOut:
    business = _ensure_business(db, user)
    db.commit()
    return _serialize_business(db, business)


@router.put('/business', response_model=BusinessOut)
def upsert_business(payload: BusinessIn, db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> BusinessOut:
    business = _ensure_business(db, user)

    business.name = payload.name
    business.slug = slugify(payload.name) or business.slug
    business.address = payload.address
    business.locality = payload.locality
    business.category = payload.category
    business.description = payload.description
    business.whatsapp = payload.whatsapp
    business.instagram = payload.instagram
    business.facebook = payload.facebook
    business.youtube = payload.youtube
    business.has_delivery = payload.has_delivery
    business.logo_path = payload.logo_path
    business.published = payload.published

    db.query(BusinessHour).filter(BusinessHour.business_id == business.id).delete()
    for hour in payload.hours:
        db.add(
            BusinessHour(
                business_id=business.id,
                day_of_week=hour.day_of_week,
                is_open=hour.is_open,
                open_time=hour.open_time,
                close_time=hour.close_time,
            )
        )

    log_action(db, actor_user_id=user.id, action='business_upsert', entity_type='business', entity_id=str(business.id))
    db.commit()
    db.refresh(business)
    return _serialize_business(db, business)


@router.post('/business/images', response_model=BusinessImageOut)
async def upload_business_image(
    file: UploadFile = File(...),
    position: int = Form(0),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> BusinessImageOut:
    business = _ensure_business(db, user)
    max_images, _ = _current_plan_limits(db, business.id)
    total = db.scalar(select(func.count(BusinessImage.id)).where(BusinessImage.business_id == business.id)) or 0
    if total >= max_images:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f'Maximo {max_images} imagenes por negocio',
        )

    ext = Path(file.filename or '').suffix.lower() or '.bin'
    settings = get_settings()
    folder = settings.upload_path / 'business-images' / str(business.id)
    folder.mkdir(parents=True, exist_ok=True)
    local_name = f'{uuid4().hex}{ext}'
    target = folder / local_name

    content = await file.read()
    target.write_bytes(content)

    rel_path = str(Path('uploads') / 'business-images' / str(business.id) / local_name).replace('\\', '/')
    image = BusinessImage(business_id=business.id, file_path=rel_path, position=position)
    db.add(image)
    log_action(db, actor_user_id=user.id, action='business_image_upload', entity_type='business', entity_id=str(business.id))
    db.commit()
    db.refresh(image)
    return BusinessImageOut(id=image.id, file_path=image.file_path, position=image.position)


@router.delete('/business/images', response_model=MessageResponse)
def delete_business_image(image_id: UUID, db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> MessageResponse:
    business = _ensure_business(db, user)
    image = db.get(BusinessImage, image_id)
    if not image or image.business_id != business.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Imagen no encontrada')

    db.delete(image)
    log_action(db, actor_user_id=user.id, action='business_image_delete', entity_type='business_image', entity_id=str(image_id))
    db.commit()
    return MessageResponse(message='Imagen eliminada')


@router.post('/promotions/images', response_model=FilePathOut)
async def upload_promotion_image(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> FilePathOut:
    business = _ensure_business(db, user)
    if file.content_type and not str(file.content_type).lower().startswith('image/'):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Solo se permiten imagenes')
    ext = Path(file.filename or '').suffix.lower() or '.bin'
    allowed_ext = {'.jpg', '.jpeg', '.png', '.webp', '.gif'}
    if ext not in allowed_ext:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Formato de imagen no permitido')

    content = await file.read()
    max_bytes = 5 * 1024 * 1024
    if len(content) > max_bytes:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='La imagen supera el limite de 5MB')

    settings = get_settings()
    folder = settings.upload_path / 'promotion-images' / str(business.id)
    folder.mkdir(parents=True, exist_ok=True)
    local_name = f'{uuid4().hex}{ext}'
    target = folder / local_name
    target.write_bytes(content)

    rel_path = str(Path('uploads') / 'promotion-images' / str(business.id) / local_name).replace('\\', '/')
    log_action(db, actor_user_id=user.id, action='promotion_image_upload', entity_type='business', entity_id=str(business.id))
    db.commit()
    return FilePathOut(file_path=rel_path)


def _normalize_phone(raw: str) -> str:
    return ''.join(ch for ch in str(raw or '') if ch.isdigit())


def _serialize_wa_contact(row: WAContact) -> WAContactOut:
    return WAContactOut(
        id=row.id,
        business_id=row.business_id,
        name=row.name,
        email=row.email,
        phone=row.phone,
        created_at=row.created_at,
        updated_at=row.updated_at,
    )


def _serialize_wa_promo(row: WAPromotionTemplate) -> WAPromotionOut:
    return WAPromotionOut(
        id=row.id,
        business_id=row.business_id,
        emoji=row.emoji,
        title=row.title,
        msg=row.message_text,
        image_path=row.image_path,
        created_at=row.created_at,
        updated_at=row.updated_at,
    )


def _serialize_wa_send(row: WAPromotionSend) -> WASendLogOut:
    return WASendLogOut(
        id=row.id,
        business_id=row.business_id,
        promo_id=row.template_id,
        contact_id=row.contact_id,
        sent_at=row.sent_at,
    )


def _promotion_images_payload(db: Session, promo: Promotion) -> list[PromotionImageOut]:
    rows = db.scalars(
        select(PromotionImage).where(PromotionImage.promotion_id == promo.id).order_by(PromotionImage.position.asc())
    ).all()
    if rows:
        return [
            PromotionImageOut(
                file_path=(row.file_path or '').strip(),
                description=(row.description or '').strip(),
                position=int(row.position or 0),
            )
            for row in rows
            if (row.file_path or '').strip()
        ]

    legacy_path = (promo.image_path or '').strip()
    if legacy_path:
        return [PromotionImageOut(file_path=legacy_path, description='', position=0)]
    return []


def _serialize_promotion(db: Session, promo: Promotion) -> PromotionOut:
    images = _promotion_images_payload(db, promo)
    primary_image = images[0].file_path if images else (promo.image_path or '').strip()
    return PromotionOut(
        id=promo.id,
        business_id=promo.business_id,
        title=promo.title,
        content_html=promo.content_html,
        image_path=primary_image,
        images=images,
        status=promo.status.value,
        published_at=promo.published_at,
        starts_at=promo.starts_at,
        ends_at=promo.ends_at,
        relaunch_count=promo.relaunch_count,
    )


def _normalize_promotion_images(
    image_path: str | None,
    images: list,
) -> list[tuple[str, str]]:
    raw_images: list[tuple[str, str]] = []
    for item in images or []:
        path = (getattr(item, 'file_path', '') or '').strip()
        if not path:
            continue
        description = (getattr(item, 'description', '') or '').strip()
        raw_images.append((path, description))

    if not raw_images:
        legacy_path = (image_path or '').strip()
        if legacy_path:
            raw_images.append((legacy_path, ''))

    deduped_images: list[tuple[str, str]] = []
    seen_paths: set[str] = set()
    for path, description in raw_images:
        if path in seen_paths:
            continue
        seen_paths.add(path)
        deduped_images.append((path, description))

    if len(deduped_images) > 3:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Maximo 3 imagenes por promocion')

    return deduped_images


@router.get('/wa/contacts', response_model=list[WAContactOut])
def list_wa_contacts(db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> list[WAContactOut]:
    business = _ensure_business(db, user)
    rows = db.scalars(select(WAContact).where(WAContact.business_id == business.id).order_by(WAContact.created_at.desc())).all()
    return [_serialize_wa_contact(r) for r in rows]


@router.post('/wa/contacts', response_model=WAContactOut)
def create_wa_contact(payload: WAContactIn, db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> WAContactOut:
    business = _ensure_business(db, user)
    phone = _normalize_phone(payload.phone)
    if len(phone) < 7 or len(phone) > 15:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Celular invalido. Usa solo digitos.')

    exists = db.scalar(select(WAContact).where(WAContact.business_id == business.id, WAContact.phone == phone))
    if exists:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Este celular ya esta registrado.')

    row = WAContact(
        business_id=business.id,
        name=payload.name.strip(),
        email=payload.email.strip().lower(),
        phone=phone,
    )
    db.add(row)
    log_action(db, actor_user_id=user.id, action='wa_contact_create', entity_type='wa_contact', entity_id=str(row.id))
    db.commit()
    db.refresh(row)
    return _serialize_wa_contact(row)


@router.delete('/wa/contacts/{contact_id}', response_model=MessageResponse)
def delete_wa_contact(contact_id: UUID, db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> MessageResponse:
    business = _ensure_business(db, user)
    row = db.get(WAContact, contact_id)
    if not row or row.business_id != business.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Contacto no encontrado')
    db.delete(row)
    log_action(db, actor_user_id=user.id, action='wa_contact_delete', entity_type='wa_contact', entity_id=str(contact_id))
    db.commit()
    return MessageResponse(message='Contacto eliminado')


@router.get('/wa/promotions', response_model=list[WAPromotionOut])
def list_wa_promotions(db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> list[WAPromotionOut]:
    business = _ensure_business(db, user)
    rows = db.scalars(
        select(WAPromotionTemplate).where(WAPromotionTemplate.business_id == business.id).order_by(WAPromotionTemplate.created_at.desc())
    ).all()
    return [_serialize_wa_promo(r) for r in rows]


@router.post('/wa/promotions', response_model=WAPromotionOut)
def create_wa_promotion(payload: WAPromotionIn, db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> WAPromotionOut:
    business = _ensure_business(db, user)
    row = WAPromotionTemplate(
        business_id=business.id,
        emoji=payload.emoji.strip() or '🔥',
        title=payload.title.strip(),
        message_text=payload.msg.strip(),
        image_path=payload.image_path.strip(),
    )
    db.add(row)
    log_action(db, actor_user_id=user.id, action='wa_promotion_create', entity_type='wa_promotion', entity_id=str(row.id))
    db.commit()
    db.refresh(row)
    return _serialize_wa_promo(row)


@router.delete('/wa/promotions/{promotion_id}', response_model=MessageResponse)
def delete_wa_promotion(promotion_id: UUID, db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> MessageResponse:
    business = _ensure_business(db, user)
    row = db.get(WAPromotionTemplate, promotion_id)
    if not row or row.business_id != business.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Promocion no encontrada')
    db.delete(row)
    log_action(db, actor_user_id=user.id, action='wa_promotion_delete', entity_type='wa_promotion', entity_id=str(promotion_id))
    db.commit()
    return MessageResponse(message='Promocion eliminada')


@router.post('/wa/promotions/images', response_model=FilePathOut)
async def upload_wa_promotion_image(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> FilePathOut:
    business = _ensure_business(db, user)
    if file.content_type and not str(file.content_type).lower().startswith('image/'):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Solo se permiten imagenes')
    ext = Path(file.filename or '').suffix.lower() or '.bin'
    allowed_ext = {'.jpg', '.jpeg', '.png', '.webp', '.gif'}
    if ext not in allowed_ext:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Formato de imagen no permitido')

    content = await file.read()
    max_bytes = 5 * 1024 * 1024
    if len(content) > max_bytes:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='La imagen supera el limite de 5MB')

    settings = get_settings()
    folder = settings.upload_path / 'wa-promo-images' / str(business.id)
    folder.mkdir(parents=True, exist_ok=True)
    local_name = f'{uuid4().hex}{ext}'
    target = folder / local_name
    target.write_bytes(content)

    rel_path = str(Path('uploads') / 'wa-promo-images' / str(business.id) / local_name).replace('\\', '/')
    log_action(db, actor_user_id=user.id, action='wa_promotion_image_upload', entity_type='business', entity_id=str(business.id))
    db.commit()
    return FilePathOut(file_path=rel_path)


@router.get('/wa/sent', response_model=list[WASendLogOut])
def list_wa_sent(
    promo_id: UUID | None = Query(default=None),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[WASendLogOut]:
    business = _ensure_business(db, user)
    stmt = select(WAPromotionSend).where(WAPromotionSend.business_id == business.id).order_by(WAPromotionSend.sent_at.desc())
    if promo_id:
        stmt = stmt.where(WAPromotionSend.template_id == promo_id)
    rows = db.scalars(stmt).all()
    return [_serialize_wa_send(r) for r in rows]


@router.post('/wa/sent', response_model=WASendLogOut)
def mark_wa_sent(payload: WASendLogIn, db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> WASendLogOut:
    business = _ensure_business(db, user)
    promo = db.get(WAPromotionTemplate, payload.promo_id)
    if not promo or promo.business_id != business.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Promocion no encontrada')

    contact = db.get(WAContact, payload.contact_id)
    if not contact or contact.business_id != business.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Contacto no encontrado')

    row = db.scalar(
        select(WAPromotionSend).where(
            WAPromotionSend.template_id == payload.promo_id,
            WAPromotionSend.contact_id == payload.contact_id,
            WAPromotionSend.business_id == business.id,
        )
    )
    if row:
        row.sent_at = datetime.now(UTC)
    else:
        row = WAPromotionSend(
            business_id=business.id,
            template_id=payload.promo_id,
            contact_id=payload.contact_id,
            sent_at=datetime.now(UTC),
        )
        db.add(row)

    log_action(db, actor_user_id=user.id, action='wa_send_mark', entity_type='wa_send', entity_id=str(row.id))
    db.commit()
    db.refresh(row)
    return _serialize_wa_send(row)


@router.get('/promotions', response_model=list[PromotionOut])
def list_promotions(db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> list[PromotionOut]:
    business = _ensure_business(db, user)
    rows = db.scalars(select(Promotion).where(Promotion.business_id == business.id).order_by(Promotion.created_at.desc())).all()
    return [_serialize_promotion(db, r) for r in rows]


@router.post('/promotions', response_model=PromotionOut)
def create_promotion(payload: PromotionCreateIn, db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> PromotionOut:
    business = _ensure_business(db, user)
    deduped_images = _normalize_promotion_images(payload.image_path, payload.images)

    primary_image = deduped_images[0][0] if deduped_images else ''
    promo = Promotion(
        business_id=business.id,
        title=payload.title,
        content_html=payload.content_html,
        image_path=primary_image,
        starts_at=payload.starts_at,
        ends_at=payload.ends_at,
        status=PromotionStatusEnum.draft,
    )
    db.add(promo)
    db.flush()
    for idx, (path, description) in enumerate(deduped_images):
        db.add(
            PromotionImage(
                promotion_id=promo.id,
                file_path=path,
                description=description,
                position=idx,
            )
        )
    log_action(db, actor_user_id=user.id, action='promotion_create', entity_type='promotion', entity_id=str(promo.id))
    db.commit()
    db.refresh(promo)
    return _serialize_promotion(db, promo)


@router.put('/promotions/{promotion_id}', response_model=PromotionOut)
def update_promotion(
    promotion_id: UUID,
    payload: PromotionUpdateIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> PromotionOut:
    business = _ensure_business(db, user)
    promo = db.get(Promotion, promotion_id)
    if not promo or promo.business_id != business.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Promocion no encontrada')

    deduped_images = _normalize_promotion_images(payload.image_path, payload.images)
    primary_image = deduped_images[0][0] if deduped_images else ''

    promo.title = payload.title
    promo.content_html = payload.content_html
    promo.image_path = primary_image
    promo.starts_at = payload.starts_at
    promo.ends_at = payload.ends_at

    db.query(PromotionImage).filter(PromotionImage.promotion_id == promo.id).delete()
    for idx, (path, description) in enumerate(deduped_images):
        db.add(
            PromotionImage(
                promotion_id=promo.id,
                file_path=path,
                description=description,
                position=idx,
            )
        )

    log_action(db, actor_user_id=user.id, action='promotion_update', entity_type='promotion', entity_id=str(promo.id))
    db.commit()
    db.refresh(promo)
    return _serialize_promotion(db, promo)


def _validate_publish_limits(db: Session, business_id: UUID, promotion_id: UUID | None = None) -> None:
    now = datetime.now(UTC)
    month_start = datetime(now.year, now.month, 1, tzinfo=UTC)
    month_end = datetime(now.year + (1 if now.month == 12 else 0), 1 if now.month == 12 else now.month + 1, 1, tzinfo=UTC)
    _, max_promotions_month = _current_plan_limits(db, business_id)

    count_month = db.scalar(
        select(func.count(Promotion.id)).where(
            and_(
                Promotion.business_id == business_id,
                Promotion.status == PromotionStatusEnum.published,
                Promotion.published_at >= month_start,
                Promotion.published_at < month_end,
            )
        )
    ) or 0

    if count_month >= max_promotions_month:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f'Limite de {max_promotions_month} promociones por mes alcanzado',
        )

    one_week_ago = now - timedelta(days=7)
    recent = db.scalar(
        select(func.count(Promotion.id)).where(
            and_(
                Promotion.business_id == business_id,
                Promotion.status == PromotionStatusEnum.published,
                Promotion.published_at >= one_week_ago,
                Promotion.id != promotion_id if promotion_id else True,
            )
        )
    ) or 0

    if recent > 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Solo se permite una promocion publicada por semana')


@router.post('/promotions/{promotion_id}/publish', response_model=PromotionOut)
def publish_promotion(promotion_id: UUID, db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> PromotionOut:
    business = _ensure_business(db, user)
    promo = db.get(Promotion, promotion_id)
    if not promo or promo.business_id != business.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Promocion no encontrada')

    _validate_publish_limits(db, business.id, promotion_id=promo.id)
    promo.status = PromotionStatusEnum.published
    promo.published_at = datetime.now(UTC)
    log_action(db, actor_user_id=user.id, action='promotion_publish', entity_type='promotion', entity_id=str(promo.id))
    db.commit()
    db.refresh(promo)
    return _serialize_promotion(db, promo)


@router.post('/promotions/{promotion_id}/relaunch', response_model=PromotionOut)
def relaunch_promotion(promotion_id: UUID, db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> PromotionOut:
    business = _ensure_business(db, user)
    promo = db.get(Promotion, promotion_id)
    if not promo or promo.business_id != business.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Promocion no encontrada')

    _validate_publish_limits(db, business.id, promotion_id=promo.id)
    promo.status = PromotionStatusEnum.published
    promo.published_at = datetime.now(UTC)
    promo.relaunch_count += 1
    log_action(db, actor_user_id=user.id, action='promotion_relaunch', entity_type='promotion', entity_id=str(promo.id))
    db.commit()
    db.refresh(promo)
    return _serialize_promotion(db, promo)


@router.delete('/promotions/{promotion_id}', response_model=MessageResponse)
def delete_promotion(promotion_id: UUID, db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> MessageResponse:
    business = _ensure_business(db, user)
    promo = db.get(Promotion, promotion_id)
    if not promo or promo.business_id != business.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Promocion no encontrada')

    db.query(PromotionImage).filter(PromotionImage.promotion_id == promo.id).delete()
    db.delete(promo)
    log_action(db, actor_user_id=user.id, action='promotion_delete', entity_type='promotion', entity_id=str(promotion_id))
    db.commit()
    return MessageResponse(message='Promocion eliminada')


@router.get('/plans', response_model=list[PlanOut])
def list_plans(db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> list[PlanOut]:
    rows = db.scalars(
        select(SubscriptionPlan)
        .where(
            SubscriptionPlan.is_active.is_(True),
            SubscriptionPlan.price_cop > 0,
            ~SubscriptionPlan.code.ilike('TRIAL%'),
        )
        .order_by(SubscriptionPlan.months.asc(), SubscriptionPlan.code.asc())
    ).all()
    return [
        PlanOut(
            id=r.id,
            code=r.code,
            name=r.name,
            months=r.months,
            price_cop=r.price_cop,
            max_images=r.max_images,
            max_promotions_month=r.max_promotions_month,
        )
        for r in rows
    ]


@router.get('/subscriptions/current', response_model=CurrentSubscriptionOut)
def get_current_subscription(db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> CurrentSubscriptionOut:
    business = _ensure_business(db, user)
    sub, plan = _current_subscription_with_plan(db, business.id)
    if not plan:
        plan = db.scalar(
            select(SubscriptionPlan)
            .where(SubscriptionPlan.is_active.is_(True))
            .order_by(SubscriptionPlan.months.asc(), SubscriptionPlan.code.asc())
        )

    default_images = int((plan.max_images if plan else 10) or 10)
    default_promos = int((plan.max_promotions_month if plan else 4) or 4)
    default_price = int((plan.price_cop if plan else 0) or 0)
    default_name = str((plan.name if plan else 'Sin plan') or 'Sin plan')
    default_code = str((plan.code if plan else '') or '')

    if not sub:
        return CurrentSubscriptionOut(
            status='none',
            plan_name='Sin plan',
            plan_code='',
            price_cop=0,
            max_images=max(1, default_images),
            max_promotions_month=max(1, default_promos),
            started_at=None,
            expires_at=None,
            is_trial=False,
            trial_days=None,
        )

    status = sub.status.value if isinstance(sub.status, SubscriptionStatusEnum) else str(sub.status)
    is_trial = status == SubscriptionStatusEnum.trial.value
    trial_days: int | None = None

    if is_trial:
        if sub.started_at and sub.expires_at:
            delta_days = (sub.expires_at.date() - sub.started_at.date()).days
            if delta_days > 0:
                trial_days = int(delta_days)
        if trial_days is None:
            platform_settings = serialize_platform_settings(get_platform_settings_row(db))
            configured_days = int(platform_settings.trial_days or 0)
            trial_days = configured_days if configured_days > 0 else None

    plan_name = default_name
    if is_trial and 'trial' not in plan_name.lower() and 'prueba' not in plan_name.lower():
        if trial_days and trial_days > 0:
            plan_name = f'Periodo de prueba ({trial_days} dias)'
        else:
            plan_name = 'Periodo de prueba'

    return CurrentSubscriptionOut(
        status=status,
        plan_name=plan_name,
        plan_code=default_code,
        price_cop=default_price,
        max_images=max(1, default_images),
        max_promotions_month=max(1, default_promos),
        started_at=sub.started_at,
        expires_at=sub.expires_at,
        is_trial=is_trial,
        trial_days=trial_days,
    )


@router.post('/subscriptions/activate-code', response_model=MessageResponse)
def activate_code(payload: ActivateCodeIn, db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> MessageResponse:
    business = _ensure_business(db, user)
    normalized = _normalize_promo_code(payload.code)
    all_codes = db.scalars(select(PromoCode).where(PromoCode.is_active.is_(True))).all()
    code = next((row for row in all_codes if _normalize_promo_code(row.code) == normalized), None)
    if not code:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Codigo no valido')

    expires_at = code.expires_at
    if expires_at:
        now = datetime.now(UTC)
        if expires_at.tzinfo is None:
            now = now.replace(tzinfo=None)
        if expires_at < now:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Codigo expirado')

    already = db.scalar(
        select(func.count(PromoCodeRedemption.id)).where(
            PromoCodeRedemption.promo_code_id == code.id,
            PromoCodeRedemption.business_id == business.id,
        )
    ) or 0
    if already:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Codigo ya usado por este negocio')

    platform_settings = serialize_platform_settings(get_platform_settings_row(db))
    trial_days = int(platform_settings.trial_days or code.trial_days or 30)
    if trial_days < 1:
        trial_days = int(platform_settings.trial_days or 30)

    plan = db.scalar(select(SubscriptionPlan).where(SubscriptionPlan.code == 'TRIAL30'))
    if not plan:
        fallback_plan = db.scalar(
            select(SubscriptionPlan)
            .where(SubscriptionPlan.is_active.is_(True))
            .order_by(SubscriptionPlan.months.asc(), SubscriptionPlan.code.asc())
        )
        if not fallback_plan:
            fallback_plan = db.scalar(
                select(SubscriptionPlan)
                .where(
                    SubscriptionPlan.is_active.is_(True),
                    SubscriptionPlan.price_cop > 0,
                    ~SubscriptionPlan.code.ilike('TRIAL%'),
                )
                .order_by(SubscriptionPlan.months.asc(), SubscriptionPlan.code.asc())
            )
        plan = SubscriptionPlan(
            code='TRIAL30',
            name=f'Plan Trial {trial_days} dias',
            months=1,
            price_cop=0,
            max_images=int((fallback_plan.max_images if fallback_plan else 10) or 10),
            max_promotions_month=int((fallback_plan.max_promotions_month if fallback_plan else 4) or 4),
        )
        db.add(plan)
        db.flush()
    else:
        plan.name = f'Plan Trial {trial_days} dias'
        fallback_plan = db.scalar(
            select(SubscriptionPlan)
            .where(
                SubscriptionPlan.is_active.is_(True),
                SubscriptionPlan.price_cop > 0,
                ~SubscriptionPlan.code.ilike('TRIAL%'),
            )
            .order_by(SubscriptionPlan.months.asc(), SubscriptionPlan.code.asc())
        )
        if fallback_plan:
            plan.max_images = int((fallback_plan.max_images or plan.max_images or 10))
            plan.max_promotions_month = int((fallback_plan.max_promotions_month or plan.max_promotions_month or 4))

    sub = Subscription(
        business_id=business.id,
        plan_id=plan.id,
        status=SubscriptionStatusEnum.trial,
        source='promo_code',
        started_at=datetime.now(UTC),
        expires_at=datetime.now(UTC) + timedelta(days=trial_days),
    )
    db.add(sub)
    db.flush()

    db.add(
        PromoCodeRedemption(
            promo_code_id=code.id,
            business_id=business.id,
            user_id=user.id,
            subscription_id=sub.id,
        )
    )

    queue_notification(
        db,
        user_id=user.id,
        business_id=business.id,
        notification_type='subscription.trial_activated',
        subject='Codigo promocional activado',
        body='Tu codigo promocional fue activado correctamente.',
        payload={'subscription_id': str(sub.id)},
    )
    log_action(db, actor_user_id=user.id, action='subscription_activate_code', entity_type='subscription', entity_id=str(sub.id))
    db.commit()
    return MessageResponse(message='Codigo activado correctamente')


def _create_pending_subscription_and_receipt(
    db: Session,
    *,
    user: User,
    business: Business,
    plan: SubscriptionPlan,
    payment_method: str,
    notes: str,
    amount_cop: int,
    support_file_path: str,
) -> PaymentReceipt:
    sub = Subscription(
        business_id=business.id,
        plan_id=plan.id,
        status=SubscriptionStatusEnum.pending,
        source='manual_payment',
        started_at=datetime.now(UTC),
        expires_at=datetime.now(UTC) + timedelta(days=30 * max(plan.months, 1)),
    )
    db.add(sub)
    db.flush()

    receipt = PaymentReceipt(
        business_id=business.id,
        subscription_id=sub.id,
        plan_id=plan.id,
        amount_cop=amount_cop,
        payment_method=payment_method,
        support_file_path=support_file_path,
        notes=notes,
        status=ReceiptStatusEnum.pending,
    )
    db.add(receipt)

    queue_notification(
        db,
        user_id=user.id,
        business_id=business.id,
        notification_type='payment.receipt_submitted',
        subject='Recaudo recibido',
        body='Tu solicitud fue enviada y esta pendiente de aprobacion.',
        payload={'receipt_id': str(receipt.id)},
    )
    log_action(db, actor_user_id=user.id, action='payment_receipt_submit', entity_type='payment_receipt', entity_id=str(receipt.id))
    return receipt


@router.post('/subscriptions/upgrade', response_model=ReceiptOut)
def upgrade_subscription(payload: SubscriptionUpgradeIn, db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> ReceiptOut:
    business = _ensure_business(db, user)
    plan = db.get(SubscriptionPlan, payload.plan_id)
    if not plan or not plan.is_active:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Plan no existe')

    receipt = _create_pending_subscription_and_receipt(
        db,
        user=user,
        business=business,
        plan=plan,
        payment_method=payload.payment_method,
        notes=payload.notes,
        amount_cop=plan.price_cop,
        support_file_path='',
    )
    db.commit()
    db.refresh(receipt)
    return ReceiptOut(
        id=receipt.id,
        business_id=receipt.business_id,
        plan_id=receipt.plan_id,
        amount_cop=receipt.amount_cop,
        payment_method=receipt.payment_method,
        support_file_path=receipt.support_file_path,
        notes=receipt.notes,
        status=receipt.status.value,
        submitted_at=receipt.submitted_at,
        decided_at=receipt.decided_at,
        rejection_reason=receipt.rejection_reason,
    )


@router.post('/payments/receipts', response_model=ReceiptOut)
async def submit_payment_receipt(
    plan_id: UUID = Form(...),
    amount_cop: int = Form(...),
    payment_method: str = Form(...),
    notes: str = Form(default=''),
    support_file: UploadFile | None = File(default=None),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> ReceiptOut:
    business = _ensure_business(db, user)
    plan = db.get(SubscriptionPlan, plan_id)
    if not plan or not plan.is_active:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Plan no existe')

    support_file_path = ''
    if support_file:
        ext = Path(support_file.filename or '').suffix.lower() or '.bin'
        settings = get_settings()
        folder = settings.upload_path / 'receipts' / str(business.id)
        folder.mkdir(parents=True, exist_ok=True)
        name = f'{uuid4().hex}{ext}'
        target = folder / name
        target.write_bytes(await support_file.read())
        support_file_path = str(Path('uploads') / 'receipts' / str(business.id) / name).replace('\\', '/')

    receipt = _create_pending_subscription_and_receipt(
        db,
        user=user,
        business=business,
        plan=plan,
        payment_method=payment_method,
        notes=notes,
        amount_cop=amount_cop,
        support_file_path=support_file_path,
    )
    db.commit()
    db.refresh(receipt)
    return ReceiptOut(
        id=receipt.id,
        business_id=receipt.business_id,
        plan_id=receipt.plan_id,
        amount_cop=receipt.amount_cop,
        payment_method=receipt.payment_method,
        support_file_path=receipt.support_file_path,
        notes=receipt.notes,
        status=receipt.status.value,
        submitted_at=receipt.submitted_at,
        decided_at=receipt.decided_at,
        rejection_reason=receipt.rejection_reason,
    )
