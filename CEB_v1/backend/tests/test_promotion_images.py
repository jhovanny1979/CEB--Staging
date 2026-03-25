def test_create_promotion_with_three_images_and_public_detail(client, auth_headers):
    payload = {
        'title': 'Promo Imagenes',
        'content_html': '<p>Descuento por temporada</p>',
        'images': [
            {'file_path': 'uploads/promotion-images/demo/img1.jpg', 'description': 'Banner principal'},
            {'file_path': 'uploads/promotion-images/demo/img2.jpg', 'description': 'Producto destacado'},
            {'file_path': 'uploads/promotion-images/demo/img3.jpg', 'description': 'Condiciones de la oferta'},
        ],
    }
    created = client.post('/api/v1/me/promotions', json=payload, headers=auth_headers)
    assert created.status_code == 200
    promo = created.json()
    assert promo['image_path'] == 'uploads/promotion-images/demo/img1.jpg'
    assert len(promo['images']) == 3
    assert promo['images'][1]['description'] == 'Producto destacado'

    publish = client.post(f"/api/v1/me/promotions/{promo['id']}/publish", headers=auth_headers)
    assert publish.status_code == 200
    assert publish.json()['status'] == 'published'
    assert len(publish.json()['images']) == 3

    my_business = client.get('/api/v1/me/business', headers=auth_headers)
    assert my_business.status_code == 200
    slug = my_business.json()['slug']

    public_view = client.get(f'/api/v1/public/businesses/{slug}')
    assert public_view.status_code == 200
    public_promos = public_view.json()['promotions']
    assert len(public_promos) >= 1
    first = public_promos[0]
    assert first['title'] == 'Promo Imagenes'
    assert len(first['images']) == 3
    assert first['images'][2]['description'] == 'Condiciones de la oferta'


def test_create_promotion_rejects_more_than_three_images(client, auth_headers):
    payload = {
        'title': 'Promo con exceso',
        'content_html': '<p>Test</p>',
        'images': [
            {'file_path': 'uploads/promotion-images/demo/a.jpg', 'description': ''},
            {'file_path': 'uploads/promotion-images/demo/b.jpg', 'description': ''},
            {'file_path': 'uploads/promotion-images/demo/c.jpg', 'description': ''},
            {'file_path': 'uploads/promotion-images/demo/d.jpg', 'description': ''},
        ],
    }
    created = client.post('/api/v1/me/promotions', json=payload, headers=auth_headers)
    assert created.status_code == 400
    assert 'Maximo 3 imagenes por promocion' in created.json()['detail']


def test_update_promotion_allows_editing_content_and_images(client, auth_headers):
    created = client.post(
        '/api/v1/me/promotions',
        json={
            'title': 'Promo inicial',
            'content_html': '<p>Contenido inicial</p>',
            'images': [
                {'file_path': 'uploads/promotion-images/demo/original.jpg', 'description': 'Original'},
            ],
        },
        headers=auth_headers,
    )
    assert created.status_code == 200
    promo_id = created.json()['id']

    updated = client.put(
        f'/api/v1/me/promotions/{promo_id}',
        json={
            'title': 'Promo editada',
            'content_html': '<p>Nuevo contenido</p>',
            'images': [
                {'file_path': 'uploads/promotion-images/demo/new-1.jpg', 'description': 'Nueva portada'},
                {'file_path': 'uploads/promotion-images/demo/new-2.jpg', 'description': 'Detalle oferta'},
            ],
        },
        headers=auth_headers,
    )
    assert updated.status_code == 200
    body = updated.json()
    assert body['title'] == 'Promo editada'
    assert body['content_html'] == '<p>Nuevo contenido</p>'
    assert body['image_path'] == 'uploads/promotion-images/demo/new-1.jpg'
    assert len(body['images']) == 2
    assert body['images'][0]['description'] == 'Nueva portada'
    assert body['images'][1]['description'] == 'Detalle oferta'
