(function () {
  const API_BASE = window.CEB_API_BASE || localStorage.getItem('ceb_api_base') || 'http://127.0.0.1:8000/api/v1';
  const TOKEN_KEY = 'ceb_api_token';
  const ADMIN_TOKEN_KEY = 'ceb_admin_api_token';

  function getToken(isAdmin) {
    return sessionStorage.getItem(isAdmin ? ADMIN_TOKEN_KEY : TOKEN_KEY) || '';
  }

  function setToken(token, isAdmin) {
    sessionStorage.setItem(isAdmin ? ADMIN_TOKEN_KEY : TOKEN_KEY, token || '');
  }

  async function request(path, options, isAdmin) {
    const opts = options || {};
    const headers = new Headers(opts.headers || {});
    if (!headers.has('Content-Type') && !(opts.body instanceof FormData)) {
      headers.set('Content-Type', 'application/json');
    }

    const token = getToken(isAdmin);
    if (token) {
      headers.set('Authorization', 'Bearer ' + token);
    }

    const response = await fetch(API_BASE + path, {
      method: opts.method || 'GET',
      headers,
      body: opts.body,
    });

    let payload = null;
    const txt = await response.text();
    if (txt) {
      try {
        payload = JSON.parse(txt);
      } catch (e) {
        payload = { message: txt };
      }
    }

    if (!response.ok) {
      const detail = payload && (payload.detail || payload.message) ? (payload.detail || payload.message) : 'Error de API';
      throw new Error(detail);
    }

    return payload;
  }

  window.CEBApi = {
    baseUrl: API_BASE,
    setBaseUrl: function (url) {
      localStorage.setItem('ceb_api_base', url);
    },
    setToken: function (token) { setToken(token, false); },
    getToken: function () { return getToken(false); },
    setAdminToken: function (token) { setToken(token, true); },
    getAdminToken: function () { return getToken(true); },

    register: function (body) { return request('/auth/register', { method: 'POST', body: JSON.stringify(body) }, false); },
    login: function (body) { return request('/auth/login', { method: 'POST', body: JSON.stringify(body) }, false); },
    recover: function (body) { return request('/auth/recover', { method: 'POST', body: JSON.stringify(body) }, false); },

    getBusiness: function () { return request('/me/business', { method: 'GET' }, false); },
    upsertBusiness: function (body) { return request('/me/business', { method: 'PUT', body: JSON.stringify(body) }, false); },
    listPromotions: function () { return request('/me/promotions', { method: 'GET' }, false); },
    createPromotion: function (body) { return request('/me/promotions', { method: 'POST', body: JSON.stringify(body) }, false); },
    publishPromotion: function (id) { return request('/me/promotions/' + id + '/publish', { method: 'POST' }, false); },
    relaunchPromotion: function (id) { return request('/me/promotions/' + id + '/relaunch', { method: 'POST' }, false); },
    listPlans: function () { return request('/me/plans', { method: 'GET' }, false); },
    activateCode: function (body) { return request('/me/subscriptions/activate-code', { method: 'POST', body: JSON.stringify(body) }, false); },
    upgradeSubscription: function (body) { return request('/me/subscriptions/upgrade', { method: 'POST', body: JSON.stringify(body) }, false); },
    submitReceipt: function (formData) { return request('/me/payments/receipts', { method: 'POST', body: formData }, false); },

    adminLogin: function (body) { return request('/admin/login', { method: 'POST', body: JSON.stringify(body) }, false); },
    adminDashboard: function () { return request('/admin/dashboard', { method: 'GET' }, true); },
    adminReceipts: function (statusFilter) {
      const sf = statusFilter || 'pending';
      return request('/admin/receipts?status_filter=' + encodeURIComponent(sf), { method: 'GET' }, true);
    },
    adminApproveReceipt: function (id) { return request('/admin/receipts/' + id + '/approve', { method: 'POST' }, true); },
    adminRejectReceipt: function (id, reason) {
      return request('/admin/receipts/' + id + '/reject', { method: 'POST', body: JSON.stringify({ reason: reason || '' }) }, true);
    },
    adminOutbox: function () { return request('/admin/outbox', { method: 'GET' }, true); },
  };
})();
