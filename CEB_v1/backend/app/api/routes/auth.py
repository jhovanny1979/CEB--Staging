from __future__ import annotations

from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import and_, func, select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.config import get_settings
from app.core.security import (
    create_access_token,
    create_random_token,
    create_refresh_token,
    hash_password,
    slugify,
    verify_password,
)
from app.db.session import get_db
from app.models.entities import (
    Business,
    EmailVerificationToken,
    PasswordResetToken,
    User,
)
from app.models.enums import RoleEnum
from app.schemas.api import (
    AuthLoginIn,
    AuthRegisterIn,
    MessageResponse,
    RecoverIn,
    ResetPasswordIn,
    TokenResponse,
    UserOut,
    VerifyEmailIn,
)
from app.services.audit import log_action
from app.services.notifications import queue_notification
from app.services.platform_settings import get_platform_settings_row
from app.services.rate_limit import rate_limiter

router = APIRouter()


def _build_user_out(user: User) -> UserOut:
    return UserOut(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        role=user.role.value,
        is_email_verified=user.is_email_verified,
    )


def _build_unique_business_slug(db: Session, business_name: str) -> str:
    base_slug = slugify(business_name) or 'negocio'
    slug = base_slug
    suffix = 1
    while db.scalar(select(func.count(Business.id)).where(Business.slug == slug)):
        suffix += 1
        slug = f'{base_slug}-{suffix}'
    return slug


@router.post('/register', response_model=MessageResponse)
def register(payload: AuthRegisterIn, request: Request, db: Session = Depends(get_db)) -> MessageResponse:
    exists = db.scalar(select(func.count(User.id)).where(User.email == payload.email))
    if exists:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='El correo ya existe')

    user = User(
        email=payload.email,
        password_hash=hash_password(payload.password),
        full_name=payload.full_name,
        role=RoleEnum.client,
    )
    db.add(user)
    db.flush()

    if payload.business_name:
        business = Business(
            owner_user_id=user.id,
            slug=_build_unique_business_slug(db, payload.business_name),
            name=payload.business_name,
            address=payload.address,
            locality=payload.locality,
            category=payload.category,
            description=payload.description,
            whatsapp=payload.phone,
            published=False,
        )
        db.add(business)

    token = create_random_token()
    verification = EmailVerificationToken(
        user_id=user.id,
        token=token,
        expires_at=datetime.now(UTC) + timedelta(days=1),
    )
    db.add(verification)

    verify_link = f"{request.base_url}api/v1/auth/verify-email"
    queue_notification(
        db,
        user_id=user.id,
        business_id=None,
        notification_type='auth.verify_email',
        subject='Confirma tu correo',
        body='Confirma tu correo para activar la cuenta.',
        payload={'token': token, 'verify_url': verify_link},
    )

    platform_settings = get_platform_settings_row(db)
    if bool(platform_settings.notify_new_registration):
        admins = db.scalars(
            select(User).where(
                and_(
                    User.role == RoleEnum.admin,
                    User.is_active.is_(True),
                )
            )
        ).all()
        for admin_user in admins:
            queue_notification(
                db,
                user_id=admin_user.id,
                business_id=None,
                notification_type='admin.new_registration',
                subject='Nuevo registro de cliente',
                body='Se registro un nuevo cliente en la plataforma.',
                payload={
                    'user_id': str(user.id),
                    'user_email': user.email,
                    'business_name': payload.business_name or '',
                },
            )

    log_action(db, actor_user_id=user.id, action='auth_register', entity_type='user', entity_id=str(user.id))
    db.commit()
    return MessageResponse(message='Registro exitoso. Revisa el outbox para confirmar correo.')


@router.post('/login', response_model=TokenResponse)
def login(payload: AuthLoginIn, db: Session = Depends(get_db)) -> TokenResponse:
    settings = get_settings()
    key = f'login:{payload.email.lower()}'
    if not rate_limiter.allow(key, settings.rate_limit_login_per_minute):
        raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail='Demasiados intentos. Intenta mas tarde.')

    user = db.scalar(select(User).where(User.email == payload.email))
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='Credenciales invalidas')

    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail='Usuario inactivo')

    user.last_login_at = datetime.now(UTC)
    access_token = create_access_token(str(user.id), user.role.value)
    refresh_token = create_refresh_token(str(user.id), user.role.value)
    log_action(db, actor_user_id=user.id, action='auth_login', entity_type='user', entity_id=str(user.id))
    db.commit()

    return TokenResponse(access_token=access_token, refresh_token=refresh_token, user=_build_user_out(user))


@router.post('/verify-email', response_model=MessageResponse)
def verify_email(payload: VerifyEmailIn, db: Session = Depends(get_db)) -> MessageResponse:
    token_row = db.scalar(select(EmailVerificationToken).where(EmailVerificationToken.token == payload.token))
    if not token_row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Token no existe')
    if token_row.used_at is not None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Token ya usado')
    if token_row.expires_at < datetime.now(UTC):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Token expirado')

    user = db.get(User, token_row.user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Usuario no existe')

    token_row.used_at = datetime.now(UTC)
    user.is_email_verified = True
    log_action(db, actor_user_id=user.id, action='auth_verify_email', entity_type='user', entity_id=str(user.id))
    db.commit()
    return MessageResponse(message='Correo confirmado correctamente.')


@router.post('/recover', response_model=MessageResponse)
def recover(payload: RecoverIn, db: Session = Depends(get_db)) -> MessageResponse:
    settings = get_settings()
    key = f"recover:{payload.recovery_type}:{payload.identifier.lower()}"
    if not rate_limiter.allow(key, settings.rate_limit_recover_per_minute):
        raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail='Demasiados intentos. Intenta mas tarde.')

    user: User | None = None
    business: Business | None = None

    if payload.recovery_type == 'contrasena':
        user = db.scalar(select(User).where(User.email == payload.identifier))
    else:
        business = db.scalar(select(Business).where(Business.name.ilike(payload.identifier)))
        if business:
            user = db.get(User, business.owner_user_id)

    if user:
        if payload.recovery_type == 'contrasena':
            token = create_random_token()
            db.add(
                PasswordResetToken(
                    user_id=user.id,
                    token=token,
                    expires_at=datetime.now(UTC) + timedelta(hours=1),
                )
            )
            queue_notification(
                db,
                user_id=user.id,
                business_id=business.id if business else None,
                notification_type='auth.reset_password',
                subject='Recuperacion de contrasena',
                body='Se genero un token temporal para cambio de contrasena.',
                payload={'token': token},
            )
        elif payload.recovery_type == 'usuario':
            queue_notification(
                db,
                user_id=user.id,
                business_id=business.id if business else None,
                notification_type='auth.recover_username',
                subject='Recuperacion de usuario',
                body='Tu usuario es el correo registrado.',
                payload={'email': user.email},
            )
        else:
            token = create_random_token()
            db.add(
                PasswordResetToken(
                    user_id=user.id,
                    token=token,
                    expires_at=datetime.now(UTC) + timedelta(hours=1),
                )
            )
            queue_notification(
                db,
                user_id=user.id,
                business_id=business.id if business else None,
                notification_type='auth.recover_account',
                subject='Recuperacion de cuenta',
                body='Se envio usuario y token temporal de restablecimiento.',
                payload={'email': user.email, 'token': token},
            )

        log_action(db, actor_user_id=user.id, action='auth_recover', entity_type='user', entity_id=str(user.id))
        db.commit()

    return MessageResponse(message='Si existe una cuenta asociada, se envio informacion al outbox.')


@router.post('/reset-password', response_model=MessageResponse)
def reset_password(payload: ResetPasswordIn, db: Session = Depends(get_db)) -> MessageResponse:
    token_row = db.scalar(select(PasswordResetToken).where(PasswordResetToken.token == payload.token))
    if not token_row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Token no existe')
    if token_row.used_at is not None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Token ya usado')
    if token_row.expires_at < datetime.now(UTC):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Token expirado')

    user = db.get(User, token_row.user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Usuario no existe')

    user.password_hash = hash_password(payload.new_password)
    token_row.used_at = datetime.now(UTC)
    log_action(db, actor_user_id=user.id, action='auth_reset_password', entity_type='user', entity_id=str(user.id))
    db.commit()
    return MessageResponse(message='Contrasena actualizada correctamente.')


@router.get('/me', response_model=UserOut)
def auth_me(user: User = Depends(get_current_user)) -> UserOut:
    return _build_user_out(user)
