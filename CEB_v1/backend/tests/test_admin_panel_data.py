from uuid import uuid4


def test_admin_lists_include_registered_client_business_and_promotions(client, admin_headers):
    suffix = uuid4().hex[:8]
    email = f'cliente.admin.{suffix}@test.com'
    password = 'Cliente12345!'

    register = client.post(
        '/api/v1/auth/register',
        json={
            'full_name': 'Cliente Admin View',
            'email': email,
            'password': password,
            'business_name': f'Negocio {suffix}',
            'locality': 'Chapinero',
            'category': 'Servicios',
        },
    )
    assert register.status_code == 200

    login = client.post('/api/v1/auth/login', json={'email': email, 'password': password})
    assert login.status_code == 200
    token = login.json()['access_token']
    auth_headers = {'Authorization': f'Bearer {token}'}

    promo = client.post(
        '/api/v1/me/promotions',
        json={'title': f'Promo {suffix}', 'content_html': '<p>Promo test</p>'},
        headers=auth_headers,
    )
    assert promo.status_code == 200

    businesses = client.get('/api/v1/admin/businesses', headers=admin_headers)
    assert businesses.status_code == 200
    assert any(b['owner_email'] == email for b in businesses.json())

    clients = client.get('/api/v1/admin/clients', headers=admin_headers)
    assert clients.status_code == 200
    assert any(c['email'] == email and c['business_name'] for c in clients.json())

    promotions = client.get('/api/v1/admin/promotions', headers=admin_headers)
    assert promotions.status_code == 200
    assert any(p['title'] == f'Promo {suffix}' and p['owner_email'] == email for p in promotions.json())


def test_admin_can_delete_other_admin_but_not_self(client, admin_headers):
    suffix = uuid4().hex[:8]
    admin_email = f'eliminar.admin.{suffix}@test.com'

    create = client.post(
        '/api/v1/admin/users',
        json={
            'email': admin_email,
            'full_name': 'Admin Eliminar',
            'password': 'AdminNueva123!',
        },
        headers=admin_headers,
    )
    assert create.status_code == 200
    created_id = create.json()['id']

    delete_other = client.delete(f'/api/v1/admin/users/{created_id}', headers=admin_headers)
    assert delete_other.status_code == 200

    admins = client.get('/api/v1/admin/users', headers=admin_headers)
    assert admins.status_code == 200
    assert all(u['email'] != admin_email for u in admins.json())

    myself = next(u for u in admins.json() if u['email'] == 'admin@test.com')
    delete_self = client.delete(f"/api/v1/admin/users/{myself['id']}", headers=admin_headers)
    assert delete_self.status_code == 400
