(function () {
  if (!window.CEBApi) return;

  function safeToast(msg, type) {
    var text = msg;
    if (Array.isArray(text)) {
      text = text.join('; ');
    } else if (text && typeof text === 'object') {
      text = text.message || text.detail || JSON.stringify(text);
    }
    text = String(text || 'Operacion realizada');
    if (/<(?:!doctype|html|head|body|title|h1|p)\b/i.test(text)) {
      text = 'El frontend no pudo enviar la solicitud al backend. Ejecuta START_CEB.bat o START_CEB_MOVIL.bat.';
    } else {
      text = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    }

    if (typeof window.showToast === 'function') {
      window.showToast(text, type || 'info');
    } else {
      alert(text);
    }
  }

  function pageName() {
    return (location.pathname.split('/').pop() || '').toLowerCase();
  }

  function formValue(selector) {
    var el = document.querySelector(selector);
    return el ? el.value : '';
  }

  function storeRef() {
    try {
      return typeof Store !== 'undefined' ? Store : null;
    } catch (e) {
      return null;
    }
  }

  function fmtDate(raw) {
    if (!raw) return '-';
    var d = new Date(raw);
    if (Number.isNaN(d.getTime())) {
      if (typeof raw === 'string' && raw.indexOf('T') > -1) return raw.split('T')[0];
      return String(raw);
    }
    if (window.CEBFormat && typeof window.CEBFormat.date === 'function') return window.CEBFormat.date(d);
    return d.toLocaleDateString('es-419');
  }

  function fmtDateTime(raw) {
    if (!raw) return '-';
    var d = new Date(raw);
    if (Number.isNaN(d.getTime())) return String(raw);
    if (window.CEBFormat && typeof window.CEBFormat.datetime === 'function') return window.CEBFormat.datetime(d);
    return d.toLocaleString('es-419');
  }

  function fmtMoney(value) {
    var n = Number(value || 0);
    if (window.CEBFormat && typeof window.CEBFormat.number === 'function') return window.CEBFormat.number(n);
    return n.toLocaleString('es-419');
  }

  function fmtCurrencySafe(value) {
    var n = Number(value);
    if (!Number.isFinite(n)) n = 0;
    if (window.CEBFormat && typeof window.CEBFormat.currency === 'function') {
      var out = window.CEBFormat.currency(n);
      if (out && out !== '-') return out;
    }
    return '$' + n.toLocaleString('es-419');
  }

  function promoLimitDisplay(maxPerMonth) {
    var perMonth = Number(maxPerMonth || 4);
    if (!Number.isFinite(perMonth) || perMonth < 1) perMonth = 4;
    // Regla operativa actual del proyecto: 1 promoción por semana, hasta 4 al mes.
    return '1 por semana (' + String(Math.floor(perMonth)) + ' al mes)';
  }

  function planLabelFromStatus(status) {
    var st = String(status || '').toLowerCase();
    if (st === 'trial') return 'Prueba';
    if (st === 'pending') return 'Pendiente';
    if (st === 'active') return 'Activo';
    if (st === 'expired') return 'Vencido';
    if (st === 'cancelled') return 'Cancelado';
    return 'Sin plan';
  }

  function statusText(status) {
    var st = String(status || '').toLowerCase();
    if (st === 'active') return 'Activo';
    if (st === 'pending') return 'Pendiente';
    if (st === 'expired') return 'Vencido';
    if (st === 'trial') return 'Prueba';
    if (st === 'cancelled') return 'Cancelado';
    return 'Sin plan';
  }

  function statusClass(status) {
    var st = String(status || '').toLowerCase();
    if (st === 'active') return 's-act';
    if (st === 'pending') return 's-pen';
    if (st === 'expired' || st === 'cancelled') return 's-exp';
    if (st === 'trial') return 's-fre';
    return 'badge-muted';
  }

  function normalizeBusinessFilter(filterValue) {
    var f = String(filterValue || 'todos').toLowerCase();
    if (f === 'all') return 'todos';
    if (f === 'activo') return 'active';
    if (f === 'pendiente') return 'pending';
    if (f === 'vencido') return 'expired';
    if (f === 'gratis' || f === 'prueba') return 'trial';
    return f;
  }


  function backendOrigin() {
    var runtimeHost = (window.location && window.location.hostname) ? window.location.hostname : '127.0.0.1';
    var base = (window.CEBApi && window.CEBApi.baseUrl) || localStorage.getItem('ceb_api_base') || ('http://' + runtimeHost + ':8000/api/v1');
    var raw = String(base || '').trim();
    if (!raw) return window.location.origin;
    if (raw.charAt(0) === '/') return window.location.origin;
    return raw.replace(/\/?api\/v1\/?$/i, '');
  }

  function adminApiBase() {
    var runtimeHost = (window.location && window.location.hostname) ? window.location.hostname : '127.0.0.1';
    var base = (window.CEBApi && window.CEBApi.baseUrl) || localStorage.getItem('ceb_api_base') || ('http://' + runtimeHost + ':8000/api/v1');
    return String(base || '').replace(/\/+$/, '');
  }

  async function adminPostFallback(path, body) {
    var token = (window.CEBApi && window.CEBApi.getAdminToken) ? window.CEBApi.getAdminToken() : '';
    if (!token) throw new Error('Sesion admin expirada. Inicia sesion nuevamente.');
    var res = await fetch(adminApiBase() + path, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token
      },
      body: JSON.stringify(body || {})
    });
    var payload = {};
    try { payload = await res.json(); } catch (_) { payload = {}; }
    if (!res.ok) throw new Error((payload && (payload.detail || payload.message)) || ('HTTP ' + res.status));
    return payload;
  }

  function resolveMediaUrl(path) {
    var raw = String(path || '').trim();
    if (!raw) return '';

    if (/^https?:\/\//i.test(raw)) {
      try {
        var url = new URL(raw);
        var host = String(url.hostname || '').toLowerCase();
        var port = String(url.port || '');
        if ((host === '127.0.0.1' || host === 'localhost') && port === '5500' && String(url.pathname || '').toLowerCase().indexOf('/uploads/') === 0) {
          return backendOrigin() + url.pathname;
        }
      } catch (e) {
        // ignore parse errors
      }
      return raw;
    }

    if (/^(data:|blob:)/i.test(raw)) return raw;

    var normalized = raw.charAt(0) === '/' ? raw : '/' + raw;
    if (normalized.toLowerCase().indexOf('/uploads/') === 0) {
      return backendOrigin() + normalized;
    }
    return normalized;
  }

  function normalizePromotionImages(rawPromotion) {
    var source = rawPromotion || {};
    var images = Array.isArray(source.images) ? source.images : [];
    var list = [];
    var seen = {};

    for (var i = 0; i < images.length; i += 1) {
      var row = images[i] || {};
      var filePath = String(row.file_path || row.path || '').trim();
      if (!filePath || seen[filePath]) continue;
      seen[filePath] = true;
      list.push({
        file_path: filePath,
        description: String(row.description || '').trim(),
        position: Number(row.position || i),
      });
      if (list.length >= 3) break;
    }

    if (!list.length) {
      var fallbackPath = String(source.image_path || source.img || '').trim();
      if (fallbackPath) {
        list.push({ file_path: fallbackPath, description: '', position: 0 });
      }
    }
    return list;
  }

  async function setupRegistro() {
    var form = document.getElementById('mainForm');
    if (!form) return;

    form.addEventListener(
      'submit',
      async function (e) {
        e.preventDefault();
        e.stopImmediatePropagation();

        if (typeof window.validateForm === 'function' && !window.validateForm(form)) {
          safeToast('Revisa los campos requeridos.', 'error');
          var firstError = form.querySelector('.has-error');
          if (firstError && typeof firstError.scrollIntoView === 'function') {
            firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
          return;
        }

        var terms = document.getElementById('termsCheck');
        if (terms && !terms.checked) {
          safeToast('Debes aceptar los términos y condiciones.', 'error');
          return;
        }

        var body = {
          full_name: formValue('[name="nombre"]').trim() || formValue('[name="negocio"]').trim() || 'Usuario',
          email: formValue('[name="email"]').trim(),
          password: formValue('[name="password"]'),
          business_name: formValue('[name="negocio"]').trim(),
          phone: formValue('[name="telefono"]').trim(),
          address: formValue('[name="direccion"]').trim(),
          locality: formValue('[name="localidad"]').trim(),
          category: formValue('[name="categoria"]').trim(),
          description: formValue('[name="descripcion"]').trim(),
        };

        if (!body.email || !body.password || !body.business_name) {
          safeToast('Completa los datos obligatorios del registro.', 'error');
          var firstError2 = form.querySelector('.has-error');
          if (firstError2 && typeof firstError2.scrollIntoView === 'function') {
            firstError2.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
          return;
        }

        try {
          await window.CEBApi.register(body);
          var store = storeRef();
          if (store) {
            store.set('user', {
              email: body.email,
              nombre: body.business_name || body.full_name,
              plan: 'GRATIS',
              loggedIn: false,
            });
          }

          var successEmail = document.getElementById('successEmail');
          if (successEmail) successEmail.textContent = body.email;

          var registroForm = document.getElementById('registroForm');
          var regSuccess = document.getElementById('regSuccess');
          if (registroForm) registroForm.style.display = 'none';
          if (regSuccess) regSuccess.style.display = 'block';
          safeToast('Registro exitoso. Cuenta creada en backend.', 'success');
        } catch (err) {
          var msg = String((err && err.message) || 'No fue posible registrar.');
          if (/failed to fetch|networkerror|no hay conexion|load failed/i.test(msg)) {
            var runtimeHost = (window.location && window.location.hostname) ? window.location.hostname : '127.0.0.1';
            msg = 'Backend sin respuesta en ' + runtimeHost + ':8000. Ejecuta START_CEB.bat sqlite 0.0.0.0 y reintenta.';
          }
          safeToast(msg, 'error');
        }
      },
      true,
    );
  }

  async function syncBusinessFromApi() {
    var biz = await window.CEBApi.getBusiness();
    if (!biz) return;
    var galleryRows = (Array.isArray(biz.images) ? biz.images : [])
      .map(function (row) {
        return {
          id: row && row.id ? String(row.id) : '',
          file_path: String((row && row.file_path) || '').trim(),
          src: resolveMediaUrl((row && row.file_path) || ''),
        };
      })
      .filter(function (row) { return !!row.file_path; });

    var store = storeRef();
    if (store) {
      var negocioCache = {
        nombre: biz.name,
        email: store.get('user', {}).email || '',
        dir: biz.address,
        localidad: biz.locality,
        categoria: biz.category,
        descripcion: biz.description,
        wp: biz.whatsapp,
        instagram: biz.instagram,
        facebook: biz.facebook,
        youtube: biz.youtube,
        logo: resolveMediaUrl(biz.logo_path),
        domicilios: biz.has_delivery,
        horario: {},
        plan: store.get('user', {}).plan || 'ACTIVO',
      };
      store.set('negocio', negocioCache);
      store.set('gallery', galleryRows.map(function (row) { return row.src; }));
      store.set('galleryMeta', galleryRows);

      var rawSlug = String(biz.slug || biz.name || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-');
      if (rawSlug) {
        var all = store.get('negocios', {}) || {};
        all[rawSlug] = Object.assign({}, negocioCache, {
          slug: rawSlug,
          logo: negocioCache.logo,
          galeria: galleryRows.map(function (row) { return row.src; }),
        });
        store.set('negocios', all);
      }
    }

    if (document.getElementById('negNombre')) document.getElementById('negNombre').value = biz.name || '';
    if (document.getElementById('negEmail')) {
      var store2 = storeRef();
      document.getElementById('negEmail').value = (store2 && store2.get('user', {}).email) || '';
    }
    if (document.getElementById('negDir')) document.getElementById('negDir').value = biz.address || '';
    if (document.getElementById('negLocalidad')) document.getElementById('negLocalidad').value = biz.locality || '';
    if (document.getElementById('negCategoria')) document.getElementById('negCategoria').value = biz.category || '';
    if (document.getElementById('negDesc')) document.getElementById('negDesc').value = biz.description || '';
    if (document.getElementById('negWp')) document.getElementById('negWp').value = biz.whatsapp || '';
    if (document.getElementById('negIg')) document.getElementById('negIg').value = biz.instagram || '';
    if (document.getElementById('negFb')) document.getElementById('negFb').value = biz.facebook || '';
    if (document.getElementById('negYt')) document.getElementById('negYt').value = biz.youtube || '';
    if (document.getElementById('domicilios')) document.getElementById('domicilios').checked = !!biz.has_delivery;

    var grid = document.getElementById('galleryGrid');
    var addBtn = document.getElementById('galleryAddBtn');
    if (grid && addBtn && typeof window.addGalleryThumb === 'function') {
      var existing = Array.prototype.slice.call(grid.querySelectorAll('.gallery-thumb'));
      existing.forEach(function (el) { el.remove(); });
      galleryRows.forEach(function (row) {
        window.addGalleryThumb(row.src);
        var inserted = addBtn.previousElementSibling;
        if (inserted && inserted.classList && inserted.classList.contains('gallery-thumb')) {
          inserted.dataset.imageId = row.id || '';
          inserted.dataset.filePath = row.file_path || '';
        }
      });
      if (typeof window.updateGalleryCount === 'function') {
        try { window.updateGalleryCount(); } catch (e) { /* no-op */ }
      }
    }
  }

  async function syncPromosFromApi() {
    var promos = await window.CEBApi.listPromotions();
    var store = storeRef();
    if (store) {
      store.set(
        'promos',
        promos.map(function (p) {
          var normalizedImages = normalizePromotionImages(p);
          var imagePath = normalizedImages.length ? normalizedImages[0].file_path : '';
          return {
            id: p.id,
            titulo: p.title,
            contenido: p.content_html,
            img: resolveMediaUrl(imagePath),
            image_path: imagePath,
            images: normalizedImages.map(function (img, idx) {
              return {
                file_path: img.file_path,
                description: img.description || '',
                position: Number(img.position || idx),
              };
            }),
            fecha: p.published_at || p.starts_at || '',
            estado: (p.status || '').toUpperCase(),
            publicado: p.published_at || '',
          };
        }),
      );
    }

    var list = document.getElementById('promoList');
    if (!list || typeof window.renderPromoItem !== 'function') return;
    list.innerHTML = '';

    var store2 = storeRef();
    var localPromos = (store2 && store2.get('promos', [])) || [];
    localPromos.forEach(function (p) {
      window.renderPromoItem(p);
    });
  }

  async function migrateLegacyGalleryToBackend() {
    var store = storeRef();
    if (!store || !window.CEBApi || typeof window.CEBApi.uploadBusinessImage !== 'function') return false;

    var legacy = store.get('gallery', []);
    if (!Array.isArray(legacy) || !legacy.length) return false;
    var dataImages = legacy.filter(function (src) { return /^data:image\//i.test(String(src || '')); });
    if (!dataImages.length) return false;

    var uploaded = 0;
    for (var i = 0; i < dataImages.length; i += 1) {
      try {
        var source = String(dataImages[i] || '');
        var response = await fetch(source);
        var blob = await response.blob();
        if (!blob || !(blob.size > 0)) continue;

        var ext = '.jpg';
        var mime = String(blob.type || '').toLowerCase();
        if (mime.indexOf('png') >= 0) ext = '.png';
        else if (mime.indexOf('webp') >= 0) ext = '.webp';
        else if (mime.indexOf('gif') >= 0) ext = '.gif';
        else if (mime.indexOf('jpeg') >= 0 || mime.indexOf('jpg') >= 0) ext = '.jpg';

        var file = new File([blob], 'legacy-' + Date.now() + '-' + String(i + 1) + ext, { type: blob.type || 'image/jpeg' });
        var fd = new FormData();
        fd.append('file', file);
        fd.append('position', String(i));
        await window.CEBApi.uploadBusinessImage(fd);
        uploaded += 1;
      } catch (err) {
        // continue with best effort migration
      }
    }
    return uploaded > 0;
  }

  async function setupPanel() {
    if (!document.getElementById('loginForm')) return;

    var originalLoadPanel = typeof window.loadPanel === 'function' ? window.loadPanel : null;
    var panelConfig = {
      max_images: 10,
      max_promotions_month: 4,
      trial_days: 30,
      expiry_notice_days: 5,
    };

    function forcePanelLogin(reason) {
      var store = storeRef();
      if (store) {
        var current = store.get('user');
        if (current) {
          current.loggedIn = false;
          store.set('user', current);
        }
      }

      window.CEBApi.setToken('');
      if (document.getElementById('panelScreen')) document.getElementById('panelScreen').style.display = 'none';
      if (document.getElementById('loginScreen')) document.getElementById('loginScreen').style.display = 'flex';
      if (document.getElementById('navUserItem')) document.getElementById('navUserItem').style.display = 'none';
      if (reason) safeToast(reason, 'info');
    }

    function isAuthError(err) {
      var msg = String((err && err.message) || '').toLowerCase();
      return msg.indexOf('not authenticated') >= 0 || msg.indexOf('token invalido') >= 0 || msg.indexOf('usuario no activo') >= 0;
    }

    function applyPanelConfigToView() {
      window.__cebPlatformLimits = {
        max_images: Number(panelConfig.max_images || 10),
        max_promotions_month: Number(panelConfig.max_promotions_month || 4),
      };

      var maxImages = Number(panelConfig.max_images || 10);
      var maxPromos = Number(panelConfig.max_promotions_month || 4);
      var trialDays = Number(panelConfig.trial_days || 30);

      if (document.getElementById('galleryMaxImages')) document.getElementById('galleryMaxImages').textContent = String(maxImages);
      if (document.getElementById('galleryMaxImagesStrong')) document.getElementById('galleryMaxImagesStrong').textContent = String(maxImages) + ' imágenes';
      if (document.getElementById('panelPromoCodeHelp')) {
        document.getElementById('panelPromoCodeHelp').textContent =
          'Solicita tu código de prueba gratuita (' + String(trialDays) + ' días) por WhatsApp desde la página principal y actívalo aquí.';
      }
      if (document.getElementById('panelPromoLimitDesc')) {
        document.getElementById('panelPromoLimitDesc').textContent =
          'Crea y gestiona tus promociones semanales. Máximo ' + String(maxPromos) + ' por mes (1 por semana activa).';
      }
      if (document.getElementById('panelPromoLimitReminder')) {
        document.getElementById('panelPromoLimitReminder').textContent =
          'Recuerda que son ' + String(maxPromos) + ' promociones al mes, una por semana.';
      }
      if (document.getElementById('planImagenes')) document.getElementById('planImagenes').textContent = String(maxImages);
      if (document.getElementById('planPromos')) document.getElementById('planPromos').textContent = promoLimitDisplay(maxPromos);
      if (typeof window.updateGalleryCount === 'function') {
        try { window.updateGalleryCount(); } catch (e) { /* no-op */ }
      }
    }

    function setText(id, value) {
      var el = document.getElementById(id);
      if (!el) return;
      el.textContent = String(value || '');
    }

    function ensureTrialFlagNode() {
      var flag = document.getElementById('planTrialFlag');
      if (flag) return flag;
      var badge = document.getElementById('planBadge');
      if (!badge || !badge.parentElement) return null;
      flag = document.createElement('span');
      flag.id = 'planTrialFlag';
      flag.className = 'badge badge-gold';
      flag.style.marginLeft = '8px';
      flag.style.display = 'none';
      badge.parentElement.appendChild(flag);
      return flag;
    }

    function renderCurrentSubscription(summary) {
      if (!summary || typeof summary !== 'object') return;

      var status = String(summary.status || '').toLowerCase();
      var isTrial = !!summary.is_trial || status === 'trial';
      var trialDays = Number(summary.trial_days || panelConfig.trial_days || 30);
      if (!Number.isFinite(trialDays) || trialDays < 1) trialDays = Number(panelConfig.trial_days || 30) || 30;

      var planName = String(summary.plan_name || '').trim();
      if (isTrial) {
        if (!/trial|prueba/i.test(planName)) {
          planName = 'PERIODO DE PRUEBA (' + String(trialDays) + ' DIAS)';
        } else if (!/período/i.test(planName) && /trial/i.test(planName)) {
          planName = 'PERIODO DE PRUEBA (' + String(trialDays) + ' DIAS)';
        }
      }
      if (!planName) planName = 'SIN PLAN';

      setText('planNombre', planName);
      setText('sbPlan', planName);

      var badgeText = isTrial ? 'PRUEBA' : String(statusText(status || 'none')).toUpperCase();
      setText('planBadge', badgeText || 'SIN PLAN');

      if (summary.started_at) setText('planActivacion', fmtDate(summary.started_at));
      if (summary.expires_at) setText('planVencimiento', fmtDate(summary.expires_at));
      setText('planValor', '$' + fmtMoney(summary.price_cop || 0));

      var maxImages = Number(summary.max_images || panelConfig.max_images || 10);
      var maxPromos = Number(summary.max_promotions_month || panelConfig.max_promotions_month || 4);
      if (Number.isFinite(maxImages) && maxImages > 0) setText('planImagenes', String(Math.floor(maxImages)));
      if (Number.isFinite(maxPromos) && maxPromos > 0) setText('planPromos', promoLimitDisplay(maxPromos));

      var trialFlag = ensureTrialFlagNode();
      if (trialFlag) {
        if (isTrial) {
          trialFlag.textContent = 'Periodo de prueba activo';
          trialFlag.style.display = 'inline-flex';
        } else {
          trialFlag.style.display = 'none';
        }
      }

      var store = storeRef();
      if (store) {
        var user = store.get('user', {}) || {};
        user.plan = planName;
        store.set('user', user);
      }
    }

    async function syncCurrentSubscriptionFromApi() {
      try {
        var summary = await window.CEBApi.currentSubscription();
        renderCurrentSubscription(summary);
      } catch (err) {
        if (isAuthError(err)) throw err;
      }
    }

    function renderPlanOptions(plans) {
      var wrap = document.getElementById('planOptions');
      if (!wrap || !Array.isArray(plans) || !plans.length) return;

      var prevSelected = null;
      try {
        prevSelected = (document.querySelector('input[name=planSel]:checked') || {}).value || null;
      } catch (e) {
        prevSelected = null;
      }

      var commercial = plans.filter(function (p) {
        var code = String((p && p.code) || '').toUpperCase();
        var name = String((p && p.name) || '').toUpperCase();
        var price = Number((p && p.price_cop) || 0);
        var isTrial = code.indexOf('TRIAL') >= 0 || name.indexOf('TRIAL') >= 0 || name.indexOf('PRUEBA') >= 0;
        return !isTrial && price > 0;
      });

      var source = commercial.length ? commercial : plans;
      var sorted = source.slice().sort(function (a, b) {
        var ma = Number(a.months || 0);
        var mb = Number(b.months || 0);
        return ma - mb;
      });

      var defaultSelectedId = null;
      for (var s = 0; s < sorted.length; s += 1) {
        if (Number(sorted[s].price_cop || 0) > 0) {
          defaultSelectedId = String(sorted[s].id);
          break;
        }
      }

      var html = sorted
        .map(function (plan, idx) {
          var months = Number(plan.months || 0);
          var unit = Number(plan.price_cop || 0);
          // En panel cliente, el valor configurado por admin es total del plan (no mensual).
          var total = Math.max(0, unit);
          var code = String(plan.code || '').toUpperCase();
          var name = String(plan.name || '').toUpperCase();
          var isTrial = code.indexOf('TRIAL') >= 0 || name.indexOf('TRIAL') >= 0 || name.indexOf('PRUEBA') >= 0 || unit <= 0;
          var isSelected = String(prevSelected || '') === String(plan.id) || (!prevSelected && String(plan.id) === String(defaultSelectedId || sorted[0].id));
          var tag = isTrial ? 'PERIODO DE PRUEBA' : (months + ' ' + (months === 1 ? 'Mes' : 'Meses'));
          var totalLabel = isTrial ? ('Vigencia: ' + String(panelConfig.trial_days || 30) + ' días') : ('Valor total: $' + fmtMoney(total));
          return (
            '<label class="plan-option' + (isSelected ? ' selected' : '') + '">' +
            '<input type="radio" name="planSel" value="' + String(plan.id) + '"' + (isSelected ? ' checked' : '') + ' />' +
            '<div class="po-tag">' + tag + '</div>' +
            '<div class="po-price"><sup>$</sup>' + fmtMoney(unit) + '<small>/plan</small></div>' +
            '<div class="po-total">' + totalLabel + '</div>' +
            '</label>'
          );
        })
        .join('');

      wrap.innerHTML = html;
      wrap.querySelectorAll('.plan-option').forEach(function (opt) {
        opt.addEventListener('click', function () {
          wrap.querySelectorAll('.plan-option').forEach(function (o) { o.classList.remove('selected'); });
          opt.classList.add('selected');
        });
      });
    }

    async function syncPanelPlansFromApi() {
      try {
        var plans = await window.CEBApi.listPlans();
        renderPlanOptions(plans || []);
        if (Array.isArray(plans) && plans.length) {
          var preferredPlan =
            plans.find(function (p) { return Number(p.months || 0) === 1; }) ||
            plans[0];
          if (preferredPlan) {
            panelConfig.max_images = Number(preferredPlan.max_images || panelConfig.max_images || 10);
            panelConfig.max_promotions_month = Number(preferredPlan.max_promotions_month || panelConfig.max_promotions_month || 4);
          }
        }
        applyPanelConfigToView();
      } catch (err) {
        if (isAuthError(err)) throw err;
      }
    }

    async function syncPanelSettingsFromApi() {
      try {
        var cfg = await window.CEBApi.publicPlatformSettings();
        if (cfg && typeof cfg === 'object') {
          if (Number(cfg.trial_days || 0) > 0) panelConfig.trial_days = Number(cfg.trial_days);
          if (Number(cfg.expiry_notice_days || 0) > 0) panelConfig.expiry_notice_days = Number(cfg.expiry_notice_days);
        }
      } catch (err) {
        // no-op
      }
      applyPanelConfigToView();
    }

    function ensurePanelHasApiToken(showMessage) {
      if (window.CEBApi.getToken()) return true;
      forcePanelLogin(showMessage ? 'Tu sesión no estaba conectada al backend. Inicia sesión nuevamente.' : '');
      return false;
    }

    if (originalLoadPanel) {
      window.loadPanel = function (user) {
        if (!ensurePanelHasApiToken(false)) return;
        originalLoadPanel(user);
      };
    }

    window.doLogin = async function () {
      var email = formValue('#loginEmail').trim();
      var password = formValue('#loginPw');
      if (!email || !password) {
        safeToast('Ingresa usuario y contraseña.', 'error');
        return;
      }

      try {
        var res = await window.CEBApi.login({ email: email, password: password });
        window.CEBApi.setToken(res.access_token);

        var store = storeRef();
        if (store) {
          store.set('user', {
            email: res.user.email,
            nombre: res.user.full_name,
            plan: 'ACTIVO',
            loggedIn: true,
          });
        }

        // Fallback visual: if any legacy script conflicts, force panel visibility.
        if (document.getElementById('loginError')) document.getElementById('loginError').style.display = 'none';
        if (document.getElementById('loginScreen')) document.getElementById('loginScreen').style.display = 'none';
        if (document.getElementById('panelScreen')) document.getElementById('panelScreen').style.display = 'block';
        if (document.getElementById('navUserItem')) document.getElementById('navUserItem').style.display = '';
        if (document.getElementById('navUserName')) {
          document.getElementById('navUserName').textContent = res.user.full_name || res.user.email || '';
        }
        if (document.getElementById('sbName')) {
          document.getElementById('sbName').textContent = res.user.full_name || res.user.email || '';
        }

        if (typeof window.loadPanel === 'function') {
          var store2 = storeRef();
          try {
            window.loadPanel(store2 ? store2.get('user') : res.user);
          } catch (e) {
            // Keep fallback state above even if legacy renderer fails.
          }
        }
        await syncPanelSettingsFromApi();
        await syncPanelPlansFromApi();
        await syncBusinessFromApi();
        var migratedGallery = await migrateLegacyGalleryToBackend();
        if (migratedGallery) {
          await syncBusinessFromApi();
          safeToast('Migramos tus imágenes locales del negocio al backend.', 'info');
        }
        await syncPromosFromApi();
        await syncCurrentSubscriptionFromApi();
        safeToast('Sesion iniciada con backend.', 'success');
      } catch (err) {
        var errEl = document.getElementById('loginError');
        if (errEl) errEl.style.display = 'flex';
        safeToast(err.message || 'No fue posible iniciar sesión.', 'error');
      }
    };

    window.doRecover = async function () {
      var tab = window.currentRecTab || 'contraseña';
      var identifier = tab === 'usuario' ? formValue('#recNegocio') : tab === 'contraseña' ? formValue('#recEmail') : formValue('#recCuenta');
      try {
        await window.CEBApi.recover({ recovery_type: tab, identifier: identifier || 'n/a' });
        if (document.getElementById('recSuccess')) document.getElementById('recSuccess').style.display = 'flex';
        safeToast('Solicitud de recuperacion enviada.', 'success');
      } catch (err) {
        safeToast(err.message || 'No fue posible recuperar.', 'error');
      }
    };

    window.guardarNegocio = async function () {
      var store = storeRef();
      var payload = {
        name: formValue('#negNombre').trim(),
        address: formValue('#negDir'),
        locality: formValue('#negLocalidad'),
        category: formValue('#negCategoria'),
        description: formValue('#negDesc'),
        whatsapp: formValue('#negWp'),
        instagram: formValue('#negIg'),
        facebook: formValue('#negFb'),
        youtube: formValue('#negYt'),
        has_delivery: !!(document.getElementById('domicilios') && document.getElementById('domicilios').checked),
        logo_path: (store && store.get('negLogoTemp', '')) || '',
        published: false,
        hours: [
          { day_of_week: 0, is_open: true, open_time: '08:00:00', close_time: '18:00:00' },
          { day_of_week: 1, is_open: true, open_time: '08:00:00', close_time: '18:00:00' },
        ],
      };
      if (!payload.name) {
        safeToast('El nombre del negocio es obligatorio.', 'error');
        return;
      }
      try {
        await window.CEBApi.upsertBusiness(payload);
        await syncBusinessFromApi();
        safeToast('Negocio guardado en backend.', 'success');
      } catch (err) {
        if (isAuthError(err)) {
          forcePanelLogin('Tu sesión vencio. Inicia sesión nuevamente para guardar tu negocio.');
          return;
        }
        safeToast(err.message || 'No fue posible guardar negocio.', 'error');
      }
    };

    var galleryInput = document.getElementById('galleryInput');
    if (galleryInput && !galleryInput.dataset.backendBound) {
      galleryInput.dataset.backendBound = '1';
      galleryInput.addEventListener(
        'change',
        async function (e) {
          e.preventDefault();
          e.stopImmediatePropagation();

          var files = galleryInput.files ? Array.prototype.slice.call(galleryInput.files) : [];
          if (!files.length) return;
          if (!window.CEBApi.getToken || !window.CEBApi.getToken()) {
            forcePanelLogin('Tu sesión vencio. Inicia sesión nuevamente para cargar imágenes.');
            galleryInput.value = '';
            return;
          }

          var current = document.querySelectorAll('#galleryGrid .gallery-thumb').length;
          var maxImages = Number((window.__cebPlatformLimits && window.__cebPlatformLimits.max_images) || 10);
          if (!Number.isFinite(maxImages) || maxImages < 1) maxImages = 10;
          var remaining = Math.max(0, maxImages - current);
          if (remaining <= 0) {
            safeToast('Llegaste al maximo de imágenes del plan.', 'error');
            galleryInput.value = '';
            return;
          }

          var selected = files.slice(0, remaining);
          if (files.length > remaining) {
            safeToast('Solo se cargaron ' + String(remaining) + ' imagen(es) por el limite del plan.', 'info');
          }

          var uploaded = 0;
          for (var i = 0; i < selected.length; i += 1) {
            try {
              var fd = new FormData();
              fd.append('file', selected[i]);
              fd.append('position', String(current + uploaded));
              await window.CEBApi.uploadBusinessImage(fd);
              uploaded += 1;
            } catch (err) {
              if (isAuthError(err)) {
                forcePanelLogin('Tu sesión vencio. Inicia sesión nuevamente para cargar imágenes.');
                galleryInput.value = '';
                return;
              }
              safeToast(err.message || 'No fue posible cargar una imagen del negocio.', 'error');
            }
          }

          galleryInput.value = '';
          await syncBusinessFromApi();
          if (uploaded > 0) safeToast('Imagen(es) del negocio cargadas en backend.', 'success');
        },
        true,
      );
    }

    var originalRemoveGalleryThumb = typeof window.removeGalleryThumb === 'function' ? window.removeGalleryThumb : null;
    window.removeGalleryThumb = async function (btn) {
      var thumb = btn && typeof btn.closest === 'function' ? btn.closest('.gallery-thumb') : null;
      var imageId = thumb && thumb.dataset ? String(thumb.dataset.imageId || '').trim() : '';
      if (imageId && window.CEBApi && typeof window.CEBApi.deleteBusinessImage === 'function') {
        if (!window.confirm('¿Eliminar esta imagen?')) return;
        try {
          await window.CEBApi.deleteBusinessImage(imageId);
          await syncBusinessFromApi();
          safeToast('Imagen eliminada.', 'info');
        } catch (err) {
          if (isAuthError(err)) {
            forcePanelLogin('Tu sesión vencio. Inicia sesión nuevamente para eliminar imágenes.');
            return;
          }
          safeToast(err.message || 'No fue posible eliminar la imagen.', 'error');
        }
        return;
      }
      if (originalRemoveGalleryThumb) {
        return originalRemoveGalleryThumb(btn);
      }
    };

    function getPromoDraftImages() {
      var store = storeRef();
      return (store && store.get('promoImagesTemp', [])) || [];
    }

    function setPromoDraftImages(images) {
      var safe = Array.isArray(images) ? images.slice(0, 3) : [];
      var store = storeRef();
      if (store) store.set('promoImagesTemp', safe);
      return safe;
    }

    function renderPromoDraftImages() {
      var list = document.getElementById('promoImagesList');
      var prev = document.getElementById('promoImgPreview');
      var nameEl = document.getElementById('promoImgName');
      var promoImgInput = document.getElementById('promoImgInput');
      var images = getPromoDraftImages();

      if (promoImgInput) promoImgInput.disabled = images.length >= 3;
      if (prev) {
        if (images.length) {
          prev.src = resolveMediaUrl(images[0].file_path || '');
          prev.style.display = 'block';
        } else {
          prev.removeAttribute('src');
          prev.style.display = 'none';
        }
      }
      if (nameEl) {
        if (images.length) {
          nameEl.textContent = String(images.length) + ' imagen(es) cargada(s). Maximo 3.';
          nameEl.style.display = 'block';
        } else {
          nameEl.textContent = '';
          nameEl.style.display = 'none';
        }
      }
      if (!list) return;
      if (!images.length) {
        list.innerHTML = '';
        return;
      }

      list.innerHTML = images
        .map(function (item, idx) {
          var value = String(item.description || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
          return (
            '<div class="promo-image-item">' +
            '<img src="' +
            resolveMediaUrl(item.file_path || '') +
            '" alt="Imagen promo ' +
            String(idx + 1) +
            '" />' +
            '<textarea id="promoImgDesc' +
            String(idx) +
            '" class="form-input promo-image-desc" maxlength="220" placeholder="Descripcion de esta imagen (opcional)">' +
            value +
            '</textarea>' +
            '<button type="button" class="btn btn-danger btn-sm promo-image-remove" onclick="window.removePromoDraftImage(' +
            String(idx) +
            ')">Quitar</button>' +
            '</div>'
          );
        })
        .join('');
    }

    window.removePromoDraftImage = function (idx) {
      var images = getPromoDraftImages();
      var index = Number(idx);
      if (!Number.isFinite(index)) return;
      images.splice(index, 1);
      setPromoDraftImages(images);
      renderPromoDraftImages();
    };

    var promoImgInput = document.getElementById('promoImgInput');
    var editingPromotionId = null;

    function promoFormCard() {
      return document.getElementById('promoFormCard');
    }

    function promoFormTitle() {
      var card = promoFormCard();
      return card ? card.querySelector('h3') : null;
    }

    function promoFormSubmitButton() {
      return document.querySelector('#promoFormCard button.btn.btn-gold[onclick*="crearPromoción"]')
        || document.querySelector('#promoFormCard .btn.btn-gold');
    }

    function setPromoFormMode(isEdit) {
      var titleEl = promoFormTitle();
      if (titleEl) titleEl.textContent = isEdit ? 'Editar promocion' : 'Nueva promocion';

      var submitBtn = promoFormSubmitButton();
      if (submitBtn) submitBtn.textContent = isEdit ? 'Guardar cambios' : 'Crear promocion';
    }

    function clearPromoEditorForm() {
      var titleEl = document.getElementById('promoTitulo');
      var editorEl = document.getElementById('promoEditor');
      if (titleEl) titleEl.value = '';
      if (editorEl) editorEl.innerHTML = '';
      editingPromotionId = null;
      setPromoDraftImages([]);
      renderPromoDraftImages();
      if (promoImgInput) promoImgInput.value = '';
      setPromoFormMode(false);
    }

    function togglePromoFormVisibility(show) {
      var card = promoFormCard();
      if (!card) return;
      if (show) {
        card.classList.add('show');
        if (typeof card.scrollIntoView === 'function') {
          card.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        return;
      }
      card.classList.remove('show');
    }

    window.togglePromoForm = function (forceShow) {
      var card = promoFormCard();
      if (!card) return;
      var show = typeof forceShow === 'boolean' ? forceShow : !card.classList.contains('show');
      if (show) {
        togglePromoFormVisibility(true);
        return;
      }
      togglePromoFormVisibility(false);
      clearPromoEditorForm();
    };

    function normalizePromoImagesForEdit(promo) {
      var images = Array.isArray(promo && promo.images) ? promo.images : [];
      var out = [];
      for (var i = 0; i < images.length; i += 1) {
        var row = images[i] || {};
        var filePath = String(row.file_path || '').trim();
        if (!filePath) continue;
        out.push({
          file_path: filePath,
          description: String(row.description || '').trim(),
        });
        if (out.length >= 3) break;
      }
      if (!out.length) {
        var fallback = String((promo && promo.image_path) || '').trim();
        if (fallback) out.push({ file_path: fallback, description: '' });
      }
      return out;
    }

    window.editarPromo = async function (id) {
      var promoId = String(id || '').trim();
      if (!promoId) return;
      var store = storeRef();
      var promos = (store && store.get('promos', [])) || [];
      var promo = promos.find(function (row) { return String(row.id) === promoId; });
      if (!promo) {
        safeToast('No se encontro la promocion para editar.', 'error');
        return;
      }

      editingPromotionId = promoId;
      var titleEl = document.getElementById('promoTitulo');
      var editorEl = document.getElementById('promoEditor');
      if (titleEl) titleEl.value = String(promo.titulo || '').trim();
      if (editorEl) editorEl.innerHTML = String(promo.contenido || '').trim();

      setPromoDraftImages(normalizePromoImagesForEdit(promo));
      renderPromoDraftImages();
      setPromoFormMode(true);
      togglePromoFormVisibility(true);
      safeToast('Editando promocion seleccionada.', 'info');
    };

    function resolvePromoThumbUrlSafe(path) {
      if (typeof window.resolvePromoThumbUrl === 'function') return window.resolvePromoThumbUrl(path);
      return resolveMediaUrl(path);
    }

    function getPromoPrimaryImageSafe(promo) {
      if (typeof window.getPromoPrimaryImage === 'function') return window.getPromoPrimaryImage(promo);
      var list = Array.isArray(promo && promo.images) ? promo.images : [];
      if (list.length) return String((list[0] && list[0].file_path) || promo.image_path || promo.img || '');
      return String((promo && (promo.image_path || promo.img)) || '');
    }

    function getPromoImageCountSafe(promo) {
      if (typeof window.getPromoImageCount === 'function') return window.getPromoImageCount(promo);
      var list = Array.isArray(promo && promo.images) ? promo.images : [];
      if (list.length) return list.length;
      return getPromoPrimaryImageSafe(promo) ? 1 : 0;
    }

    window.renderPromoItem = function (promo) {
      var list = document.getElementById('promoList');
      if (!list || !promo) return;

      var div = document.createElement('div');
      var promoId = String(promo.id || '').trim();
      var promoIdEscaped = promoId.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
      var estadoRaw = String(promo.estado || '').trim().toUpperCase();
      var isPublished = estadoRaw === 'PUBLICADO' || estadoRaw === 'PUBLISHED';
      var estadoLabel = isPublished ? 'PUBLICADO' : (estadoRaw || 'NO PUBLICADO');
      var primaryImage = resolvePromoThumbUrlSafe(getPromoPrimaryImageSafe(promo));
      var imageCount = getPromoImageCountSafe(promo);
      var promoTitle = String(promo.titulo || 'Promoción').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

      div.className = 'promo-item' + (isPublished ? ' published' : '');
      div.id = 'promo-' + promoId;
      div.innerHTML =
        (primaryImage
          ? '<img class="pi-thumb" src="' + primaryImage + '" alt="' + promoTitle + '" onerror="this.style.display=\'none\'; var fb=this.nextElementSibling; if(fb){fb.style.display=\'flex\';}" /><div class="pi-thumb" style="display:none;align-items:center;justify-content:center;font-size:1.5rem">&#128227;</div>'
          : '<div class="pi-thumb" style="display:flex;align-items:center;justify-content:center;font-size:1.5rem">&#128227;</div>') +
        '<div class="pi-body">' +
        '<div class="pi-title">' + String(promo.titulo || 'Promoción') + '</div>' +
        '<div class="pi-meta">Creado: ' + String(promo.fecha || '-') + ' | Imagenes: ' + String(imageCount) + ' | Vence: - | Estado: <span class="' + (isPublished ? 'badge badge-green' : 'badge badge-muted') + '">' + estadoLabel + '</span></div>' +
        '<div class="pi-actions">' +
        '<button class="btn btn-outline btn-sm" onclick="editarPromo(\'' + promoIdEscaped + '\')">Editar</button>' +
        (!isPublished
          ? '<button class="btn btn-gold btn-sm" onclick="publicarPromo(\'' + promoIdEscaped + '\')">Publicar</button>'
          : '<button class="btn btn-ghost btn-sm" onclick="relanzarPromo(\'' + promoIdEscaped + '\')">Volver a lanzar</button>') +
        '<button class="btn btn-danger btn-sm" onclick="borrarPromo(\'' + promoIdEscaped + '\')">Borrar</button>' +
        '</div>' +
        '</div>';
      list.prepend(div);
    };

    setPromoFormMode(false);

    if (promoImgInput) {
      promoImgInput.addEventListener('change', async function () {
        var files = promoImgInput.files ? Array.prototype.slice.call(promoImgInput.files) : [];
        if (!files.length) return;
        var current = getPromoDraftImages();
        if (current.length >= 3) {
          safeToast('Maximo 3 imágenes por promocion.', 'error');
          promoImgInput.value = '';
          return;
        }

        var remaining = 3 - current.length;
        var selected = files.slice(0, remaining);
        if (files.length > remaining) {
          safeToast('Solo se cargaron ' + String(remaining) + ' imagen(es) por el limite de 3.', 'info');
        }

        for (var i = 0; i < selected.length; i += 1) {
          var file = selected[i];
          try {
            var fd = new FormData();
            fd.append('file', file);
            var uploaded = await window.CEBApi.uploadPromotionImage(fd);
            var uploadedPath = uploaded && uploaded.file_path ? String(uploaded.file_path) : '';
            if (!uploadedPath) throw new Error('No se recibio ruta de imagen');
            current.push({
              file_path: uploadedPath,
              description: '',
              name: String(file.name || ''),
            });
          } catch (err) {
            if (isAuthError(err)) {
              forcePanelLogin('Tu sesión vencio. Inicia sesión nuevamente para subir imágenes.');
              return;
            }
            safeToast(err.message || 'No fue posible cargar una imagen de la promocion.', 'error');
          }
        }
        setPromoDraftImages(current);
        renderPromoDraftImages();
        promoImgInput.value = '';
      });
    }

    window.crearPromoción = async function () {
      var title = formValue('#promoTitulo').trim();
      var content = (document.getElementById('promoEditor') || {}).innerHTML || '';
      var store = storeRef();
      var images = getPromoDraftImages().map(function (item, idx) {
        var descEl = document.getElementById('promoImgDesc' + String(idx));
        var description = descEl ? String(descEl.value || '').trim() : String(item.description || '').trim();
        return {
          file_path: String(item.file_path || '').trim(),
          description: description,
          position: idx,
        };
      }).filter(function (row) { return row.file_path; }).slice(0, 3);
      var imagePath = images.length ? images[0].file_path : '';

      if (!title || !content || content === '<br>') {
        safeToast('Completa titulo y contenido.', 'error');
        return;
      }

      try {
        var payload = { title: title, content_html: content, image_path: imagePath, images: images };
        var isEditing = !!editingPromotionId;
        if (isEditing) {
          await window.CEBApi.updatePromotion(editingPromotionId, payload);
        } else {
          await window.CEBApi.createPromotion(payload);
        }
        await syncPromosFromApi();
        if (store) store.set('promoImagePathTemp', '');
        clearPromoEditorForm();
        togglePromoFormVisibility(false);
        safeToast(isEditing ? 'Promoción actualizada en backend.' : 'Promoción creada en backend.', 'success');
      } catch (err) {
        if (isAuthError(err)) {
          forcePanelLogin('Tu sesión vencio. Inicia sesión nuevamente para guardar promociones.');
          return;
        }
        safeToast(err.message || 'No fue posible guardar la promocion.', 'error');
      }
    };

    renderPromoDraftImages();

    window.publicarPromo = async function (id) {
      try {
        await window.CEBApi.publishPromotion(id);
        await syncPromosFromApi();
        safeToast('Promoción publicada.', 'success');
      } catch (err) {
        if (isAuthError(err)) {
          forcePanelLogin('Tu sesión vencio. Inicia sesión nuevamente para publicar promociones.');
          return;
        }
        safeToast(err.message || 'No fue posible publicar.', 'error');
      }
    };

    window.relanzarPromo = async function (id) {
      try {
        await window.CEBApi.relaunchPromotion(id);
        await syncPromosFromApi();
        safeToast('Promoción relanzada.', 'success');
      } catch (err) {
        if (isAuthError(err)) {
          forcePanelLogin('Tu sesión vencio. Inicia sesión nuevamente para relanzar promociones.');
          return;
        }
        safeToast(err.message || 'No fue posible relanzar.', 'error');
      }
    };

    window.borrarPromo = async function (id) {
      if (!window.confirm('¿Está seguro de eliminar esta promoción?')) return;
      try {
        await window.CEBApi.deletePromotion(id);
        await syncPromosFromApi();
        safeToast('Promoción eliminada.', 'success');
      } catch (err) {
        if (isAuthError(err)) {
          forcePanelLogin('Tu sesión vencio. Inicia sesión nuevamente para eliminar promociones.');
          return;
        }
        safeToast(err.message || 'No fue posible eliminar la promocion.', 'error');
      }
    };

    window.activarCodigo = async function () {
      var rawCode = formValue('#promoCodeInput').trim();
      var code = rawCode.toUpperCase().replace(/[^A-Z0-9]/g, '');
      if (!code) {
        safeToast('Ingresa un codigo.', 'error');
        return;
      }
      if (code.length < 4) {
        safeToast('El codigo no es valido.', 'error');
        return;
      }
      try {
        await window.CEBApi.activateCode({ code: code });

        var trialDays = 30;
        var imageLimit = 10;
        var promoLimit = 4;
        try {
          var platformCfg = await window.CEBApi.publicPlatformSettings();
          if (platformCfg && Number(platformCfg.trial_days) > 0) {
            trialDays = Number(platformCfg.trial_days);
          }
        } catch (cfgErr) {
          // keep defaults
        }
        try {
          var plansForLimits = await window.CEBApi.listPlans();
          if (Array.isArray(plansForLimits) && plansForLimits.length) {
            var trialPlan = plansForLimits.find(function (p) {
              return String(p.code || '').toUpperCase().indexOf('TRIAL') >= 0;
            }) || plansForLimits.find(function (p) {
              return Number(p.months || 0) === 1;
            }) || plansForLimits[0];
            if (trialPlan) {
              if (Number(trialPlan.max_images || 0) > 0) imageLimit = Number(trialPlan.max_images);
              if (Number(trialPlan.max_promotions_month || 0) > 0) promoLimit = Number(trialPlan.max_promotions_month);
            }
          }
        } catch (planErr) {
          // keep defaults
        }

        var today = new Date();
        var expires = new Date(today.getTime() + trialDays * 24 * 60 * 60 * 1000);
        var trialLabel = 'PERIODO DE PRUEBA (' + String(trialDays) + ' DIAS)';

        var store = storeRef();
        if (store) {
          var u = store.get('user', {}) || {};
          u.plan = trialLabel;
          store.set('user', u);
        }

        if (document.getElementById('promoCodeInput')) document.getElementById('promoCodeInput').value = '';
        if (document.getElementById('planNombre')) document.getElementById('planNombre').textContent = trialLabel;
        if (document.getElementById('sbPlan')) document.getElementById('sbPlan').textContent = trialLabel;
        if (document.getElementById('planBadge')) document.getElementById('planBadge').textContent = trialLabel;
        if (document.getElementById('planImagenes')) document.getElementById('planImagenes').textContent = String(imageLimit);
      if (document.getElementById('planPromos')) document.getElementById('planPromos').textContent = promoLimitDisplay(promoLimit);
        if (document.getElementById('planValor')) document.getElementById('planValor').textContent = '$0';
        if (document.getElementById('planActivacion')) document.getElementById('planActivacion').textContent = fmtDate(today);
        if (document.getElementById('planVencimiento')) document.getElementById('planVencimiento').textContent = fmtDate(expires);
        await syncCurrentSubscriptionFromApi();

        safeToast('Codigo promocional activado correctamente.', 'success');
      } catch (err) {
        if (isAuthError(err)) {
          forcePanelLogin('Tu sesión vencio. Inicia sesión nuevamente para activar codigos.');
          return;
        }
        safeToast(err.message || 'No fue posible activar codigo.', 'error');
      }
    };

    window.actualizarSuscripcion = async function () {
      try {
        var selected = document.querySelector('input[name=planSel]:checked');
        var selectedPlanId = selected ? String(selected.value || '') : '';
        var plans = await window.CEBApi.listPlans();
        var plan =
          plans.find(function (p) {
            return String(p.id) === selectedPlanId;
          }) || plans[0];
        if (!plan) {
          safeToast('No hay planes disponibles.', 'error');
          return;
        }

        await window.CEBApi.upgradeSubscription({ plan_id: plan.id, payment_method: 'manual', notes: 'Desde panel cliente' });
        await syncCurrentSubscriptionFromApi();
        safeToast('Solicitud enviada para aprobacion.', 'success');
      } catch (err) {
        if (isAuthError(err)) {
          forcePanelLogin('Tu sesión vencio. Inicia sesión nuevamente para actualizar la suscripcion.');
          return;
        }
        safeToast(err.message || 'No fue posible actualizar suscripcion.', 'error');
      }
    };

    window.doLogout = function () {
      var store = storeRef();
      if (store) {
        var current = store.get('user');
        if (current) {
          current.loggedIn = false;
          store.set('user', current);
        }
      }
      window.CEBApi.setToken('');
      if (document.getElementById('panelScreen')) document.getElementById('panelScreen').style.display = 'none';
      if (document.getElementById('loginScreen')) document.getElementById('loginScreen').style.display = 'flex';
      if (document.getElementById('navUserItem')) document.getElementById('navUserItem').style.display = 'none';
      safeToast('Sesion cerrada.', 'info');
    };

    if (document.getElementById('panelScreen') && document.getElementById('panelScreen').style.display !== 'none') {
      if (!ensurePanelHasApiToken(true)) return;
      try {
        await syncPanelSettingsFromApi();
        await syncPanelPlansFromApi();
        await syncBusinessFromApi();
        var migratedGalleryExisting = await migrateLegacyGalleryToBackend();
        if (migratedGalleryExisting) {
          await syncBusinessFromApi();
          safeToast('Migramos tus imágenes locales del negocio al backend.', 'info');
        }
        await syncPromosFromApi();
        await syncCurrentSubscriptionFromApi();
      } catch (err) {
        if (isAuthError(err)) {
          forcePanelLogin('Tu sesión local no estaba autenticada contra el backend. Inicia sesión otra vez.');
          return;
        }
      }
    }
  }

  async function setupAdmin() {
    if (!document.getElementById('adminLogin')) return;

    var adminState = {
      currentAdmin: null,
      filter: 'todos',
      businesses: [],
      clients: [],
      promotions: [],
      pendingReceipts: [],
      admins: [],
      plans: [],
      planByCode: {},
      platformSettings: {
        trial_days: 30,
        expiry_notice_days: 5,
        notify_expiration_alert: true,
        notify_new_registration: true,
        notify_payment_confirmation: false,
        notify_weekly_summary: true,
      },
    };

    function setInputValue(id, value) {
      var el = document.getElementById(id);
      if (!el) return;
      if (value === undefined || value === null || value === '') return;
      el.value = String(value);
    }

    function getNumberInput(id, fallback) {
      var raw = formValue('#' + id);
      var num = Number(raw);
      if (!Number.isFinite(num)) return Number(fallback || 0);
      return Math.round(num);
    }

    function setToggleValue(id, value) {
      var el = document.getElementById(id);
      if (!el) return;
      if (value) el.classList.add('on');
      else el.classList.remove('on');
    }

    function getToggleValue(id, fallback) {
      var el = document.getElementById(id);
      if (!el) return !!fallback;
      return el.classList.contains('on');
    }

    function firstPlan() {
      return (adminState.plans && adminState.plans.length) ? adminState.plans[0] : null;
    }

    function rebuildPlanMap() {
      adminState.planByCode = {};
      (adminState.plans || []).forEach(function (p) {
        adminState.planByCode[String(p.code || '').toUpperCase()] = p;
      });
    }

    function findPlanByMonths(months) {
      var m = Number(months);
      if (!Number.isFinite(m) || m <= 0) return null;

      rebuildPlanMap();
      var candidates = [];
      if (m === 1) candidates = ['PLAN_1M', 'PLAN_1', 'PLAN1M', 'PLAN1'];
      if (m === 3) candidates = ['PLAN_3M', 'PLAN_3', 'PLAN3M', 'PLAN3'];
      if (m === 6) candidates = ['PLAN_6M', 'PLAN_6', 'PLAN6M', 'PLAN6'];
      if (m === 12) candidates = ['PLAN_12M', 'PLAN_12', 'PLAN12M', 'PLAN12'];

      for (var i = 0; i < candidates.length; i += 1) {
        var byCode = adminState.planByCode[candidates[i]];
        if (byCode) return byCode;
      }

      var rows = adminState.plans || [];
      for (var j = 0; j < rows.length; j += 1) {
        if (Number(rows[j].months) === m) return rows[j];
      }

      for (var k = 0; k < rows.length; k += 1) {
        var code = String(rows[k].code || '').toUpperCase();
        var match = code.match(/(\d+)/);
        if (match && Number(match[1]) === m) return rows[k];
      }
      return null;
    }

    function applySettingsToForm() {
      rebuildPlanMap();

      var p1 = findPlanByMonths(1);
      var p3 = findPlanByMonths(3);
      var p6 = findPlanByMonths(6);
      var p12 = findPlanByMonths(12);
      var base = p1 || p3 || p6 || p12 || firstPlan();

      setInputValue('adminPrice1m', p1 && p1.price_cop);
      setInputValue('adminPrice3m', p3 && p3.price_cop);
      setInputValue('adminPrice6m', p6 && p6.price_cop);
      setInputValue('adminPrice12m', p12 && p12.price_cop);

      setInputValue('adminMaxImages', base && base.max_images);
      setInputValue('adminMaxPromos', base && base.max_promotions_month);

      setInputValue('adminTrialDays', adminState.platformSettings.trial_days || 30);
      setInputValue('adminExpiryNoticeDays', adminState.platformSettings.expiry_notice_days || 5);
      setToggleValue('adminNotifyExpiration', adminState.platformSettings.notify_expiration_alert);
      setToggleValue('adminNotifyNewRegistration', adminState.platformSettings.notify_new_registration);
      setToggleValue('adminNotifyPaymentConfirmation', adminState.platformSettings.notify_payment_confirmation);
      setToggleValue('adminNotifyWeeklySummary', adminState.platformSettings.notify_weekly_summary);
    }

    function collectPlatformSettingsFromForm() {
      var trialDays = getNumberInput('adminTrialDays', adminState.platformSettings.trial_days || 30);
      var expiryNoticeDays = getNumberInput('adminExpiryNoticeDays', adminState.platformSettings.expiry_notice_days || 5);
      if (trialDays < 1 || expiryNoticeDays < 1) {
        throw new Error('Los días de prueba y aviso deben ser mayores o iguales a 1.');
      }
      return {
        trial_days: trialDays,
        expiry_notice_days: expiryNoticeDays,
        notify_expiration_alert: getToggleValue('adminNotifyExpiration', true),
        notify_new_registration: getToggleValue('adminNotifyNewRegistration', true),
        notify_payment_confirmation: getToggleValue('adminNotifyPaymentConfirmation', false),
        notify_weekly_summary: getToggleValue('adminNotifyWeeklySummary', true),
      };
    }

    function businessById(id) {
      var bid = String(id || '');
      for (var i = 0; i < adminState.businesses.length; i += 1) {
        if (String(adminState.businesses[i].id) === bid) return adminState.businesses[i];
      }
      return null;
    }

    function renderPending(rows) {
      var body = document.getElementById('bPendientes');
      var empty = document.getElementById('emPend');
      var count = document.getElementById('penCount');
      if (!body) return;

      var list = rows || [];
      if (count) count.textContent = String(list.length);
      if (!list.length) {
        body.innerHTML = '';
        if (empty) empty.style.display = 'block';
        return;
      }

      if (empty) empty.style.display = 'none';
      body.innerHTML = list
        .map(function (r) {
          var biz = businessById(r.business_id);
          var bizLabel = biz ? biz.name : String(r.business_id || '').slice(0, 8);
          return (
            '<tr>' +
            '<td><div class="tn">' + bizLabel + '</div><div class="tm">' + (biz ? biz.owner_email : '') + '</div></td>' +
            '<td class="tmo">' + String(r.plan_id || '').slice(0, 8) + '</td>' +
            '<td style="font-weight:600;color:var(--gold-light)">' +
            ((window.CEBFormat && typeof window.CEBFormat.currency === 'function')
              ? window.CEBFormat.currency(Number(r.amount_cop || 0))
              : '$' + Number(r.amount_cop || 0).toLocaleString('es-419')) +
            '</td>' +
            '<td class="tm">' + (r.payment_method || '') + '</td>' +
            '<td class="tm">' + fmtDateTime(r.submitted_at) + '</td>' +
            '<td><div class="tact">' +
            '<button class="ab suc" onclick="window.__adminApprove(\'' + r.id + '\')">Aprobar</button>' +
            '<button class="ab dan" onclick="window.__adminReject(\'' + r.id + '\')">Rechazar</button>' +
            '</div></td>' +
            '</tr>'
          );
        })
        .join('');
    }

    function planMonthsFromLabel(label) {
      var text = String(label || '').toUpperCase();
      var direct = text.match(/(\d+)\s*(MES|MESES|M)\b/);
      if (direct && direct[1]) return Number(direct[1]);

      var anyDigits = text.match(/(\d+)/);
      if (anyDigits && anyDigits[1]) return Number(anyDigits[1]);
      return null;
    }

    function priceFromPlanLabel(label) {
      var months = planMonthsFromLabel(label);
      if (!months) return null;
      var plan = findPlanByMonths(months);
      if (!plan) return null;
      var price = Number(plan.price_cop);
      if (!Number.isFinite(price)) return null;
      return price;
    }

    function normalizedSubscriptionStatus(row) {
      var r = row || {};
      var status = String(r.subscription_status || '').toLowerCase();
      var plan = String(r.subscription_plan || '').toLowerCase();
      var planCode = String(r.subscription_plan_code || r.plan_code || '').toLowerCase();
      var rowAmount = subscriptionValueFromRow(r);
      var isTrial = !!r.is_trial || status === 'trial' || plan.indexOf('trial') >= 0 || plan.indexOf('prueba') >= 0 || planCode.indexOf('trial') >= 0;
      if (!isTrial && status === 'active' && Number.isFinite(rowAmount) && rowAmount <= 0) isTrial = true;
      if (isTrial) return 'trial';
      if (status === 'active' || status === 'pending' || status === 'expired' || status === 'cancelled') return status;
      if (r.is_active) return 'active';
      return status || 'none';
    }

    function subscriptionValueFromRow(row) {
      var r = row || {};
      var keys = ['subscription_amount', 'subscription_price_cop', 'subscription_price', 'plan_price_cop', 'amount', 'value', 'price_cop'];
      for (var i = 0; i < keys.length; i += 1) {
        var n = Number(r[keys[i]]);
        if (Number.isFinite(n)) return n;
      }
      var fallback = priceFromPlanLabel(r.subscription_plan || '');
      return Number.isFinite(fallback) ? fallback : null;
    }

    function subscribedBusinessesRows() {
      return (adminState.businesses || []).filter(function (r) {
        var st = normalizedSubscriptionStatus(r);
        return st === 'active' || st === 'trial';
      });
    }

    function activeBusinessesRows() {
      return subscribedBusinessesRows().filter(function (r) {
        return normalizedSubscriptionStatus(r) === 'active';
      });
    }

    function computeAdminDashboardMetrics() {
      var totalBusinesses = (adminState.businesses || []).length;
      var activeRows = activeBusinessesRows();
      var trialRows = subscribedBusinessesRows().filter(function (r) {
        return normalizedSubscriptionStatus(r) === 'trial';
      });
      var pendingReceipts = (adminState.pendingReceipts || []).length;
      var income = activeRows.reduce(function (acc, row) {
        var value = subscriptionValueFromRow(row);
        return acc + (Number.isFinite(value) ? value : 0);
      }, 0);
      return {
        total_businesses: totalBusinesses,
        active_subscriptions: activeRows.length,
        trial_subscriptions: trialRows.length,
        total_subscriptions: activeRows.length + trialRows.length,
        pending_receipts: pendingReceipts,
        income_active_total: income,
      };
    }

    function renderActiveSubscriptions() {
      var body = document.getElementById('bHistorial');
      if (!body) return;

      var rows = subscribedBusinessesRows()
        .slice()
        .sort(function (a, b) {
          var da = new Date(a.subscription_expires_at || 0).getTime();
          var db = new Date(b.subscription_expires_at || 0).getTime();
          return db - da;
        });

      if (!rows.length) {
        body.innerHTML = '<tr><td colspan="6" class="tm" style="text-align:center;padding:22px">Sin suscripciones activas.</td></tr>';
        return;
      }

      body.innerHTML = rows
        .map(function (r) {
          var status = normalizedSubscriptionStatus(r);
          var plan = r.subscription_plan || planLabelFromStatus(status);
          var price = subscriptionValueFromRow(r);
          var valueHtml = '-';
          if (Number.isFinite(price)) {
            valueHtml = fmtCurrencySafe(price);
          }

          return (
            '<tr>' +
            '<td class="tn">' + (r.name || '-') + '</td>' +
            '<td class="tmo">' + plan + '</td>' +
            '<td style="font-weight:600;color:var(--gold-light)">' + valueHtml + '</td>' +
            '<td class="tm">' + fmtDate(r.created_at) + '</td>' +
            '<td class="tm">' + fmtDate(r.subscription_expires_at) + '</td>' +
            '<td><span class="badge ' + statusClass(status) + '" style="font-size:.63rem">' + statusText(status) + '</span></td>' +
            '</tr>'
          );
        })
        .join('');
    }

    function renderBusinesses() {
      var body = document.getElementById('bNegocios');
      var empty = document.getElementById('emNegocios');
      var input = document.getElementById('qNegocios');
      var q = input ? String(input.value || '').toLowerCase().trim() : '';
      if (!body) return;

      var rows = adminState.businesses.slice();
      var currentFilter = normalizeBusinessFilter(adminState.filter);
      if (currentFilter !== 'todos') {
        rows = rows.filter(function (r) {
          var st = normalizedSubscriptionStatus(r);
          if (currentFilter === 'trial') return st === 'trial';
          if (currentFilter === 'expired') return st === 'expired' || st === 'cancelled';
          return st === currentFilter;
        });
      }

      if (q) {
        rows = rows.filter(function (r) {
          return (
            String(r.name || '').toLowerCase().indexOf(q) >= 0 ||
            String(r.owner_email || '').toLowerCase().indexOf(q) >= 0 ||
            String(r.locality || '').toLowerCase().indexOf(q) >= 0 ||
            String(r.category || '').toLowerCase().indexOf(q) >= 0
          );
        });
      }

      if (!rows.length) {
        body.innerHTML = '';
        if (empty) empty.style.display = 'block';
        return;
      }

      if (empty) empty.style.display = 'none';
      body.innerHTML = rows
        .map(function (r) {
          var businessNameSafe = String((r.name || '').replace(/'/g, ''));
          var status = normalizedSubscriptionStatus(r);
          return (
            '<tr>' +
            '<td><div class="tn">' + (r.name || '') + '</div><div class="tm">' + (r.owner_email || '') + '</div></td>' +
            '<td class="tm">' + (r.category || '-') + '</td>' +
            '<td class="tm">' + (r.locality || '-') + '</td>' +
            '<td class="tmo">' + (r.subscription_plan || planLabelFromStatus(status)) + '</td>' +
            '<td><span class="badge ' + statusClass(status) + '" style="font-size:.63rem">' + statusText(status) + '</span></td>' +
            '<td class="tm">' + fmtDate(r.subscription_expires_at) + '</td>' +
            '<td><div class="tact">' +
            '<button class="ab" onclick="window.__openBusiness(\'' + (r.slug || '') + '\')">Ver</button>' +
            (r.owner_user_id ? '<button class="ab" onclick="window.__changeBusinessPassword(\'' + r.owner_user_id + '\',\'' + businessNameSafe + '\')">Cambiar clave</button>' : '') +
            '</div></td>' +
            '</tr>'
          );
        })
        .join('');
    }

    function renderClients() {
      var body = document.getElementById('bUsuarios');
      var input = document.getElementById('qUsuarios');
      var q = input ? String(input.value || '').toLowerCase().trim() : '';
      if (!body) return;

      var rows = adminState.clients.slice();
      if (q) {
        rows = rows.filter(function (r) {
          return (
            String(r.email || '').toLowerCase().indexOf(q) >= 0 ||
            String(r.full_name || '').toLowerCase().indexOf(q) >= 0 ||
            String(r.business_name || '').toLowerCase().indexOf(q) >= 0
          );
        });
      }

      body.innerHTML = rows
        .map(function (r) {
          var status = r.is_active ? (r.subscription_status || 'active') : 'cancelled';
          return (
            '<tr>' +
            '<td><div class="tn">' + (r.email || '') + '</div></td>' +
            '<td>' + (r.business_name || '-') + '</td>' +
            '<td class="tm">' + fmtDate(r.created_at) + '</td>' +
            '<td><span class="badge ' + statusClass(status) + '" style="font-size:.63rem">' + statusText(status) + '</span></td>' +
            '<td><div class="tact">' +
            (r.business_id ? '<button class="ab" onclick="window.__openBusinessByClient(\'' + r.id + '\')">Ver negocio</button>' : '<span class="tm">Sin negocio</span>') +
            '</div></td>' +
            '</tr>'
          );
        })
        .join('');
    }

    function renderPromotions() {
      var body = document.getElementById('bPromos');
      var empty = document.getElementById('emPromos');
      if (!body) return;

      var rows = adminState.promotions || [];
      if (!rows.length) {
        body.innerHTML = '';
        if (empty) empty.style.display = 'block';
        return;
      }

      if (empty) empty.style.display = 'none';
      body.innerHTML = rows
        .map(function (r) {
          return (
            '<tr>' +
            '<td class="tn">' + (r.business_name || '-') + '</td>' +
            '<td>' + (r.title || '') + '</td>' +
            '<td class="tm">' + fmtDate(r.published_at || r.created_at) + '</td>' +
            '<td><span class="badge ' + statusClass(r.status) + '" style="font-size:.63rem">' + statusText(r.status) + '</span></td>' +
            '<td><div class="tact"><button class="ab" onclick="window.__openBusiness(\'' + (r.business_slug || '') + '\')">Ver negocio</button></div></td>' +
            '</tr>'
          );
        })
        .join('');
    }

    function renderAdminUsers(rows) {
      var body = document.getElementById('bAdminUsers');
      if (!body) return;

      var list = rows || [];
      if (!list.length) {
        body.innerHTML = '<tr><td colspan="5" class="tm">Sin administradores registrados.</td></tr>';
        return;
      }

      body.innerHTML = list
        .map(function (u) {
          var isCurrent = adminState.currentAdmin && String(adminState.currentAdmin.id) === String(u.id);
          var fullNameSafe = String((u.full_name || '').replace(/'/g, ''));
          return (
            '<tr>' +
            '<td>' + (u.full_name || '') + '</td>' +
            '<td class="tm">' + (u.email || '') + '</td>' +
            '<td>' + (u.is_email_verified ? '<span class="badge badge-green">Verificado</span>' : '<span class="badge badge-red">Pendiente</span>') + '</td>' +
            '<td class="tm">' + (u.role || '') + '</td>' +
            '<td><div class="tact">' +
            '<button class="ab" onclick="window.__changeAdminPassword(\'' + u.id + '\',\'' + fullNameSafe + '\')">Cambiar clave</button>' +
            (isCurrent
              ? '<span class="tm">Sesion actual</span>'
              : '<button class="ab dan" onclick="window.__deleteAdmin(\'' + u.id + '\',\'' + fullNameSafe + '\')">Eliminar</button>') +
            '</div></td>' +
            '</tr>'
          );
        })
        .join('');
    }

    async function loadAdminData() {
      try {
        var tasks = [
          window.CEBApi.adminDashboard(),
          window.CEBApi.adminReceipts('pending'),
          window.CEBApi.adminListBusinesses(),
          window.CEBApi.adminListClients(),
          window.CEBApi.adminListPromotions(),
          window.CEBApi.adminListUsers(),
          window.CEBApi.adminListPlans().catch(function () { return []; }),
          window.CEBApi.adminGetPlatformSettings().catch(function () { return null; }),
        ];

        var responses = await Promise.all(
          tasks.map(function (promise) {
            return Promise.resolve(promise)
              .then(function (value) { return { ok: true, value: value }; })
              .catch(function (error) { return { ok: false, error: error }; });
          })
        );

        function resultAt(index, fallback) {
          var row = responses[index];
          return row && row.ok ? row.value : fallback;
        }

        var dashboard = resultAt(0, {}) || {};
        adminState.pendingReceipts = resultAt(1, []) || [];
        adminState.businesses = resultAt(2, []) || [];
        adminState.clients = resultAt(3, []) || [];
        adminState.promotions = resultAt(4, []) || [];
        adminState.admins = resultAt(5, []) || [];
        adminState.plans = resultAt(6, []) || [];
        var settingsResponse = resultAt(7, null);
        if (settingsResponse) {
          adminState.platformSettings = settingsResponse;
        }

        var metrics = computeAdminDashboardMetrics();
        if ((metrics.total_businesses || 0) === 0) {
          var dashboardTotal = Number(dashboard.total_businesses);
          if (Number.isFinite(dashboardTotal) && dashboardTotal > 0) metrics.total_businesses = dashboardTotal;
        }
        if ((metrics.active_subscriptions || 0) === 0) {
          var dashboardActive = Number(dashboard.active_subscriptions);
          if (Number.isFinite(dashboardActive) && dashboardActive > 0) metrics.active_subscriptions = dashboardActive;
        }
        if ((metrics.pending_receipts || 0) === 0) {
          var dashboardPending = Number(dashboard.pending_receipts);
          if (Number.isFinite(dashboardPending) && dashboardPending >= 0) metrics.pending_receipts = dashboardPending;
        }
        if ((metrics.income_active_total || 0) === 0) {
          var dashboardIncome = Number(
            dashboard.income_active_total || dashboard.income_this_month || dashboard.income_month || 0
          );
          if (Number.isFinite(dashboardIncome) && dashboardIncome > 0) metrics.income_active_total = dashboardIncome;
        }

        if (document.getElementById('k-total')) document.getElementById('k-total').textContent = metrics.total_businesses || 0;
        if (document.getElementById('k-act')) document.getElementById('k-act').textContent = metrics.active_subscriptions || 0;
        if (document.getElementById('k-pen')) document.getElementById('k-pen').textContent = metrics.pending_receipts || 0;
        if (document.getElementById('k-ing')) {
          document.getElementById('k-ing').textContent = fmtCurrencySafe(metrics.income_active_total || 0);
        }
        if (document.getElementById('sbNegocios')) document.getElementById('sbNegocios').textContent = metrics.total_businesses || 0;
        if (document.getElementById('sbPendientes')) document.getElementById('sbPendientes').textContent = metrics.active_subscriptions || 0;

        renderPending(adminState.pendingReceipts);
        renderActiveSubscriptions();
        renderBusinesses();
        renderClients();
        renderPromotions();
        renderAdminUsers(adminState.admins);
        applySettingsToForm();

        var failed = responses.filter(function (r) { return !r.ok; });
        if (failed.length) {
          safeToast('Algunas fuentes del panel admin fallaron. Se mostraron los datos disponibles.', 'warning');
        }
      } catch (err) {
        safeToast(err.message || 'No fue posible cargar datos admin.', 'error');
      }
    }

    window.renderNegocios = renderBusinesses;
    window.renderUsuarios = renderClients;
    window.renderPromos = renderPromotions;
    window.setFilter = function (f, el) {
      adminState.filter = normalizeBusinessFilter(f || 'todos');
      var tabs = document.querySelectorAll('.ftab');
      tabs.forEach(function (tab) {
        tab.classList.remove('active');
      });
      if (el) el.classList.add('active');
      renderBusinesses();
    };

    function bindGlobalName(name) {
      try {
        window.eval(name + ' = window.' + name);
      } catch (e) {
        // no-op
      }
    }
    bindGlobalName('renderNegocios');
    bindGlobalName('renderUsuarios');
    bindGlobalName('renderPromos');
    bindGlobalName('setFilter');

    window.__openBusiness = function (slug) {
      var clean = String(slug || '').trim();
      if (!clean) {
        safeToast('Este negocio aun no tiene URL publica.', 'info');
        return;
      }
      window.open('negocio.html?empresa=' + encodeURIComponent(clean), '_blank');
    };

    window.__openBusinessByClient = function (clientId) {
      var cid = String(clientId || '');
      var row = null;
      for (var i = 0; i < adminState.clients.length; i += 1) {
        if (String(adminState.clients[i].id) === cid) {
          row = adminState.clients[i];
          break;
        }
      }
      if (!row || !row.business_id) {
        safeToast('El cliente no tiene negocio asociado.', 'info');
        return;
      }
      var biz = null;
      for (var j = 0; j < adminState.businesses.length; j += 1) {
        if (String(adminState.businesses[j].id) === String(row.business_id)) {
          biz = adminState.businesses[j];
          break;
        }
      }
      if (!biz || !biz.slug) {
        safeToast('Negocio sin slug publico.', 'info');
        return;
      }
      window.__openBusiness(biz.slug);
    };

    window.__adminApprove = async function (id) {
      try {
        await window.CEBApi.adminApproveReceipt(id);
        safeToast('Recaudo aprobado.', 'success');
        await loadAdminData();
      } catch (err) {
        safeToast(err.message || 'No fue posible aprobar.', 'error');
      }
    };

    window.__adminReject = async function (id) {
      try {
        await window.CEBApi.adminRejectReceipt(id, 'Rechazado desde panel admin');
        safeToast('Recaudo rechazado.', 'info');
        await loadAdminData();
      } catch (err) {
        safeToast(err.message || 'No fue posible rechazar.', 'error');
      }
    };

    window.__deleteAdmin = async function (id, name) {
      var who = name || 'este administrador';
      if (!confirm('¿Eliminar ' + who + '?')) return;

      try {
        await window.CEBApi.adminDeleteUser(id);
        safeToast('Administrador eliminado correctamente.', 'success');
        await loadAdminData();
      } catch (err) {
        safeToast(err.message || 'No fue posible eliminar administrador.', 'error');
      }
    };

    function ensurePasswordModalStyle() {
      if (document.getElementById('cebPasswordModalStyle')) return;
      var style = document.createElement('style');
      style.id = 'cebPasswordModalStyle';
      style.textContent = '' +
        '.ceb-pass-backdrop{position:fixed;inset:0;background:rgba(0,0,0,.65);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px;}' +
        '.ceb-pass-modal{width:min(520px,100%);background:var(--dark-2,#fff);border:1px solid var(--border,rgba(0,0,0,.15));border-radius:14px;box-shadow:0 20px 48px rgba(0,0,0,.35);padding:18px;}' +
        '.ceb-pass-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:10px;}' +
        '.ceb-pass-title{font-family:var(--font-main,Arial,sans-serif);font-size:1.02rem;font-weight:700;color:var(--text,#111);}' +
        '.ceb-pass-sub{font-size:.84rem;color:var(--text-muted,#555);margin-bottom:10px;line-height:1.5;}' +
        '.ceb-pass-grid{display:grid;gap:10px;}' +
        '.ceb-pass-help{font-size:.76rem;color:var(--text-muted,#666);margin-top:4px;}' +
        '.ceb-pass-err{display:none;font-size:.78rem;color:#E55;margin-top:2px;}' +
        '.ceb-pass-err.show{display:block;}' +
        '.ceb-pass-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:14px;}';
      document.head.appendChild(style);
    }

    function openPasswordModal(options) {
      ensurePasswordModalStyle();
      var opts = options || {};
      return new Promise(function (resolve) {
        var backdrop = document.createElement('div');
        backdrop.className = 'ceb-pass-backdrop';
        backdrop.innerHTML = '' +
          '<div class="ceb-pass-modal" role="dialog" aria-modal="true">' +
            '<div class="ceb-pass-head">' +
              '<h3 class="ceb-pass-title">' + String(opts.title || 'Cambiar contrasena') + '</h3>' +
              '<button type="button" class="ab" data-pass-close>X</button>' +
            '</div>' +
            '<p class="ceb-pass-sub">' + String(opts.subtitle || 'Ingresa una nueva contrasena segura.') + '</p>' +
            '<div class="ceb-pass-grid">' +
              '<div class="form-group">' +
                '<label class="form-label">Nueva contrasena <span>*</span></label>' +
                '<input type="password" class="form-input" id="cebPassNew" autocomplete="new-password" />' +
                '<div class="ceb-pass-help">Minimo 8 caracteres.</div>' +
              '</div>' +
              '<div class="form-group">' +
                '<label class="form-label">Confirmar contrasena <span>*</span></label>' +
                '<input type="password" class="form-input" id="cebPassConfirm" autocomplete="new-password" />' +
              '</div>' +
              '<div class="ceb-pass-err" id="cebPassErr"></div>' +
            '</div>' +
            '<div class="ceb-pass-actions">' +
              '<button type="button" class="btn btn-outline btn-sm" data-pass-cancel>Cancelar</button>' +
              '<button type="button" class="btn btn-gold btn-sm" data-pass-save>Guardar</button>' +
            '</div>' +
          '</div>';

        function close(value) {
          document.removeEventListener('keydown', onKeyDown);
          backdrop.remove();
          resolve(value);
        }

        function onKeyDown(ev) {
          if (ev.key === 'Escape') {
            ev.preventDefault();
            close(null);
          }
        }

        function showErr(text) {
          var err = backdrop.querySelector('#cebPassErr');
          if (!err) return;
          err.textContent = String(text || '');
          err.classList.add('show');
        }

        function clearErr() {
          var err = backdrop.querySelector('#cebPassErr');
          if (!err) return;
          err.textContent = '';
          err.classList.remove('show');
        }

        var btnClose = backdrop.querySelector('[data-pass-close]');
        var btnCancel = backdrop.querySelector('[data-pass-cancel]');
        var btnSave = backdrop.querySelector('[data-pass-save]');
        var inputNew = backdrop.querySelector('#cebPassNew');
        var inputConfirm = backdrop.querySelector('#cebPassConfirm');

        if (btnClose) btnClose.addEventListener('click', function () { close(null); });
        if (btnCancel) btnCancel.addEventListener('click', function () { close(null); });
        backdrop.addEventListener('click', function (ev) {
          if (ev.target === backdrop) close(null);
        });
        document.addEventListener('keydown', onKeyDown);

        function submit() {
          clearErr();
          var pass1 = String((inputNew && inputNew.value) || '').trim();
          var pass2 = String((inputConfirm && inputConfirm.value) || '').trim();
          if (pass1.length < 8) {
            showErr('La contrasena debe tener minimo 8 caracteres.');
            if (inputNew) inputNew.focus();
            return;
          }
          if (pass1 !== pass2) {
            showErr('La confirmacion no coincide.');
            if (inputConfirm) inputConfirm.focus();
            return;
          }
          close(pass1);
        }

        if (btnSave) btnSave.addEventListener('click', submit);
        if (inputConfirm) {
          inputConfirm.addEventListener('keydown', function (ev) {
            if (ev.key === 'Enter') {
              ev.preventDefault();
              submit();
            }
          });
        }
        if (inputNew) inputNew.focus();
        document.body.appendChild(backdrop);
      });
    }

    window.__changeAdminPassword = async function (id, name) {
      var who = name || 'este administrador';
      var newPassword = await openPasswordModal({
        title: 'Cambiar contrasena',
        subtitle: 'Administrador: ' + who
      });
      if (!newPassword) return;

      try {
        if (window.CEBApi && typeof window.CEBApi.adminSetUserPassword === 'function') {
          await window.CEBApi.adminSetUserPassword(id, { new_password: newPassword });
        } else {
          await adminPostFallback('/admin/users/' + encodeURIComponent(id) + '/set-password', { new_password: newPassword });
        }
        safeToast('Contrasena de administrador actualizada.', 'success');
      } catch (err) {
        safeToast(err.message || 'No fue posible cambiar contrasena del administrador.', 'error');
      }
    };

    window.__changeBusinessPassword = async function (ownerUserId, businessName) {
      var label = businessName || 'este negocio';
      var newPassword = await openPasswordModal({
        title: 'Cambiar contrasena',
        subtitle: 'Usuario del negocio: "' + label + '"'
      });
      if (!newPassword) return;

      try {
        if (window.CEBApi && typeof window.CEBApi.adminSetClientPassword === 'function') {
          await window.CEBApi.adminSetClientPassword(ownerUserId, { new_password: newPassword });
        } else {
          await adminPostFallback('/admin/clients/' + encodeURIComponent(ownerUserId) + '/set-password', { new_password: newPassword });
        }
        safeToast('Contrasena del cliente actualizada.', 'success');
      } catch (err) {
        var primaryErr = String((err && err.message) || '');
        var mayBeAdminOwner = /cliente no encontrado|404/i.test(primaryErr);
        if (mayBeAdminOwner) {
          try {
            if (window.CEBApi && typeof window.CEBApi.adminSetUserPassword === 'function') {
              await window.CEBApi.adminSetUserPassword(ownerUserId, { new_password: newPassword });
            } else {
              await adminPostFallback('/admin/users/' + encodeURIComponent(ownerUserId) + '/set-password', { new_password: newPassword });
            }
            safeToast('Contrasena del usuario del negocio actualizada.', 'success');
            return;
          } catch (fallbackErr) {
            safeToast(fallbackErr.message || 'No fue posible cambiar contrasena del usuario del negocio.', 'error');
            return;
          }
        }
        safeToast(primaryErr || 'No fue posible cambiar contrasena del cliente.', 'error');
      }
    };

    window.saveAdminPlanPrices = async function () {
      if (!window.CEBApi.getAdminToken()) {
        safeToast('Inicia sesión admin para guardar precios.', 'error');
        return;
      }

      try {
        if (!adminState.plans || !adminState.plans.length) {
          adminState.plans = await window.CEBApi.adminListPlans();
        }
        rebuildPlanMap();
        var updates = [];

        function pushPlanUpdate(months, inputId) {
          var plan = findPlanByMonths(months);
          if (!plan) return;
          var value = getNumberInput(inputId, plan.price_cop);
          if (value < 0) throw new Error('El precio no puede ser negativo.');
          updates.push({ id: plan.id, price_cop: value });
        }

        pushPlanUpdate(1, 'adminPrice1m');
        pushPlanUpdate(3, 'adminPrice3m');
        pushPlanUpdate(6, 'adminPrice6m');
        pushPlanUpdate(12, 'adminPrice12m');

        if (!updates.length) {
          safeToast('No se encontraron planes para actualizar. Revisa seed de planes o refresca el panel.', 'error');
          return;
        }

        var freshPlans = await window.CEBApi.adminUpdatePlans(updates);
        adminState.plans = freshPlans || [];
        applySettingsToForm();
        safeToast('Precios guardados correctamente en la base de datos.', 'success');
      } catch (err) {
        safeToast(err.message || 'No fue posible guardar precios.', 'error');
      }
    };

    window.saveAdminPlatformLimits = async function () {
      if (!window.CEBApi.getAdminToken()) {
        safeToast('Inicia sesión admin para guardar limites.', 'error');
        return;
      }

      var maxImages = getNumberInput('adminMaxImages', 10);
      var maxPromos = getNumberInput('adminMaxPromos', 4);
      var platformPayload = null;

      if (maxImages < 1 || maxPromos < 1) {
        safeToast('Max. imágenes y promociones deben ser mayores o iguales a 1.', 'error');
        return;
      }

      try {
        platformPayload = collectPlatformSettingsFromForm();
        await window.CEBApi.adminUpdateLimits({
          max_images: maxImages,
          max_promotions_month: maxPromos,
        });
        adminState.platformSettings = await window.CEBApi.adminUpdatePlatformSettings(platformPayload);

        adminState.plans = await window.CEBApi.adminListPlans();
        applySettingsToForm();
        safeToast('Limites guardados correctamente.', 'success');
      } catch (err) {
        safeToast(err.message || 'No fue posible guardar limites.', 'error');
      }
    };

    window.saveAdminNotifications = async function () {
      if (!window.CEBApi.getAdminToken()) {
        safeToast('Inicia sesión admin para guardar notificaciones.', 'error');
        return;
      }

      try {
        var payload = collectPlatformSettingsFromForm();
        adminState.platformSettings = await window.CEBApi.adminUpdatePlatformSettings(payload);
        applySettingsToForm();
        safeToast('Notificaciones guardadas correctamente.', 'success');
      } catch (err) {
        safeToast(err.message || 'No fue posible guardar notificaciones.', 'error');
      }
    };

    window.crearAdminUsuario = async function () {
      var fullName = formValue('#newAdminName').trim();
      var email = formValue('#newAdminEmail').trim().toLowerCase();
      var password = formValue('#newAdminPassword');

      if (!fullName || !email || !password) {
        safeToast('Completa nombre, correo y contraseña para crear el administrador.', 'error');
        return;
      }

      try {
        await window.CEBApi.adminCreateUser({ full_name: fullName, email: email, password: password });
        if (document.getElementById('newAdminName')) document.getElementById('newAdminName').value = '';
        if (document.getElementById('newAdminEmail')) document.getElementById('newAdminEmail').value = '';
        if (document.getElementById('newAdminPassword')) document.getElementById('newAdminPassword').value = '';
        safeToast('Administrador creado correctamente.', 'success');
        await loadAdminData();
      } catch (err) {
        safeToast(err.message || 'No fue posible crear administrador.', 'error');
      }
    };

    window.doLogin = async function () {
      var identifier = formValue('#adminUser').trim();
      var password = formValue('#adminPw');

      if (!identifier || !password) {
        safeToast('Ingresa usuario/correo y contraseña.', 'error');
        return;
      }

      try {
        var res = await window.CEBApi.adminLogin({ identifier: identifier, password: password });
        window.CEBApi.setAdminToken(res.access_token);
        adminState.currentAdmin = res.user;

        if (document.getElementById('adminErr')) document.getElementById('adminErr').style.display = 'none';
        if (document.getElementById('adminLogin')) document.getElementById('adminLogin').style.display = 'none';
        if (document.getElementById('adminPanel')) document.getElementById('adminPanel').style.display = 'block';
        if (document.getElementById('tbUser')) document.getElementById('tbUser').textContent = res.user.email;

        await loadAdminData();
        safeToast('Sesion admin iniciada.', 'success');
      } catch (err) {
        if (document.getElementById('adminErr')) document.getElementById('adminErr').style.display = 'flex';
        safeToast(err.message || 'No fue posible iniciar sesión admin.', 'error');
      }
    };

    window.doLogout = function () {
      window.CEBApi.setAdminToken('');
      adminState.currentAdmin = null;
      adminState.businesses = [];
      adminState.clients = [];
      adminState.promotions = [];
      adminState.pendingReceipts = [];
      adminState.admins = [];
      adminState.plans = [];
      adminState.planByCode = {};
      if (document.getElementById('adminPanel')) document.getElementById('adminPanel').style.display = 'none';
      if (document.getElementById('adminLogin')) document.getElementById('adminLogin').style.display = 'flex';
      safeToast('Sesion cerrada.', 'info');
    };

    bindGlobalName('doLogin');
    bindGlobalName('doLogout');
    bindGlobalName('crearAdminUsuario');
    bindGlobalName('saveAdminPlanPrices');
    bindGlobalName('saveAdminPlatformLimits');
    bindGlobalName('saveAdminNotifications');
  }

  async function bootstrap() {
    var page = pageName();
    if (page === 'registro.html') await setupRegistro();
    if (page === 'panel.html') await setupPanel();
    if (page === 'admin.html') await setupAdmin();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrap);
  } else {
    bootstrap();
  }
})();

