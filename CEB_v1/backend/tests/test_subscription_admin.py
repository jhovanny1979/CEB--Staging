from uuid import uuid4


def _new_auth_headers(client):
    email = f'cliente_{uuid4().hex[:8]}@test.com'
    password = 'Cliente12345!'
    payload = {
        'full_name': 'Cliente Test',
        'email': email,
        'password': password,
        'business_name': 'Negocio Test',
    }
    reg = client.post('/api/v1/auth/register', json=payload)
    assert reg.status_code == 200
    login = client.post('/api/v1/auth/login', json={'email': email, 'password': password})
    assert login.status_code == 200
    token = login.json()['access_token']
    return {'Authorization': f'Bearer {token}'}


def test_subscription_and_admin_approve(client, auth_headers, admin_headers):
    plans = client.get('/api/v1/me/plans', headers=auth_headers)
    assert plans.status_code == 200
    assert len(plans.json()) >= 1

    plan = plans.json()[0]
    submit = client.post(
        '/api/v1/me/subscriptions/upgrade',
        json={'plan_id': plan['id'], 'payment_method': 'Nequi', 'notes': 'Pago test'},
        headers=auth_headers,
    )
    assert submit.status_code == 200
    receipt_id = submit.json()['id']

    pending = client.get('/api/v1/admin/receipts?status_filter=pending', headers=admin_headers)
    assert pending.status_code == 200
    assert any(r['id'] == receipt_id for r in pending.json())

    approve = client.post(f'/api/v1/admin/receipts/{receipt_id}/approve', headers=admin_headers)
    assert approve.status_code == 200

    dash = client.get('/api/v1/admin/dashboard', headers=admin_headers)
    assert dash.status_code == 200
    assert 'active_subscriptions' in dash.json()


def test_admin_create_user_and_login_alias(client, admin_headers, auth_headers):
    create = client.post(
        '/api/v1/admin/users',
        json={
            'email': 'nuevo.admin@test.com',
            'full_name': 'Nuevo Admin',
            'password': 'AdminNueva123!',
        },
        headers=admin_headers,
    )
    assert create.status_code == 200
    assert create.json()['role'] == 'admin'

    login_alias = client.post(
        '/api/v1/admin/login',
        json={'identifier': 'nuevo.admin', 'password': 'AdminNueva123!'},
    )
    assert login_alias.status_code == 200
    assert login_alias.json()['user']['email'] == 'nuevo.admin@test.com'

    forbidden = client.post(
        '/api/v1/admin/users',
        json={
            'email': 'otro.admin@test.com',
            'full_name': 'Otro Admin',
            'password': 'AdminNueva123!',
        },
        headers=auth_headers,
    )
    assert forbidden.status_code == 403


def test_current_subscription_reports_trial_after_code_activation(client, admin_headers):
    user_headers = _new_auth_headers(client)

    create_code = client.post(
        '/api/v1/admin/promo-codes',
        json={'code': 'TRIALVIEW01', 'trial_days': 14},
        headers=admin_headers,
    )
    assert create_code.status_code == 200

    activate = client.post(
        '/api/v1/me/subscriptions/activate-code',
        json={'code': 'TRIALVIEW01'},
        headers=user_headers,
    )
    assert activate.status_code == 200

    current = client.get('/api/v1/me/subscriptions/current', headers=user_headers)
    assert current.status_code == 200
    body = current.json()
    assert body['status'] == 'trial'
    assert body['is_trial'] is True
    assert body['trial_days'] is not None


def test_current_subscription_keeps_effective_plan_when_upgrade_is_pending(client, admin_headers):
    user_headers = _new_auth_headers(client)

    create_code = client.post(
        '/api/v1/admin/promo-codes',
        json={'code': 'TRIALEFFECTIVE01', 'trial_days': 14},
        headers=admin_headers,
    )
    assert create_code.status_code == 200

    activate = client.post(
        '/api/v1/me/subscriptions/activate-code',
        json={'code': 'TRIALEFFECTIVE01'},
        headers=user_headers,
    )
    assert activate.status_code == 200

    plans = client.get('/api/v1/me/plans', headers=user_headers)
    assert plans.status_code == 200
    assert plans.json()
    selected_plan = plans.json()[0]

    pending_upgrade = client.post(
        '/api/v1/me/subscriptions/upgrade',
        json={'plan_id': selected_plan['id'], 'payment_method': 'Nequi', 'notes': 'pendiente'},
        headers=user_headers,
    )
    assert pending_upgrade.status_code == 200

    current = client.get('/api/v1/me/subscriptions/current', headers=user_headers)
    assert current.status_code == 200
    body = current.json()

    # Must keep showing effective subscription (trial), not the pending one.
    assert body['status'] == 'trial'
    assert body['is_trial'] is True
