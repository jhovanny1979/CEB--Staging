(function () {
  const runtimeHost = (window.location && window.location.hostname) ? window.location.hostname : '127.0.0.1';
  const isLocalRuntime = runtimeHost === '127.0.0.1' || runtimeHost === 'localhost';
  const RUNTIME_HOST_API_BASE = 'http://' + runtimeHost + ':8000/api/v1';
  const DEFAULT_API_BASE = isLocalRuntime
    ? ('http://' + runtimeHost + ':8000/api/v1')
    : '/api/v1';
  const FALLBACK_API_BASES = isLocalRuntime
    ? [DEFAULT_API_BASE, '/api/v1', 'http://127.0.0.1:8000/api/v1', 'http://localhost:8000/api/v1']
    : [DEFAULT_API_BASE, RUNTIME_HOST_API_BASE, 'http://127.0.0.1:8000/api/v1', 'http://localhost:8000/api/v1'];
  const TOKEN_KEY = 'ceb_api_token';
  const ADMIN_TOKEN_KEY = 'ceb_admin_api_token';

  function normalizeBaseUrl(url) {
    if (!url || typeof url !== 'string') return DEFAULT_API_BASE;
    const cleaned = url.trim().replace(/\/+$/, '').replace(/\/api\/v1\.?$/i, '/api/v1');
    if (cleaned.charAt(0) === '/') return cleaned;
    if (!/^https?:\/\//i.test(cleaned)) return DEFAULT_API_BASE;
    return cleaned;
  }

  function extractApiErrorMessage(payload) {
    if (!payload) return 'Error de API';

    const detail = payload.detail || payload.message || payload.error;
    if (!detail) return 'Error de API';

    if (typeof detail === 'string') return detail;

    if (Array.isArray(detail)) {
      const first = detail[0] || {};
      if (typeof first === 'string') return first;
      if (first && typeof first === 'object') {
        return first.msg || first.message || JSON.stringify(first);
      }
      return 'Solicitud invalida';
    }

    if (typeof detail === 'object') {
      return detail.msg || detail.message || JSON.stringify(detail);
    }

    return String(detail);
  }

  function sanitizeRawErrorText(rawText) {
    const raw = String(rawText || '').trim();
    if (!raw) return '';
    if (/<(?:!doctype|html|head|body|title|h1|p)\b/i.test(raw)) {
      return 'El frontend no pudo enviar la solicitud al backend. Inicia con START_CEB.bat o START_CEB_MOVIL.bat.';
    }
    return raw.replace(/\s+/g, ' ').trim();
  }

  function readPersistedApiBase() {
    const raw = String(localStorage.getItem('ceb_api_base') || '').trim();
    if (!raw) return '';
    if (isLocalRuntime) {
      // In desktop local mode, ignore stale LAN/remote API URLs from previous sessions.
      // This keeps admin/client panels tied to the local backend of CEB_v1.
      if (
        raw.charAt(0) === '/' ||
        /^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?(\/|$)/i.test(raw)
      ) {
        return raw;
      }
      return '';
    }
    if (!isLocalRuntime) {
      if (/127\.0\.0\.1|localhost/i.test(raw)) return '';
    }
    return raw;
  }

  let API_BASE = normalizeBaseUrl(window.CEB_API_BASE || readPersistedApiBase() || DEFAULT_API_BASE);

  function getToken(isAdmin) {
    const key = isAdmin ? ADMIN_TOKEN_KEY : TOKEN_KEY;
    return sessionStorage.getItem(key) || localStorage.getItem(key) || '';
  }

  function setToken(token, isAdmin) {
    const key = isAdmin ? ADMIN_TOKEN_KEY : TOKEN_KEY;
    if (token) {
      sessionStorage.setItem(key, token);
      localStorage.setItem(key, token);
      return;
    }
    sessionStorage.removeItem(key);
    localStorage.removeItem(key);
  }

  function looksLikeValidToken(token) {
    if (!token) return false;
    const raw = String(token).trim();
    // Keep token ASCII-only to avoid invalid HTTP header value errors in fetch.
    return !!raw && /^[\x21-\x7E]+$/.test(raw) && raw.indexOf(' ') === -1;
  }

  function dedupeBases(list) {
    const seen = new Set();
    return list
      .map(normalizeBaseUrl)
      .filter((base) => {
        if (seen.has(base)) return false;
        seen.add(base);
        return true;
      });
  }

  async function doFetch(baseUrl, path, options, isAdmin) {
    const opts = options || {};
    const headers = new Headers(opts.headers || {});
    if (!headers.has('Content-Type') && !(opts.body instanceof FormData)) {
      headers.set('Content-Type', 'application/json');
    }

    const token = getToken(isAdmin);
    if (token) {
      if (looksLikeValidToken(token)) {
        headers.set('Authorization', 'Bearer ' + token);
      } else {
        setToken('', isAdmin);
      }
    }

    const response = await fetch(baseUrl + path, {
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
        payload = { message: sanitizeRawErrorText(txt) || txt };
      }
    }

    if (!response.ok) {
      const apiError = new Error(extractApiErrorMessage(payload));
      apiError.status = response.status;
      apiError.baseUrl = baseUrl;
      throw apiError;
    }

    return payload;
  }

  async function request(path, options, isAdmin) {
    const basesToTry = dedupeBases([API_BASE].concat(FALLBACK_API_BASES));
    let lastError = null;

    for (let i = 0; i < basesToTry.length; i += 1) {
      const base = basesToTry[i];
      try {
        const payload = await doFetch(base, path, options, isAdmin);
        if (API_BASE !== base) {
          API_BASE = base;
          localStorage.setItem('ceb_api_base', API_BASE);
          if (window.CEBApi) window.CEBApi.baseUrl = API_BASE;
        }
        return payload;
      } catch (err) {
        lastError = err;
        const status = Number((err && err.status) || 0);
        const msg = String((err && err.message) || '');
        const isNetworkError = !!err && (err.name === 'TypeError' || /failed to fetch|networkerror|load failed/i.test(msg));
        const shouldTryAnotherBase =
          (!isNetworkError && [404, 405, 501, 502, 503].indexOf(status) >= 0);
        if (shouldTryAnotherBase) {
          continue;
        }
        if (!isNetworkError) {
          throw err;
        }
      }
    }

    const msg = String((lastError && lastError.message) || '');
    const isNetworkError = !!lastError && (lastError.name === 'TypeError' || /failed to fetch|networkerror|load failed/i.test(msg));
    if (isNetworkError) {
      throw new Error('No hay conexion con el backend en ' + API_BASE + '. Verifica START_CEB.bat y vuelve a iniciar sesion.');
    }
    throw lastError || new Error('Error de red');
  }

  window.CEBApi = {
    baseUrl: API_BASE,
    setBaseUrl: function (url) {
      API_BASE = normalizeBaseUrl(url);
      localStorage.setItem('ceb_api_base', API_BASE);
      this.baseUrl = API_BASE;
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
    uploadBusinessImage: function (formData) { return request('/me/business/images', { method: 'POST', body: formData }, false); },
    deleteBusinessImage: function (imageId) { return request('/me/business/images?image_id=' + encodeURIComponent(imageId), { method: 'DELETE' }, false); },
    listPromotions: function () { return request('/me/promotions', { method: 'GET' }, false); },
    uploadPromotionImage: function (formData) { return request('/me/promotions/images', { method: 'POST', body: formData }, false); },
    createPromotion: function (body) { return request('/me/promotions', { method: 'POST', body: JSON.stringify(body) }, false); },
    updatePromotion: function (id, body) { return request('/me/promotions/' + encodeURIComponent(id), { method: 'PUT', body: JSON.stringify(body) }, false); },
    publishPromotion: function (id) { return request('/me/promotions/' + id + '/publish', { method: 'POST' }, false); },
    relaunchPromotion: function (id) { return request('/me/promotions/' + id + '/relaunch', { method: 'POST' }, false); },
    deletePromotion: function (id) { return request('/me/promotions/' + encodeURIComponent(id), { method: 'DELETE' }, false); },
    waListContacts: function () { return request('/me/wa/contacts', { method: 'GET' }, false); },
    waCreateContact: function (body) { return request('/me/wa/contacts', { method: 'POST', body: JSON.stringify(body) }, false); },
    waDeleteContact: function (id) { return request('/me/wa/contacts/' + encodeURIComponent(id), { method: 'DELETE' }, false); },
    waListPromotions: function () { return request('/me/wa/promotions', { method: 'GET' }, false); },
    waCreatePromotion: function (body) { return request('/me/wa/promotions', { method: 'POST', body: JSON.stringify(body) }, false); },
    waDeletePromotion: function (id) { return request('/me/wa/promotions/' + encodeURIComponent(id), { method: 'DELETE' }, false); },
    waUploadPromotionImage: function (formData) { return request('/me/wa/promotions/images', { method: 'POST', body: formData }, false); },
    waListSent: function (promoId) {
      var suffix = promoId ? ('?promo_id=' + encodeURIComponent(promoId)) : '';
      return request('/me/wa/sent' + suffix, { method: 'GET' }, false);
    },
    waMarkSent: function (body) { return request('/me/wa/sent', { method: 'POST', body: JSON.stringify(body) }, false); },
    listPlans: function () { return request('/me/plans', { method: 'GET' }, false); },
    currentSubscription: function () { return request('/me/subscriptions/current', { method: 'GET' }, false); },
    publicPlatformSettings: function () { return request('/public/platform-settings', { method: 'GET' }, false); },
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
    adminListUsers: function () { return request('/admin/users', { method: 'GET' }, true); },
    adminCreateUser: function (body) { return request('/admin/users', { method: 'POST', body: JSON.stringify(body) }, true); },
    adminDeleteUser: function (id) { return request('/admin/users/' + id, { method: 'DELETE' }, true); },
    adminSetUserPassword: function (id, body) {
      return request('/admin/users/' + encodeURIComponent(id) + '/set-password', {
        method: 'POST',
        body: JSON.stringify(body || {}),
      }, true);
    },
    adminSetClientPassword: function (id, body) {
      return request('/admin/clients/' + encodeURIComponent(id) + '/set-password', {
        method: 'POST',
        body: JSON.stringify(body || {}),
      }, true);
    },
    adminListPlans: function () { return request('/admin/plans', { method: 'GET' }, true); },
    adminUpdatePlans: function (body) { return request('/admin/plans', { method: 'PUT', body: JSON.stringify(body || []) }, true); },
    adminUpdateLimits: function (body) { return request('/admin/limits', { method: 'PUT', body: JSON.stringify(body || {}) }, true); },
    adminGetPlatformSettings: function () { return request('/admin/platform-settings', { method: 'GET' }, true); },
    adminUpdatePlatformSettings: function (body) { return request('/admin/platform-settings', { method: 'PUT', body: JSON.stringify(body || {}) }, true); },
    adminListBusinesses: function () { return request('/admin/businesses', { method: 'GET' }, true); },
    adminListClients: function () { return request('/admin/clients', { method: 'GET' }, true); },
    adminListPromotions: function () { return request('/admin/promotions', { method: 'GET' }, true); },
  };
})();



