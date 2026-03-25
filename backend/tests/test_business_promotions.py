def test_business_and_promotion_flow(client, auth_headers):
    get_biz = client.get('/api/v1/me/business', headers=auth_headers)
    assert get_biz.status_code == 200

    update_payload = {
        'name': 'Panaderia Aurora',
        'address': 'Cra 1 # 2-3',
        'locality': 'Kennedy',
        'category': 'Panaderia',
        'description': 'Pruebas',
        'whatsapp': '3000000000',
        'instagram': '',
        'facebook': '',
        'youtube': '',
        'has_delivery': True,
        'logo_path': '',
        'published': True,
        'hours': [
            {'day_of_week': 0, 'is_open': True, 'open_time': '08:00:00', 'close_time': '18:00:00'},
            {'day_of_week': 1, 'is_open': True, 'open_time': '08:00:00', 'close_time': '18:00:00'},
        ],
    }
    up = client.put('/api/v1/me/business', json=update_payload, headers=auth_headers)
    assert up.status_code == 200
    assert up.json()['name'] == 'Panaderia Aurora'

    p = client.post(
        '/api/v1/me/promotions',
        json={'title': 'Promo 1', 'content_html': '<p>Hola</p>', 'image_path': ''},
        headers=auth_headers,
    )
    assert p.status_code == 200
    promo_id = p.json()['id']

    pub = client.post(f'/api/v1/me/promotions/{promo_id}/publish', headers=auth_headers)
    assert pub.status_code == 200
    assert pub.json()['status'] == 'published'

    delete_resp = client.delete(f'/api/v1/me/promotions/{promo_id}', headers=auth_headers)
    assert delete_resp.status_code == 200

    promos_after = client.get('/api/v1/me/promotions', headers=auth_headers)
    assert promos_after.status_code == 200
    assert all(str(row['id']) != str(promo_id) for row in promos_after.json())
