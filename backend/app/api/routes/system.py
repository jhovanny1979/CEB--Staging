from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.entities import Business, BusinessHour, BusinessImage, Promotion, PromotionImage, SubscriptionPlan
from app.models.enums import PromotionStatusEnum
from app.schemas.api import (
    BusinessHourOut,
    PlanOut,
    PlatformSettingsOut,
    PromotionImageOut,
    PromotionOut,
    PublicBusinessCardOut,
    PublicBusinessOut,
)
from app.services.platform_settings import get_platform_settings_row, serialize_platform_settings

router = APIRouter()


@router.get('/health/live')
def live() -> dict[str, str]:
    return {'status': 'ok'}


@router.get('/health/ready')
def ready() -> dict[str, str]:
    return {'status': 'ready'}


@router.get('/public/plans', response_model=list[PlanOut])
def list_public_plans(db: Session = Depends(get_db)) -> list[PlanOut]:
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


@router.get('/public/platform-settings', response_model=PlatformSettingsOut)
def get_public_platform_settings(db: Session = Depends(get_db)) -> PlatformSettingsOut:
    row = get_platform_settings_row(db)
    db.commit()
    return serialize_platform_settings(row)


@router.get('/public/businesses', response_model=list[PublicBusinessCardOut])
def list_public_businesses(db: Session = Depends(get_db)) -> list[PublicBusinessCardOut]:
    businesses = db.scalars(select(Business).order_by(Business.created_at.desc())).all()
    return [
        PublicBusinessCardOut(
            slug=b.slug,
            name=b.name,
            category=b.category or '',
            locality=b.locality or '',
            logo_path=b.logo_path or '',
            published=bool(b.published),
        )
        for b in businesses
        if (b.slug or '').strip() and (b.name or '').strip()
    ]


@router.get('/public/businesses/{slug}', response_model=PublicBusinessOut)
def get_public_business(slug: str, db: Session = Depends(get_db)) -> PublicBusinessOut:
    business = db.scalar(select(Business).where(Business.slug == slug))
    if not business:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Negocio no encontrado')

    hours = db.scalars(select(BusinessHour).where(BusinessHour.business_id == business.id).order_by(BusinessHour.day_of_week)).all()
    images = db.scalars(select(BusinessImage).where(BusinessImage.business_id == business.id).order_by(BusinessImage.position)).all()
    promotions = db.scalars(
        select(Promotion)
        .where(Promotion.business_id == business.id, Promotion.status == PromotionStatusEnum.published)
        .order_by(Promotion.published_at.desc(), Promotion.created_at.desc())
    ).all()
    promotion_ids = [p.id for p in promotions]
    image_map: dict = {}
    if promotion_ids:
        promotion_images = db.scalars(
            select(PromotionImage)
            .where(PromotionImage.promotion_id.in_(promotion_ids))
            .order_by(PromotionImage.promotion_id.asc(), PromotionImage.position.asc())
        ).all()
        for row in promotion_images:
            path = (row.file_path or '').strip()
            if not path:
                continue
            image_map.setdefault(row.promotion_id, []).append(
                PromotionImageOut(
                    file_path=path,
                    description=(row.description or '').strip(),
                    position=int(row.position or 0),
                )
            )

    return PublicBusinessOut(
        slug=business.slug,
        name=business.name,
        address=business.address or '',
        locality=business.locality or '',
        category=business.category or '',
        description=business.description or '',
        whatsapp=business.whatsapp or '',
        instagram=business.instagram or '',
        facebook=business.facebook or '',
        youtube=business.youtube or '',
        has_delivery=bool(business.has_delivery),
        logo_path=business.logo_path or '',
        published=bool(business.published),
        gallery=[img.file_path for img in images if (img.file_path or '').strip()],
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
        promotions=[
            PromotionOut(
                id=p.id,
                business_id=p.business_id,
                title=p.title,
                content_html=p.content_html,
                image_path=((image_map.get(p.id) or [PromotionImageOut(file_path=p.image_path or '', description='', position=0)])[0].file_path),
                images=image_map.get(p.id)
                or ([PromotionImageOut(file_path=p.image_path or '', description='', position=0)] if (p.image_path or '').strip() else []),
                status=p.status.value,
                published_at=p.published_at,
                starts_at=p.starts_at,
                ends_at=p.ends_at,
                relaunch_count=p.relaunch_count,
            )
            for p in promotions
        ],
    )
