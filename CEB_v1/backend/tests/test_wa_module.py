def _login_token(client, email, password):
    login = client.post('/api/v1/auth/login', json={'email': email, 'password': password})
    assert login.status_code == 200
    return login.json()['access_token']


def _register_user(client, full_name, email, password, business_name):
    payload = {
        'full_name': full_name,
        'email': email,
        'password': password,
        'business_name': business_name,
    }
    resp = client.post('/api/v1/auth/register', json=payload)
    assert resp.status_code == 200


def test_wa_contacts_promotions_and_sent_flow(client, auth_headers):
    list_empty = client.get('/api/v1/me/wa/contacts', headers=auth_headers)
    assert list_empty.status_code == 200
    assert list_empty.json() == []

    created_contact = client.post(
        '/api/v1/me/wa/contacts',
        json={'name': 'Maria', 'email': 'maria@test.com', 'phone': '300 123 4567'},
        headers=auth_headers,
    )
    assert created_contact.status_code == 200
    contact = created_contact.json()
    assert contact['name'] == 'Maria'
    assert contact['phone'] == '3001234567'

    duplicate = client.post(
        '/api/v1/me/wa/contacts',
        json={'name': 'Maria 2', 'email': 'maria2@test.com', 'phone': '3001234567'},
        headers=auth_headers,
    )
    assert duplicate.status_code == 400

    created_promo = client.post(
        '/api/v1/me/wa/promotions',
        json={'emoji': '🔥', 'title': 'Promo WA', 'msg': '2x1 en corte', 'image_path': ''},
        headers=auth_headers,
    )
    assert created_promo.status_code == 200
    promo = created_promo.json()
    assert promo['title'] == 'Promo WA'
    assert promo['msg'] == '2x1 en corte'

    mark_sent = client.post(
        '/api/v1/me/wa/sent',
        json={'promo_id': promo['id'], 'contact_id': contact['id']},
        headers=auth_headers,
    )
    assert mark_sent.status_code == 200
    sent = mark_sent.json()
    assert sent['promo_id'] == promo['id']
    assert sent['contact_id'] == contact['id']

    mark_sent_again = client.post(
        '/api/v1/me/wa/sent',
        json={'promo_id': promo['id'], 'contact_id': contact['id']},
        headers=auth_headers,
    )
    assert mark_sent_again.status_code == 200

    sent_rows = client.get('/api/v1/me/wa/sent', headers=auth_headers)
    assert sent_rows.status_code == 200
    assert len(sent_rows.json()) == 1

    delete_contact = client.delete(f"/api/v1/me/wa/contacts/{contact['id']}", headers=auth_headers)
    assert delete_contact.status_code == 200
    list_after_delete = client.get('/api/v1/me/wa/contacts', headers=auth_headers)
    assert list_after_delete.status_code == 200
    assert list_after_delete.json() == []

    delete_promo = client.delete(f"/api/v1/me/wa/promotions/{promo['id']}", headers=auth_headers)
    assert delete_promo.status_code == 200
    promo_rows = client.get('/api/v1/me/wa/promotions', headers=auth_headers)
    assert promo_rows.status_code == 200
    assert promo_rows.json() == []


def test_wa_data_is_isolated_by_authenticated_user(client):
    _register_user(client, 'Cliente Uno', 'cliente1wa@test.com', 'Cliente12345!', 'Negocio Uno')
    _register_user(client, 'Cliente Dos', 'cliente2wa@test.com', 'Cliente12345!', 'Negocio Dos')

    token_1 = _login_token(client, 'cliente1wa@test.com', 'Cliente12345!')
    token_2 = _login_token(client, 'cliente2wa@test.com', 'Cliente12345!')
    headers_1 = {'Authorization': f'Bearer {token_1}'}
    headers_2 = {'Authorization': f'Bearer {token_2}'}

    c1 = client.post('/api/v1/me/wa/contacts', json={'name': 'C1', 'email': '', 'phone': '3000000001'}, headers=headers_1)
    p1 = client.post('/api/v1/me/wa/promotions', json={'emoji': '🔥', 'title': 'P1', 'msg': 'Mensaje 1', 'image_path': ''}, headers=headers_1)
    assert c1.status_code == 200
    assert p1.status_code == 200

    c2 = client.post('/api/v1/me/wa/contacts', json={'name': 'C2', 'email': '', 'phone': '3000000002'}, headers=headers_2)
    p2 = client.post('/api/v1/me/wa/promotions', json={'emoji': '🎉', 'title': 'P2', 'msg': 'Mensaje 2', 'image_path': ''}, headers=headers_2)
    assert c2.status_code == 200
    assert p2.status_code == 200

    list_contacts_1 = client.get('/api/v1/me/wa/contacts', headers=headers_1)
    list_promos_1 = client.get('/api/v1/me/wa/promotions', headers=headers_1)
    assert list_contacts_1.status_code == 200
    assert list_promos_1.status_code == 200
    assert len(list_contacts_1.json()) == 1
    assert len(list_promos_1.json()) == 1
    assert list_contacts_1.json()[0]['phone'] == '3000000001'
    assert list_promos_1.json()[0]['title'] == 'P1'

    list_contacts_2 = client.get('/api/v1/me/wa/contacts', headers=headers_2)
    list_promos_2 = client.get('/api/v1/me/wa/promotions', headers=headers_2)
    assert list_contacts_2.status_code == 200
    assert list_promos_2.status_code == 200
    assert len(list_contacts_2.json()) == 1
    assert len(list_promos_2.json()) == 1
    assert list_contacts_2.json()[0]['phone'] == '3000000002'
    assert list_promos_2.json()[0]['title'] == 'P2'
