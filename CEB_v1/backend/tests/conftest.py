from __future__ import annotations

import os
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

os.environ.setdefault('DATABASE_URL', 'sqlite+pysqlite:///./tests/test.db')
os.environ.setdefault('TEST_DATABASE_URL', 'sqlite+pysqlite:///./tests/test.db')
os.environ.setdefault('SECRET_KEY', 'TEST_SECRET')

from app.api.deps import get_db  # noqa: E402
from app.core.security import hash_password  # noqa: E402
from app.db.base import Base  # noqa: E402
from app.main import create_app  # noqa: E402
from app.models.entities import SubscriptionPlan, User  # noqa: E402
from app.models.enums import RoleEnum  # noqa: E402

BASE_DIR = Path(__file__).resolve().parent
TEST_DB_PATH = BASE_DIR / 'test.db'
if TEST_DB_PATH.exists():
    TEST_DB_PATH.unlink()

engine = create_engine(f'sqlite+pysqlite:///{TEST_DB_PATH.as_posix()}', future=True)
TestingSessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)

Base.metadata.create_all(bind=engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture(scope='session')
def app():
    application = create_app()
    application.dependency_overrides[get_db] = override_get_db
    return application


@pytest.fixture(scope='session')
def client(app):
    with TestClient(app) as c:
        yield c


@pytest.fixture(scope='session', autouse=True)
def seed_initial_data():
    db = TestingSessionLocal()
    try:
        admin = User(
            email='admin@test.com',
            password_hash=hash_password('Admin12345!'),
            full_name='Admin',
            role=RoleEnum.admin,
            is_email_verified=True,
        )
        db.add(admin)

        plans = [
            SubscriptionPlan(code='PLAN_1M', name='Plan 1 Mes', months=1, price_cop=25000, max_images=10, max_promotions_month=4, is_active=True),
            SubscriptionPlan(code='PLAN_3M', name='Plan 3 Meses', months=3, price_cop=72000, max_images=10, max_promotions_month=4, is_active=True),
        ]
        db.add_all(plans)
        db.commit()
        yield
    finally:
        db.close()


@pytest.fixture()
def auth_headers(client):
    payload = {
        'full_name': 'Cliente Test',
        'email': 'cliente@test.com',
        'password': 'Cliente12345!',
        'business_name': 'Negocio Test',
    }
    client.post('/api/v1/auth/register', json=payload)
    login = client.post('/api/v1/auth/login', json={'email': payload['email'], 'password': payload['password']})
    token = login.json()['access_token']
    return {'Authorization': f'Bearer {token}'}


@pytest.fixture()
def admin_headers(client):
    login = client.post('/api/v1/admin/login', json={'email': 'admin@test.com', 'password': 'Admin12345!'})
    token = login.json()['access_token']
    return {'Authorization': f'Bearer {token}'}


