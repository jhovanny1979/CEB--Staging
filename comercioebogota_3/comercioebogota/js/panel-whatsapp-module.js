(function () {
  var EMOJI_CATALOG = [
    { token: 'fire', char: '🔥' },
    { token: 'party', char: '🎉' },
    { token: 'boom', char: '💥' },
    { token: 'cart', char: '🛒' },
    { token: 'gift', char: '🎁' },
    { token: 'bolt', char: '⚡' },
    { token: 'money', char: '💰' },
    { token: 'tag', char: '🏷️' },
    { token: 'starstruck', char: '🤩' },
    { token: 'sparkles', char: '✨' },
  ];
  var EMOJIS = EMOJI_CATALOG.map(function (e) { return e.char; });
  var EMOJI_BY_TOKEN = {};
  var TOKEN_BY_EMOJI = {};
  EMOJI_CATALOG.forEach(function (e) {
    EMOJI_BY_TOKEN[e.token] = e.char;
    TOKEN_BY_EMOJI[e.char] = e.token;
  });
  var EMOJI_MOJIBAKE_MAP = {
    '\u00f0\u0178\u201d\u00a5': '🔥',
    '\u064b\u06ba\u201d\u00a5': '🔥',
    '\u00f0\u0178\u017d\u2030': '🎉',
    '\u064b\u06ba\u0698\u2030': '🎉',
    '\u00f0\u0178\u2019\u00a5': '💥',
    '\u064b\u06ba\u2019\u00a5': '💥',
    '\u00f0\u0178\u203a\u2019': '🛒',
    '\u064b\u06ba\u203a\u2019': '🛒',
    '\u00f0\u0178\u017d\ufffd': '🎁',
    '\u064b\u06ba\u0698\u067e': '🎁',
    '\u00e2\u0161\u00a1': '⚡',
    '\u00e2\u0691\u060c': '⚡',
    '\u00f0\u0178\u2019\u00b0': '💰',
    '\u064b\u06ba\u2019\u00b0': '💰',
    '\u00f0\u0178\ufffd\u00b7\u00ef\u00b8\ufffd': '🏷️',
    '\u064b\u06ba\u0688\u00b7\u00ef\u00b8\u0688': '🏷️',
    '\u00f0\u0178\u00a4\u00a9': '🤩',
    '\u064b\u06ba\u00a4\u00a9': '🤩',
    '\u00e2\u0153\u00a8': '✨',
  };

  function defaultEmoji() {
    return EMOJIS[0];
  }

  function normalizeEmoji(raw) {
    var value = String(raw || '').trim();
    if (!value) return defaultEmoji();
    if (value.indexOf(':emj:') === 0) {
      var token = value.slice(5);
      return EMOJI_BY_TOKEN[token] || defaultEmoji();
    }
    if (TOKEN_BY_EMOJI[value]) return value;
    if (EMOJI_MOJIBAKE_MAP[value]) return EMOJI_MOJIBAKE_MAP[value];
    return defaultEmoji();
  }

  function emojiToStorage(raw) {
    var normalized = normalizeEmoji(raw);
    var token = TOKEN_BY_EMOJI[normalized];
    if (token) return ':emj:' + token;
    return normalized;
  }

  var state = {
    userKey: '',
    contacts: [],
    promos: [],
    sent: {},
    selectedEmoji: defaultEmoji(),
    promoImagePath: '',
    promoImagePreview: '',
  };
  var mounted = false;
  var refreshing = false;

  function byId(id) {
    return document.getElementById(id);
  }

  function mapToastType(type) {
    if (type === 'ok') return 'success';
    if (type === 'error') return 'error';
    return 'info';
  }

  function toast(type, text) {
    if (typeof window.showToast === 'function') {
      window.showToast(text, mapToastType(type));
    }
  }

  function escapeHtml(raw) {
    return String(raw || '')
      .replace(/&/g, '&')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function slugPhone(raw) {
    return String(raw || '').replace(/\D/g, '');
  }

  function currentUserKey() {
    try {
      var u = typeof Store !== 'undefined' ? Store.get('user', {}) : {};
      return String((u && u.email) || 'anon').toLowerCase();
    } catch (e) {
      return 'anon';
    }
  }

  function fmtDate(raw) {
    if (!raw) return '';
    var d = new Date(raw);
    if (Number.isNaN(d.getTime())) return String(raw);
    if (window.CEBFormat && typeof window.CEBFormat.date === 'function') return window.CEBFormat.date(d);
    return d.toLocaleDateString('es-CO');
  }

  function currentBusinessName() {
    var fromField = (byId('negNombre') && String(byId('negNombre').value || '').trim()) || '';
    if (fromField) return fromField;
    try {
      if (typeof Store !== 'undefined') {
        var negocio = Store.get('negocio', {}) || {};
        var n1 = String(negocio.nombre || '').trim();
        if (n1) return n1;
        var user = Store.get('user', {}) || {};
        var n2 = String(user.nombre || '').trim();
        if (n2) return n2;
      }
    } catch (e) {
      // ignore and fallback
    }
    return 'Mi Negocio';
  }

  function poweredSignature() {
    return '_— ' + currentBusinessName() + '_\n_Powered by Comercio e-Bogotá_';
  }

  function backendOrigin() {
    var runtimeHost = (window.location && window.location.hostname) ? window.location.hostname : '127.0.0.1';
    var base = (window.CEBApi && window.CEBApi.baseUrl) || localStorage.getItem('ceb_api_base') || ('http://' + runtimeHost + ':8000/api/v1');
    return String(base).replace(/\/?api\/v1\/?$/i, '');
  }

  function resolveMediaUrl(path) {
    var raw = String(path || '').trim();
    if (!raw) return '';
    if (/^https?:\/\//i.test(raw)) return raw;
    if (/^(data:|blob:)/i.test(raw)) return raw;
    var normalized = raw.charAt(0) === '/' ? raw : '/' + raw;
    if (normalized.toLowerCase().indexOf('/uploads/') === 0) {
      return backendOrigin() + normalized;
    }
    return normalized;
  }

  function hasApiSession() {
    return !!(window.CEBApi && typeof window.CEBApi.getToken === 'function' && window.CEBApi.getToken());
  }

  function hasApiMethods() {
    return !!(
      window.CEBApi &&
      typeof window.CEBApi.waListContacts === 'function' &&
      typeof window.CEBApi.waCreateContact === 'function' &&
      typeof window.CEBApi.waDeleteContact === 'function' &&
      typeof window.CEBApi.waListPromotions === 'function' &&
      typeof window.CEBApi.waCreatePromotion === 'function' &&
      typeof window.CEBApi.waDeletePromotion === 'function' &&
      typeof window.CEBApi.waUploadPromotionImage === 'function' &&
      typeof window.CEBApi.waListSent === 'function' &&
      typeof window.CEBApi.waMarkSent === 'function'
    );
  }

  function ensureApiReady(showError) {
    if (!hasApiMethods()) {
      if (showError) toast('error', 'Modulo API no disponible. Recarga la pagina.');
      return false;
    }
    if (!hasApiSession()) {
      if (showError) toast('error', 'Inicia sesion para usar Contactos y Promociones WhatsApp.');
      return false;
    }
    return true;
  }

  function setPromoImagePreview(previewUrl, fileName, storedPath) {
    var preview = byId('waPromoImagePreview');
    var nameEl = byId('waPromoImageName');
    var clearBtn = byId('waPromoImageClearBtn');
    state.promoImagePath = String(storedPath || '');
    state.promoImagePreview = String(previewUrl || '');

    if (preview) {
      if (state.promoImagePreview) {
        preview.src = state.promoImagePreview;
        preview.style.display = 'block';
      } else {
        preview.removeAttribute('src');
        preview.style.display = 'none';
      }
    }
    if (nameEl) nameEl.textContent = state.promoImagePreview ? (fileName || 'Imagen cargada') : 'Sin imagen seleccionada';
    if (clearBtn) clearBtn.style.display = state.promoImagePreview ? '' : 'none';
  }

  function clearPromoImage() {
    var input = byId('waPromoImageInput');
    setPromoImagePreview('', '', '');
    if (input) input.value = '';
  }

  function serializeContact(raw) {
    return {
      id: String(raw.id || ''),
      name: String(raw.name || ''),
      email: String(raw.email || ''),
      phone: String(raw.phone || ''),
    };
  }

  function serializePromo(raw) {
    var imagePath = String(raw.image_path || '');
    var normalizedEmoji = normalizeEmoji(raw.emoji);
    return {
      id: String(raw.id || ''),
      emoji: normalizedEmoji,
      title: String(raw.title || ''),
      msg: String(raw.msg || ''),
      image_path: imagePath,
      image_url: resolveMediaUrl(imagePath),
      createdAt: fmtDate(raw.created_at),
    };
  }

  async function loadStateFromApi() {
    state.userKey = currentUserKey();
    if (!ensureApiReady(false)) {
      state.contacts = [];
      state.promos = [];
      state.sent = {};
      return;
    }

    var responses = await Promise.all([window.CEBApi.waListContacts(), window.CEBApi.waListPromotions(), window.CEBApi.waListSent()]);
    var contacts = Array.isArray(responses[0]) ? responses[0] : [];
    var promos = Array.isArray(responses[1]) ? responses[1] : [];
    var sentRows = Array.isArray(responses[2]) ? responses[2] : [];

    state.contacts = contacts.map(serializeContact);
    state.promos = promos.map(serializePromo);
    state.sent = {};
    sentRows.forEach(function (row) {
      var promoId = String(row.promo_id || '');
      var contactId = String(row.contact_id || '');
      if (!promoId || !contactId) return;
      if (!Array.isArray(state.sent[promoId])) state.sent[promoId] = [];
      if (state.sent[promoId].indexOf(contactId) < 0) state.sent[promoId].push(contactId);
    });
  }

  function renderCounters() {
    if (byId('waContactsCount')) byId('waContactsCount').textContent = String(state.contacts.length);
    if (byId('waPromosCount')) byId('waPromosCount').textContent = String(state.promos.length);
    if (byId('waPromosSubtitle')) byId('waPromosSubtitle').textContent = String(state.promos.length) + ' promociones guardadas.';
  }

  function renderContacts() {
    renderCounters();
    var body = byId('waContactsTableBody');
    var wrap = byId('waContactsTableWrap');
    var empty = byId('waContactsEmpty');
    var q = String((byId('waContactSearch') && byId('waContactSearch').value) || '').trim().toLowerCase();
    if (!body || !wrap || !empty) return;

    var rows = state.contacts.filter(function (c) {
      return (
        String(c.name || '').toLowerCase().indexOf(q) >= 0 ||
        String(c.email || '').toLowerCase().indexOf(q) >= 0 ||
        String(c.phone || '').indexOf(q) >= 0
      );
    });

    if (!rows.length) {
      body.innerHTML = '';
      wrap.style.display = 'none';
      empty.style.display = 'block';
      empty.textContent = state.contacts.length ? 'No hay resultados para la busqueda.' : 'No hay contactos guardados.';
      return;
    }

    empty.style.display = 'none';
    wrap.style.display = 'block';
    body.innerHTML = rows
      .map(function (c) {
        var id = escapeHtml(c.id);
        return (
          '<tr>' +
          '<td style="font-weight:600;color:var(--text)">' + escapeHtml(c.name) + '</td>' +
          '<td style="color:var(--text-muted)">' + (c.email ? escapeHtml(c.email) : '<span style="opacity:.5">No registrado</span>') + '</td>' +
          '<td><span class="wa-chip">' + escapeHtml(c.phone) + '</span></td>' +
          '<td><button type="button" class="btn btn-danger btn-sm" data-wa-remove-contact="' + id + '">Eliminar</button></td>' +
          '</tr>'
        );
      })
      .join('');
  }

  function renderEmojiPicker() {
    var box = byId('waEmojiList');
    if (!box) return;
    box.innerHTML = EMOJIS
      .map(function (e) {
        var active = state.selectedEmoji === e ? ' active' : '';
        return '<button type="button" class="wa-emoji-btn' + active + '" data-wa-emoji="' + e + '">' + e + '</button>';
      })
      .join('');
  }

  function renderPreview() {
    var bubble = byId('waPreviewBubble');
    if (!bubble) return;
    var title = (byId('waPromoTitle') && byId('waPromoTitle').value.trim()) || 'Titulo de promocion';
    var msg = (byId('waPromoMessage') && byId('waPromoMessage').value.trim()) || 'Detalle de promocion...';
    bubble.textContent = normalizeEmoji(state.selectedEmoji) + ' *' + title + '*\n\nHola [Nombre],\n\n' + msg + '\n\n' + poweredSignature();
  }

  function renderPromos() {
    renderCounters();
    var cards = byId('waPromosCards');
    var empty = byId('waPromosEmpty');
    if (!cards || !empty) return;

    if (!state.promos.length) {
      cards.style.display = 'none';
      empty.style.display = 'block';
      cards.innerHTML = '';
      return;
    }

    empty.style.display = 'none';
    cards.style.display = 'grid';
    cards.innerHTML = state.promos
      .map(function (p) {
        var id = escapeHtml(p.id);
        var shortMsg = String(p.msg || '');
        return (
          '<div class="wa-promo-card">' +
          (p.image_url ? '<img class="wa-promo-img" src="' + escapeHtml(p.image_url) + '" alt="Imagen promocion" />' : '') +
          '<div style="display:flex;justify-content:space-between;align-items:center">' +
          '<span style="font-size:1.4rem">' + escapeHtml(p.emoji) + '</span>' +
          '<span class="wa-chip">' + escapeHtml(p.createdAt || '') + '</span>' +
          '</div>' +
          '<div class="wa-promo-title">' + escapeHtml(p.title || '') + '</div>' +
          '<div class="wa-promo-msg">' + escapeHtml(shortMsg.length > 120 ? shortMsg.slice(0, 120) + '...' : shortMsg) + '</div>' +
          '<button type="button" class="btn btn-danger btn-sm" data-wa-remove-promo="' + id + '">Eliminar</button>' +
          '</div>'
        );
      })
      .join('');
  }

  function selectedPromoId() {
    return String((byId('waSendPromoSelect') && byId('waSendPromoSelect').value) || '');
  }

  function getSentForPromo(promoId) {
    var key = String(promoId || '');
    var row = state.sent[key];
    return Array.isArray(row) ? row : [];
  }

  function isSent(promoId, contactId) {
    return getSentForPromo(promoId).indexOf(String(contactId)) >= 0;
  }

  function markSentLocal(promoId, contactId) {
    var key = String(promoId || '');
    if (!Array.isArray(state.sent[key])) state.sent[key] = [];
    var cid = String(contactId);
    if (state.sent[key].indexOf(cid) < 0) state.sent[key].push(cid);
  }

  async function markSentApi(promoId, contactId) {
    if (!ensureApiReady(true)) return;
    await window.CEBApi.waMarkSent({ promo_id: promoId, contact_id: contactId });
    markSentLocal(promoId, contactId);
  }

  function renderSend() {
    renderCounters();
    var select = byId('waSendPromoSelect');
    var empty = byId('waSendEmpty');
    var wrap = byId('waSendContactsWrap');
    var box = byId('waSendContacts');
    var summary = byId('waSendSummary');
    if (!select || !empty || !wrap || !box || !summary) return;

    var current = selectedPromoId();
    select.innerHTML =
      '<option value="">Selecciona una promocion...</option>' +
      state.promos
        .map(function (p) {
          var id = String(p.id);
          var sel = current === id ? ' selected' : '';
          return '<option value="' + escapeHtml(id) + '"' + sel + '>' + escapeHtml((p.emoji || '') + ' ' + (p.title || '')) + '</option>';
        })
        .join('');

    if (!state.contacts.length || !state.promos.length) {
      empty.style.display = 'block';
      wrap.style.display = 'none';
      box.innerHTML = '';
      summary.textContent = '';
      return;
    }

    empty.style.display = 'none';
    wrap.style.display = 'block';

    var promoId = selectedPromoId();
    var sentCount = 0;
    box.innerHTML = state.contacts
      .map(function (c) {
        var sent = promoId ? isSent(promoId, c.id) : false;
        if (sent) sentCount += 1;
        var disabled = promoId ? '' : ' disabled';
        return (
          '<label class="wa-contact-pill">' +
          '<input type="checkbox" data-wa-contact-check="' + escapeHtml(c.id) + '"' + disabled + ' />' +
          '<span>' + escapeHtml(c.name) + ' · ' + escapeHtml(c.phone) + '</span>' +
          (sent ? '<span class="wa-chip" style="margin-left:4px">Enviado</span>' : '') +
          '<button type="button" class="btn btn-outline btn-sm" data-wa-send-one="' + escapeHtml(c.id) + '"' + disabled + ' style="padding:4px 9px">Enviar</button>' +
          '</label>'
        );
      })
      .join('');

    summary.textContent = promoId
      ? sentCount + ' de ' + state.contacts.length + ' contactos ya marcados como enviados para esta promocion.'
      : 'Selecciona una promocion para habilitar envio.';
  }

  function resetContactForm() {
    if (byId('waContactName')) byId('waContactName').value = '';
    if (byId('waContactEmail')) byId('waContactEmail').value = '';
    if (byId('waContactPhone')) byId('waContactPhone').value = '';
  }

  async function addContact() {
    if (!ensureApiReady(true)) return;
    var name = String((byId('waContactName') && byId('waContactName').value) || '').trim();
    var email = String((byId('waContactEmail') && byId('waContactEmail').value) || '').trim();
    var phoneRaw = String((byId('waContactPhone') && byId('waContactPhone').value) || '').trim();
    var phone = slugPhone(phoneRaw);

    if (!name) return toast('error', 'El nombre es obligatorio.');
    if (!phone) return toast('error', 'El celular es obligatorio.');
    if (!/^\d{7,15}$/.test(phone)) return toast('error', 'Celular invalido. Usa solo digitos.');
    if (state.contacts.some(function (c) { return slugPhone(c.phone) === phone; })) {
      return toast('error', 'Este celular ya esta registrado.');
    }

    try {
      var created = await window.CEBApi.waCreateContact({ name: name, email: email, phone: phone });
      state.contacts.unshift(serializeContact(created));
      resetContactForm();
      renderContacts();
      renderSend();
      toast('ok', 'Contacto agregado.');
    } catch (err) {
      toast('error', (err && err.message) || 'No se pudo guardar el contacto.');
    }
  }

  async function removeContact(id) {
    if (!ensureApiReady(true)) return;
    var found = state.contacts.find(function (c) { return String(c.id) === String(id); });
    try {
      await window.CEBApi.waDeleteContact(id);
      state.contacts = state.contacts.filter(function (c) { return String(c.id) !== String(id); });
      Object.keys(state.sent).forEach(function (promoId) {
        state.sent[promoId] = (state.sent[promoId] || []).filter(function (cid) { return String(cid) !== String(id); });
      });
      renderContacts();
      renderSend();
      toast('info', 'Contacto eliminado: ' + (found ? found.name : ''));
    } catch (err) {
      toast('error', (err && err.message) || 'No se pudo eliminar el contacto.');
    }
  }

  async function importCsv(file) {
    if (!ensureApiReady(true)) return;
    var reader = new FileReader();
    reader.onload = async function (ev) {
      var text = String((ev && ev.target && ev.target.result) || '');
      var lines = text.split(/\r?\n/).map(function (l) { return l.trim(); }).filter(Boolean);
      var added = 0;
      var skipped = 0;

      for (var idx = 0; idx < lines.length; idx += 1) {
        var line = lines[idx];
        var cols = line.split(/[;,]/).map(function (c) { return c.trim(); });
        if (idx === 0) {
          var lower = cols.join(' ').toLowerCase();
          if (lower.indexOf('nombre') >= 0 || lower.indexOf('celular') >= 0) continue;
        }

        var name = cols[0] || '';
        var email = cols[1] || '';
        var phone = slugPhone(cols[2] || '');
        if (!name || !phone || !/^\d{7,15}$/.test(phone) || state.contacts.some(function (c) { return slugPhone(c.phone) === phone; })) {
          skipped += 1;
          continue;
        }
        try {
          var created = await window.CEBApi.waCreateContact({ name: name, email: email, phone: phone });
          state.contacts.unshift(serializeContact(created));
          added += 1;
        } catch (e) {
          skipped += 1;
        }
      }

      renderContacts();
      renderSend();
      toast('ok', added + ' contacto(s) importado(s).' + (skipped ? ' ' + skipped + ' omitido(s).' : ''));
    };
    reader.readAsText(file);
  }

  async function savePromo() {
    if (!ensureApiReady(true)) return;
    var title = String((byId('waPromoTitle') && byId('waPromoTitle').value) || '').trim();
    var msg = String((byId('waPromoMessage') && byId('waPromoMessage').value) || '').trim();
    if (!title) return toast('error', 'El titulo es obligatorio.');
    if (!msg) return toast('error', 'El mensaje es obligatorio.');

    try {
      var created = await window.CEBApi.waCreatePromotion({
        emoji: emojiToStorage(state.selectedEmoji),
        title: title,
        msg: msg,
        image_path: state.promoImagePath || '',
      });
      state.promos.unshift(serializePromo(created));

      if (byId('waPromoTitle')) byId('waPromoTitle').value = '';
      if (byId('waPromoMessage')) byId('waPromoMessage').value = '';
      clearPromoImage();
      renderPreview();
      renderPromos();
      renderSend();
      toast('ok', 'Promocion guardada.');
    } catch (err) {
      toast('error', (err && err.message) || 'No se pudo guardar la promocion.');
    }
  }

  async function removePromo(id) {
    if (!ensureApiReady(true)) return;
    var found = state.promos.find(function (p) { return String(p.id) === String(id); });
    try {
      await window.CEBApi.waDeletePromotion(id);
      state.promos = state.promos.filter(function (p) { return String(p.id) !== String(id); });
      delete state.sent[String(id)];
      renderPromos();
      renderSend();
      toast('info', 'Promocion eliminada: ' + (found ? found.title : ''));
    } catch (err) {
      toast('error', (err && err.message) || 'No se pudo eliminar la promocion.');
    }
  }

  function waTextFor(promo, contact) {
    return (
      normalizeEmoji(promo.emoji) +
      ' *' + (promo.title || '') + '*\n\n' +
      'Hola ' + (contact.name || 'cliente') + ',\n\n' +
      (promo.msg || '') + '\n\n' +
      poweredSignature()
    );
  }

  function waUrlFor(contact, promo) {
    var digits = slugPhone(contact.phone);
    if (digits.indexOf('57') === 0 && digits.length > 10) digits = digits.slice(2);
    return 'https://wa.me/57' + digits + '?text=' + encodeURIComponent(waTextFor(promo, contact));
  }

  function selectedContactIds() {
    return Array.from(document.querySelectorAll('[data-wa-contact-check]:checked')).map(function (el) { return String(el.getAttribute('data-wa-contact-check')); });
  }

  async function sendOne(contactId) {
    var promoId = selectedPromoId();
    if (!promoId) return toast('error', 'Selecciona una promocion.');
    var promo = state.promos.find(function (p) { return String(p.id) === String(promoId); });
    var contact = state.contacts.find(function (c) { return String(c.id) === String(contactId); });
    if (!promo || !contact) return;
    window.open(waUrlFor(contact, promo), '_blank');
    if (promo.image_path) toast('info', 'La promocion tiene imagen: puedes adjuntarla manualmente en el chat.');
    try {
      await markSentApi(promo.id, contact.id);
      renderSend();
      toast('ok', 'WhatsApp abierto para ' + contact.name + '.');
    } catch (err) {
      toast('error', (err && err.message) || 'No se pudo registrar el envio.');
    }
  }

  function sendSelected() {
    var promoId = selectedPromoId();
    if (!promoId) return toast('error', 'Selecciona una promocion.');
    var promo = state.promos.find(function (p) { return String(p.id) === String(promoId); });
    if (!promo) return toast('error', 'Promocion no encontrada.');
    var ids = selectedContactIds();
    if (!ids.length) return toast('error', 'Selecciona al menos un contacto.');

    var toSend = state.contacts.filter(function (c) { return ids.indexOf(String(c.id)) >= 0 && !isSent(promoId, c.id); });
    if (!toSend.length) return toast('info', 'Todos los seleccionados ya estaban marcados como enviados.');

    toSend.forEach(function (c, idx) {
      setTimeout(function () {
        window.open(waUrlFor(c, promo), '_blank');
        markSentApi(promo.id, c.id)
          .then(function () {
            renderSend();
          })
          .catch(function () {
            toast('error', 'No se pudo registrar envio para ' + c.name + '.');
          });
      }, idx * 800);
    });
    if (promo.image_path) toast('info', 'Recuerda adjuntar la imagen manualmente en cada chat.');
    toast('info', 'Abriendo WhatsApp para ' + toSend.length + ' contacto(s).');
  }

  function setAllChecks(value) {
    Array.from(document.querySelectorAll('[data-wa-contact-check]')).forEach(function (el) {
      if (!el.disabled) el.checked = !!value;
    });
  }

  function bindEventsOnce() {
    if (mounted) return;
    mounted = true;

    window.showWATab = function (tab, btn) {
      Array.from(document.querySelectorAll('.wa-tab-btn')).forEach(function (b) { b.classList.remove('active'); });
      Array.from(document.querySelectorAll('.wa-tab-panel')).forEach(function (p) { p.classList.remove('active'); });
      if (btn) btn.classList.add('active');
      var panel = byId('wa-tab-' + tab);
      if (panel) panel.classList.add('active');
      if (tab === 'send') renderSend();
    };

    byId('waAddContactBtn') && byId('waAddContactBtn').addEventListener('click', function () { void addContact(); });
    byId('waContactSearch') && byId('waContactSearch').addEventListener('input', renderContacts);

    byId('waImportCsvBtn') && byId('waImportCsvBtn').addEventListener('click', function () {
      if (byId('waCsvInput')) byId('waCsvInput').click();
    });
    byId('waCsvInput') && byId('waCsvInput').addEventListener('change', function () {
      var file = this.files && this.files[0];
      if (file) void importCsv(file);
      this.value = '';
    });

    byId('waContactsTableBody') && byId('waContactsTableBody').addEventListener('click', function (e) {
      var btn = e.target.closest('[data-wa-remove-contact]');
      if (!btn) return;
      void removeContact(btn.getAttribute('data-wa-remove-contact'));
    });

    byId('waEmojiList') && byId('waEmojiList').addEventListener('click', function (e) {
      var btn = e.target.closest('[data-wa-emoji]');
      if (!btn) return;
      state.selectedEmoji = normalizeEmoji(btn.getAttribute('data-wa-emoji'));
      renderEmojiPicker();
      renderPreview();
    });

    byId('waPromoTitle') && byId('waPromoTitle').addEventListener('input', renderPreview);
    byId('waPromoMessage') && byId('waPromoMessage').addEventListener('input', renderPreview);
    byId('waSavePromoBtn') && byId('waSavePromoBtn').addEventListener('click', function () { void savePromo(); });

    byId('waPromoImageBtn') && byId('waPromoImageBtn').addEventListener('click', function () {
      if (byId('waPromoImageInput')) byId('waPromoImageInput').click();
    });
    byId('waPromoImageInput') && byId('waPromoImageInput').addEventListener('change', function () {
      var file = this.files && this.files[0];
      if (!file) return;
      if (!String(file.type || '').toLowerCase().startsWith('image/')) {
        toast('error', 'Solo se permiten imagenes.');
        this.value = '';
        return;
      }
      if (!ensureApiReady(true)) {
        this.value = '';
        return;
      }

      var fd = new FormData();
      fd.append('file', file);
      window.CEBApi.waUploadPromotionImage(fd)
        .then(function (uploaded) {
          var storedPath = String((uploaded && uploaded.file_path) || '');
          if (!storedPath) throw new Error('No se recibio ruta de imagen');
          setPromoImagePreview(resolveMediaUrl(storedPath), file.name || 'Imagen', storedPath);
          toast('ok', 'Imagen cargada para la promocion.');
        })
        .catch(function (err) {
          clearPromoImage();
          toast('error', (err && err.message) || 'No se pudo subir la imagen.');
        })
        .finally(function () {
          byId('waPromoImageInput').value = '';
        });
    });
    byId('waPromoImageClearBtn') && byId('waPromoImageClearBtn').addEventListener('click', clearPromoImage);

    byId('waPromosCards') && byId('waPromosCards').addEventListener('click', function (e) {
      var btn = e.target.closest('[data-wa-remove-promo]');
      if (!btn) return;
      void removePromo(btn.getAttribute('data-wa-remove-promo'));
    });

    byId('waSendPromoSelect') && byId('waSendPromoSelect').addEventListener('change', renderSend);
    byId('waSelectAllBtn') && byId('waSelectAllBtn').addEventListener('click', function () { setAllChecks(true); });
    byId('waClearAllBtn') && byId('waClearAllBtn').addEventListener('click', function () { setAllChecks(false); });
    byId('waSendSelectedBtn') && byId('waSendSelectedBtn').addEventListener('click', sendSelected);
    byId('waSendContacts') && byId('waSendContacts').addEventListener('click', function (e) {
      var btn = e.target.closest('[data-wa-send-one]');
      if (!btn) return;
      void sendOne(btn.getAttribute('data-wa-send-one'));
    });
  }

  function hasRoots() {
    return !!(byId('wa-module-wrap') && byId('wa-tab-contacts'));
  }

  async function refreshAll() {
    if (refreshing) return;
    if (!hasRoots()) return;
    refreshing = true;
    try {
      await loadStateFromApi();
      renderEmojiPicker();
      renderPreview();
      clearPromoImage();
      renderContacts();
      renderPromos();
      renderSend();
    } finally {
      refreshing = false;
    }
  }

  function init(forceReload) {
    if (!hasRoots()) return;
    bindEventsOnce();
    var nextKey = currentUserKey();
    if (forceReload || !state.userKey || nextKey !== state.userKey) {
      state.userKey = nextKey;
      void refreshAll();
      return;
    }
    renderCounters();
  }

  window.initWAModule = init;

  document.addEventListener('DOMContentLoaded', function () {
    init(true);
  });
})();
