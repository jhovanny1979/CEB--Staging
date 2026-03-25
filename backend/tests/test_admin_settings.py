def test_admin_can_list_and_update_plan_prices(client, admin_headers):
    listed = client.get('/api/v1/admin/plans', headers=admin_headers)
    assert listed.status_code == 200
    plans = listed.json()
    assert len(plans) >= 2

    updates = []
    for plan in plans:
        if plan['code'] == 'PLAN_1M':
            updates.append({'id': plan['id'], 'price_cop': 33000})
        if plan['code'] == 'PLAN_3M':
            updates.append({'id': plan['id'], 'price_cop': 88000})

    assert len(updates) >= 1
    saved = client.put('/api/v1/admin/plans', headers=admin_headers, json=updates)
    assert saved.status_code == 200

    refreshed = client.get('/api/v1/admin/plans', headers=admin_headers)
    assert refreshed.status_code == 200
    by_code = {p['code']: p for p in refreshed.json()}
    if 'PLAN_1M' in by_code:
        assert by_code['PLAN_1M']['price_cop'] == 33000
    if 'PLAN_3M' in by_code:
        assert by_code['PLAN_3M']['price_cop'] == 88000


def test_admin_can_update_platform_limits(client, admin_headers):
    update_limits = client.put(
        '/api/v1/admin/limits',
        headers=admin_headers,
        json={'max_images': 14, 'max_promotions_month': 6},
    )
    assert update_limits.status_code == 200

    listed = client.get('/api/v1/admin/plans', headers=admin_headers)
    assert listed.status_code == 200
    for plan in listed.json():
        assert plan['max_images'] == 14
        assert plan['max_promotions_month'] == 6


def test_public_plans_reflect_admin_updates(client, admin_headers):
    listed = client.get('/api/v1/admin/plans', headers=admin_headers)
    assert listed.status_code == 200
    plans = listed.json()
    assert plans

    first = plans[0]
    new_price = int(first['price_cop']) + 1234
    saved = client.put(
        '/api/v1/admin/plans',
        headers=admin_headers,
        json=[{'id': first['id'], 'price_cop': new_price}],
    )
    assert saved.status_code == 200

    public_list = client.get('/api/v1/public/plans')
    assert public_list.status_code == 200
    public_by_id = {p['id']: p for p in public_list.json()}
    assert first['id'] in public_by_id
    assert int(public_by_id[first['id']]['price_cop']) == new_price


def test_admin_can_update_platform_settings(client, admin_headers):
    current = client.get('/api/v1/admin/platform-settings', headers=admin_headers)
    assert current.status_code == 200

    payload = {
        'trial_days': 21,
        'expiry_notice_days': 7,
        'notify_expiration_alert': True,
        'notify_new_registration': False,
        'notify_payment_confirmation': True,
        'notify_weekly_summary': False,
    }
    updated = client.put('/api/v1/admin/platform-settings', headers=admin_headers, json=payload)
    assert updated.status_code == 200
    body = updated.json()
    assert body['trial_days'] == 21
    assert body['expiry_notice_days'] == 7
    assert body['notify_new_registration'] is False
    assert body['notify_payment_confirmation'] is True

    reloaded = client.get('/api/v1/admin/platform-settings', headers=admin_headers)
    assert reloaded.status_code == 200
    assert reloaded.json() == body


def test_public_platform_settings_reflect_admin_changes(client, admin_headers):
    payload = {
        'trial_days': 45,
        'expiry_notice_days': 9,
        'notify_expiration_alert': False,
        'notify_new_registration': True,
        'notify_payment_confirmation': False,
        'notify_weekly_summary': True,
    }
    saved = client.put('/api/v1/admin/platform-settings', headers=admin_headers, json=payload)
    assert saved.status_code == 200

    public_settings = client.get('/api/v1/public/platform-settings')
    assert public_settings.status_code == 200
    data = public_settings.json()
    assert data['trial_days'] == 45
    assert data['expiry_notice_days'] == 9
    assert data['notify_expiration_alert'] is False


def test_promo_code_defaults_to_platform_trial_days_when_not_sent(client, admin_headers):
    set_days = client.put(
        '/api/v1/admin/platform-settings',
        headers=admin_headers,
        json={
            'trial_days': 19,
            'expiry_notice_days': 5,
            'notify_expiration_alert': True,
            'notify_new_registration': True,
            'notify_payment_confirmation': False,
            'notify_weekly_summary': True,
        },
    )
    assert set_days.status_code == 200

    created = client.post(
        '/api/v1/admin/promo-codes',
        headers=admin_headers,
        json={'code': 'CFGTRIAL19'},
    )
    assert created.status_code == 200
    assert created.json()['trial_days'] == 19
