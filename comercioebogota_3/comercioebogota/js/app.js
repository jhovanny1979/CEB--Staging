// Regional baseline (UTC-5): Bogota / Lima / Quito.
window.CEB_REGION = Object.freeze({
  locale: 'es-419',
  timeZone: 'America/Bogota',
  currency: 'COP'
});

window.CEBFormat = {
  date(value) {
    if (!value) return '-';
    const d = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(d.getTime())) return String(value);
    return new Intl.DateTimeFormat(window.CEB_REGION.locale, {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      timeZone: window.CEB_REGION.timeZone
    }).format(d);
  },
  datetime(value) {
    if (!value) return '-';
    const d = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(d.getTime())) return String(value);
    return new Intl.DateTimeFormat(window.CEB_REGION.locale, {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      timeZone: window.CEB_REGION.timeZone
    }).format(d);
  },
  number(value) {
    const n = Number(value || 0);
    if (!Number.isFinite(n)) return '0';
    return new Intl.NumberFormat(window.CEB_REGION.locale).format(n);
  },
  currency(value) {
    return '$' + this.number(value);
  }
};

// Defensive fix: if any mojibake string slips in, normalize it on load.
function fixMojibakeText(value) {
  const raw = String(value || "");
  if (!/[\u00C3\u00C2\u00E2\u00F0]/.test(raw)) return raw;

  let fixed = raw;
  for (let i = 0; i < 3; i += 1) {
    try {
      const next = decodeURIComponent(escape(fixed));
      if (next === fixed) break;
      fixed = next;
    } catch (e) {
      break;
    }
  }

  return fixed;
}
function normalizeEncodingInDOM(root) {
  const base = root || document.body;
  if (!base) return;

  const walker = document.createTreeWalker(base, NodeFilter.SHOW_TEXT);
  let node = walker.nextNode();
  while (node) {
    const original = node.nodeValue || "";
    const corrected = fixMojibakeText(original);
    if (corrected !== original) node.nodeValue = corrected;
    node = walker.nextNode();
  }

  const attrsToFix = ["title", "placeholder", "aria-label", "alt"];
  document.querySelectorAll("*").forEach((el) => {
    attrsToFix.forEach((attr) => {
      const current = el.getAttribute(attr);
      if (!current) return;
      const corrected = fixMojibakeText(current);
      if (corrected !== current) el.setAttribute(attr, corrected);
    });
  });
}

window.CEBFixEncodingNow = normalizeEncodingInDOM;
/* ============================================================
   COMERCIO E-BOGOTÁ — Shared JS Utilities
   ============================================================ */

// ── Toast Notifications ──────────────────────────────────────
function showToast(msg, type = 'info', duration = 3500) {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }
  const icons = { success: 'OK', error: 'X', info: 'i' };
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  const icon = document.createElement('span');
  icon.textContent = icons[type] || 'i';
  t.appendChild(icon);
  t.appendChild(document.createTextNode(' ' + String(msg || '')));
  container.appendChild(t);
  setTimeout(() => {
    t.style.opacity = '0';
    t.style.transform = 'translateY(8px)';
    t.style.transition = 'all .3s';
    setTimeout(() => t.remove(), 300);
  }, duration);
}
// ── Reveal on Scroll ─────────────────────────────────────────
function initReveal() {
  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('visible'); obs.unobserve(e.target); }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -30px 0px' });
  document.querySelectorAll('.reveal').forEach(el => obs.observe(el));
}

// ── Active Nav ───────────────────────────────────────────────
function removeAdminFromPublicTopNav() {
  const page = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
  if (page === 'admin.html') return;
  document.querySelectorAll('.main-nav .nav-menu a[href*="admin.html"], .main-nav .nav-menu a').forEach((a) => {
    const href = String(a.getAttribute('href') || '').toLowerCase();
    const txt = String(a.textContent || '').trim().toLowerCase();
    if (href.includes('admin.html') || txt === 'admin') {
      const li = a.closest('li');
      if (li) li.remove(); else a.remove();
    }
  });
}

function initActiveNav() {
  const current = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-menu a').forEach(a => {
    const href = a.getAttribute('href');
    if (href && (href === current || href.includes(current.replace('.html', '')))) {
      a.classList.add('active');
    }
  });
}

function rememberFrontendHost() {
  const host = (window.location && window.location.hostname) ? String(window.location.hostname).trim() : '';
  if (!host || host === '127.0.0.1' || host === 'localhost') return;
  try {
    localStorage.setItem('ceb_front_host', host);
  } catch (e) {
    // no-op
  }
}

function forceApiBaseToRuntimeHostWhenRemote() {
  const host = (window.location && window.location.hostname) ? String(window.location.hostname).trim() : '';
  if (!host || host === '127.0.0.1' || host === 'localhost') return;
  const runtimeApi = 'http://' + host + ':8000/api/v1';
  let stored = '';
  try {
    stored = String(localStorage.getItem('ceb_api_base') || '').trim();
  } catch (e) {
    stored = '';
  }
  if (!stored || /127\.0\.0\.1|localhost/i.test(stored)) {
    try {
      localStorage.setItem('ceb_api_base', runtimeApi);
    } catch (e) {
      // no-op
    }
  }
}

function normalizeLocalhostLinks() {
  document.querySelectorAll('a[href^="http://127.0.0.1:5500"], a[href^="http://localhost:5500"]').forEach((anchor) => {
    const href = anchor.getAttribute('href') || '';
    try {
      const parsed = new URL(href);
      const normalized = String(parsed.pathname || '/').replace(/^\//, '') + (parsed.search || '') + (parsed.hash || '');
      anchor.setAttribute('href', normalized || 'index.html');
    } catch (e) {
      // no-op
    }
  });
}

function normalizeNativeAppLinks() {
  if (!document.documentElement.classList.contains('native-app')) return;
  document.querySelectorAll('a[href]').forEach((anchor) => {
    var href = String(anchor.getAttribute('href') || '').trim();
    if (!href) return;
    if (href[0] === '#') return;
    if (/^(javascript:|mailto:|tel:)/i.test(href)) return;
    if (/app=1/i.test(href)) return;

    try {
      var url = new URL(href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (!/\.html$/i.test(url.pathname || '')) return;

      url.searchParams.set('app', '1');
      var fileName = String(url.pathname || '').split('/').pop() || 'index.html';
      anchor.setAttribute('href', fileName + (url.search || '') + (url.hash || ''));
    } catch (e) {
      // no-op
    }
  });
}

function initMobileNav() {
  if (document.documentElement.classList.contains('native-app')) return;
  const nav = document.querySelector('.main-nav');
  if (!nav) return;
  const menu = nav.querySelector('.nav-menu');
  if (!menu) return;

  let toggle = nav.querySelector('.nav-toggle');
  if (!toggle) {
    toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'nav-toggle';
    toggle.setAttribute('aria-label', 'Abrir menu');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.innerHTML = '' +
      '<span class="nav-toggle-bar"></span>' +
      '<span class="nav-toggle-bar"></span>' +
      '<span class="nav-toggle-bar"></span>';
    nav.insertBefore(toggle, menu);
  }

  if (toggle.dataset.bound === '1') return;
  toggle.dataset.bound = '1';

  const closeMenu = () => {
    nav.classList.remove('menu-open');
    document.body.classList.remove('nav-open');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'Abrir menu');
  };

  const openMenu = () => {
    nav.classList.add('menu-open');
    document.body.classList.add('nav-open');
    toggle.setAttribute('aria-expanded', 'true');
    toggle.setAttribute('aria-label', 'Cerrar menu');
  };

  toggle.addEventListener('click', (event) => {
    event.preventDefault();
    if (nav.classList.contains('menu-open')) closeMenu();
    else openMenu();
  });

  menu.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      if (window.innerWidth <= 900) closeMenu();
    });
  });

  document.addEventListener('click', (event) => {
    if (window.innerWidth > 900) return;
    if (!nav.contains(event.target)) closeMenu();
  });

  window.addEventListener('resize', () => {
    if (window.innerWidth > 900) closeMenu();
  });
}

function initNativeViewportInsets() {
  var params = null;
  var nativeQueryFlag = false;
  try {
    params = new URLSearchParams(String((window.location && window.location.search) || ""));
    nativeQueryFlag = params.get("app") === "1";
  } catch (e) {
    nativeQueryFlag = false;
  }

  if (nativeQueryFlag) {
    try { sessionStorage.setItem("ceb_native_app", "1"); } catch (e) {}
    try { localStorage.setItem("ceb_native_app", "1"); } catch (e) {}
  }

  var nativeSessionFlag = false;
  try { nativeSessionFlag = sessionStorage.getItem("ceb_native_app") === "1"; } catch (e) { nativeSessionFlag = false; }
  var nativeLocalFlag = false;
  try { nativeLocalFlag = localStorage.getItem("ceb_native_app") === "1"; } catch (e) { nativeLocalFlag = false; }

  var ua = String((navigator && navigator.userAgent) || '');
  var isAndroidWebView = /Android/i.test(ua) && /;\s*wv\)/i.test(ua);
  var isLikelyCapacitorUA = /Capacitor/i.test(ua);
  var isNativeCapacitor = false;
  try {
    if (window.Capacitor && typeof window.Capacitor.isNativePlatform === 'function') {
      isNativeCapacitor = !!window.Capacitor.isNativePlatform();
    }
  } catch (e) {
    isNativeCapacitor = false;
  }

  if (isNativeCapacitor || isAndroidWebView || isLikelyCapacitorUA) {
    try { localStorage.setItem("ceb_native_app", "1"); } catch (e) {}
  }

  var isNativeApp = nativeQueryFlag || nativeSessionFlag || nativeLocalFlag || isNativeCapacitor || isAndroidWebView || isLikelyCapacitorUA;
  if (!isNativeApp) return;

  document.documentElement.classList.add('native-app');
  document.body.classList.add('native-app');
  // Keep content below status bar and above Android system navigation.
  document.documentElement.style.setProperty('--safe-top', 'max(env(safe-area-inset-top, 0px), 34px)');
  document.documentElement.style.setProperty('--safe-bottom', 'max(env(safe-area-inset-bottom, 0px), 56px)');
}

function configureNativeSystemBars() {
  try {
    if (!(window.Capacitor && typeof window.Capacitor.isNativePlatform === 'function' && window.Capacitor.isNativePlatform())) return;
    var plugins = (window.Capacitor && window.Capacitor.Plugins) || {};
    var statusBar = plugins.StatusBar;
    if (!statusBar) return;

    if (typeof statusBar.setOverlaysWebView === 'function') {
      statusBar.setOverlaysWebView({ overlay: false }).catch(function () {});
    }
    if (typeof statusBar.setBackgroundColor === 'function') {
      statusBar.setBackgroundColor({ color: '#F5F5F5' }).catch(function () {});
    }
    if (typeof statusBar.setStyle === 'function') {
      // Light background at system status bar requires dark icons for visibility.
      statusBar.setStyle({ style: 'DARK' }).catch(function () {});
    }
  } catch (e) {
    // no-op
  }
}

function initNativeBottomTabs() {
  var isNative = document.documentElement.classList.contains('native-app');
  if (!isNative) return;
  if (document.getElementById('cebAppTabbar')) return;
  if (!document.getElementById('cebAppTabbarStyle')) {
    var style = document.createElement('style');
    style.id = 'cebAppTabbarStyle';
    style.textContent = ''
      + 'html.native-app #cebAppTabbar{display:flex !important;position:fixed !important;left:12px !important;right:12px !important;top:auto !important;bottom:calc(env(safe-area-inset-bottom, 0px) + 10px) !important;background:#fff !important;border:1px solid #d0d0d0 !important;border-radius:14px !important;box-shadow:0 10px 30px rgba(0,0,0,.14) !important;z-index:9998 !important;overflow:hidden !important;}'
      + 'html.native-app #cebAppTabbar .app-tab{flex:1 !important;display:flex !important;flex-direction:column !important;align-items:center !important;justify-content:center !important;gap:4px !important;text-decoration:none !important;padding:9px 6px !important;color:#666 !important;font-size:11px !important;font-weight:600 !important;background:transparent !important;border:0 !important;line-height:1.2 !important;}'
      + 'html.native-app #cebAppTabbar .app-tab-ico{width:18px !important;height:18px !important;display:flex !important;align-items:center !important;justify-content:center !important;color:currentColor !important;}'
      + 'html.native-app #cebAppTabbar .app-tab-ico svg{width:18px !important;height:18px !important;display:block !important;}'
      + 'html.native-app #cebAppTabbar .app-tab.active{color:#2d6200 !important;background:#edfacc !important;}';
    (document.head || document.documentElement).appendChild(style);
  }

  var page = String((window.location && window.location.pathname) || '').split('/').pop().toLowerCase() || 'index.html';
  var hash = String((window.location && window.location.hash) || '').toLowerCase();
  var appQ = '?app=1';

  var tabs = [
    {
      id: 'home',
      label: 'Inicio',
      href: 'index.html' + appQ,
      icon: '<svg viewBox="0 0 24 24" fill="none"><path d="M3 10.5L12 3l9 7.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M5 9.8V21h14V9.8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>'
    },
    {
      id: 'directory',
      label: 'Negocios',
      href: 'negocio.html' + appQ,
      icon: '<svg viewBox="0 0 24 24" fill="none"><rect x="3" y="4" width="18" height="16" rx="2" stroke="currentColor" stroke-width="2"/><path d="M8 10h8M8 14h6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>'
    },
    {
      id: 'plans',
      label: 'Planes',
      href: 'index.html' + appQ + '#planes',
      icon: '<svg viewBox="0 0 24 24" fill="none"><path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>'
    },
    {
      id: 'panel',
      label: 'Panel',
      href: 'panel.html' + appQ,
      icon: '<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="8" r="4" stroke="currentColor" stroke-width="2"/><path d="M4 21a8 8 0 0116 0" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>'
    }
  ];

  var activeId = 'home';
  if (page === 'negocio.html') activeId = 'directory';
  else if (page === 'panel.html') activeId = 'panel';
  else if (page === 'registro.html') activeId = 'panel';
  else if (page === 'admin.html') activeId = 'panel';
  else if (page === 'index.html' && hash.indexOf('#planes') === 0) activeId = 'plans';

  var nav = document.createElement('nav');
  nav.id = 'cebAppTabbar';
  nav.className = 'app-tabbar';
  nav.setAttribute('aria-label', 'Menu de app');

  nav.innerHTML = tabs.map(function (tab) {
    var cls = 'app-tab' + (tab.id === activeId ? ' active' : '');
    return '' +
      '<a class="' + cls + '" href="' + tab.href + '">' +
        '<span class="app-tab-ico" aria-hidden="true">' + tab.icon + '</span>' +
        '<span class="app-tab-label">' + tab.label + '</span>' +
      '</a>';
  }).join('');

  document.body.appendChild(nav);
  document.body.classList.add('app-tabbar-on');
  try {
    var safeBottom = 'calc(env(safe-area-inset-bottom, 0px) + 96px)';
    if (document.body && (!document.body.style.paddingBottom || document.body.style.paddingBottom === '')) {
      document.body.style.paddingBottom = safeBottom;
    }
  } catch (e) {}
}

// ── Form Validation ──────────────────────────────────────────
function validateField(input) {
  const group = input.closest('.form-group');
  if (!group) return true;
  const errEl = group.querySelector('.form-error');
  let valid = true;
  let msg = '';

  if (input.required && !input.value.trim()) {
    valid = false; msg = 'Este campo es obligatorio.';
  } else if (input.type === 'email' && input.value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.value)) {
    valid = false; msg = 'Ingresa un correo válido.';
  } else if (input.type === 'tel' && input.value && !/^[\d\s\+\-\(\)]{7,15}$/.test(input.value)) {
    valid = false; msg = 'Ingresa un teléfono válido.';
  } else if (input.dataset.minlen && input.value.length < +input.dataset.minlen) {
    valid = false; msg = `Mínimo ${input.dataset.minlen} caracteres.`;
  }

  if (errEl) { errEl.textContent = msg; errEl.classList.toggle('show', !valid); }
  group.classList.toggle('has-error', !valid);
  return valid;
}

function validateForm(form) {
  let valid = true;
  form.querySelectorAll('[required]').forEach(el => {
    if (!validateField(el)) valid = false;
  });
  // Check password match
  const pw = form.querySelector('[name="password"]');
  const pw2 = form.querySelector('[name="confirm_password"]');
  if (pw && pw2 && pw.value !== pw2.value) {
    const g = pw2.closest('.form-group');
    const e = g?.querySelector('.form-error');
    if (e) { e.textContent = 'Las contraseñas no coinciden.'; e.classList.add('show'); }
    if (g) g.classList.add('has-error');
    valid = false;
  }
  return valid;
}

// ── Image Preview Helper ─────────────────────────────────────
function previewImage(file, imgEl, callback) {
  if (!file || !file.type.startsWith('image/')) return;
  const reader = new FileReader();
  reader.onload = e => {
    if (imgEl) imgEl.src = e.target.result;
    if (callback) callback(e.target.result, file);
  };
  reader.readAsDataURL(file);
}

// ── LocalStorage helpers (simulate session) ──────────────────
const Store = {
  set(key, val) { try { localStorage.setItem('ceb_' + key, JSON.stringify(val)); } catch(e){} },
  get(key, def = null) {
    try { const v = localStorage.getItem('ceb_' + key); return v ? JSON.parse(v) : def; } catch(e){ return def; }
  },
  remove(key) { try { localStorage.removeItem('ceb_' + key); } catch(e){} }
};

// ── Slug generator ────────────────────────────────────────────
function slugify(str) {
  return (str || '')
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

// ── Build direct negocio URL ──────────────────────────────────
function buildNegocioURL(nombre) {
  const slug = slugify(nombre);
  const base = window.location.href.replace(/panel\.html.*$/, '');
  return `${base}negocio.html?empresa=${slug}`;
}

// ── Save negocio to multi-business store ─────────────────────
function saveNegocioToStore(data) {
  const slug = slugify(data.nombre || '');
  if (!slug) return;
  const all = Store.get('negocios', {});
  all[slug] = { ...data, slug };
  Store.set('negocios', all);
}

// ── Init on DOMContentLoaded ──────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initNativeViewportInsets();
  configureNativeSystemBars();
  initNativeBottomTabs();
  rememberFrontendHost();
  forceApiBaseToRuntimeHostWhenRemote();
  normalizeLocalhostLinks();
  normalizeNativeAppLinks();
  normalizeEncodingInDOM(document.body);
  removeAdminFromPublicTopNav();
  initMobileNav();
  initReveal();
  initActiveNav();
});
