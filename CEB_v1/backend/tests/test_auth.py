def test_auth_flow(client):
    register_payload = {
        'full_name': 'Ana Perez',
        'email': 'ana@test.com',
        'password': 'Ana123456!',
        'business_name': 'Cafe Ana',
        'phone': '3001112233',
        'address': 'Calle 10 # 20-30',
        'locality': 'Chapinero',
        'category': 'Restaurantes',
        'description': 'Cafe de especialidad',
    }

    r = client.post('/api/v1/auth/register', json=register_payload)
    assert r.status_code == 200

    login = client.post('/api/v1/auth/login', json={'email': 'ana@test.com', 'password': 'Ana123456!'})
    assert login.status_code == 200
    assert 'access_token' in login.json()

    token = login.json()['access_token']
    me_business = client.get('/api/v1/me/business', headers={'Authorization': f'Bearer {token}'})
    assert me_business.status_code == 200
    biz = me_business.json()
    assert biz['name'] == 'Cafe Ana'
    assert biz['address'] == 'Calle 10 # 20-30'
    assert biz['locality'] == 'Chapinero'
    assert biz['category'] == 'Restaurantes'
    assert biz['description'] == 'Cafe de especialidad'
    assert biz['whatsapp'] == '3001112233'

    recover = client.post('/api/v1/auth/recover', json={'recovery_type': 'contrasena', 'identifier': 'ana@test.com'})
    assert recover.status_code == 200


def test_verify_email_invalid_token(client):
    resp = client.post('/api/v1/auth/verify-email', json={'token': 'invalido'})
    assert resp.status_code == 404

