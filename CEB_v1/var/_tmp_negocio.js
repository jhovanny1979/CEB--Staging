
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// DEMO DATA â€” shown when no localStorage match is found
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const DEMO_NEGOCIOS = {
  'panaderia-san-jose': {
    nombre: 'Panadería San José',
    slug: 'panaderia-san-jose',
    categoria: 'Panaderías',
    localidad: 'Kennedy',
    direccion: 'Cll 38A Sur 79 12',
    descripcion: 'Panadería artesanal con más de 20 años elaborando pan fresco cada mañana. Ofrecemos pan tradicional, tortas personalizadas, pasteles y productos de repostería para toda ocasión.',
    whatsapp: '3101234567',
    horario: { L:true, M:true, X:true, J:true, V:true, S:true, D:false, apertura:'06:00', cierre:'19:00' },
    domicilios: true,
    redes: { instagram: '@panaderiasanjose', facebook: 'Panadería San José' },
    publicado: true,
    logo: '',
    galeria: [],
    plan: 'PLAN 3 MESES'
  },
  'ferreteria-el-perno': {
    nombre: 'Ferretería El Perno',
    slug: 'ferreteria-el-perno',
    categoria: 'Ferreterías',
    localidad: 'Puente Aranda',
    direccion: 'CR 50 13 21',
    descripcion: 'Distribuidores de materiales de construcción, herrajes, pinturas, herramientas eléctricas y manuales. Atención personalizada y precios al por mayor y por menor.',
    whatsapp: '3209876543',
    horario: { L:true, M:true, X:true, J:true, V:true, S:true, D:false, apertura:'07:30', cierre:'18:00' },
    domicilios: false,
    redes: {},
    publicado: true,
    logo: '',
    galeria: [],
    plan: 'PLAN 6 MESES'
  }
};

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// URL / SLUG helpers
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function slugify(str) {
  return str.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim().replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

function getEmpresaSlug() {
  const params = new URLSearchParams(window.location.search);
  return params.get('empresa') || params.get('e') || '';
}

function buildLink(slug) {
  const base = window.location.href.split('?')[0];
  return `${base}?empresa=${slug}`;
}


function getBackendOrigin() {
  const apiBase = localStorage.getItem('ceb_api_base') || 'http://127.0.0.1:8000/api/v1';
  return String(apiBase).replace(/\/?api\/v1\/?$/i, '');
}

function resolveAssetUrl(path) {
  const raw = String(path || '').trim();
  if (!raw) return '';

  if (/^https?:\/\//i.test(raw)) {
    try {
      const parsed = new URL(raw);
      const host = String(parsed.hostname || '').toLowerCase();
      const port = String(parsed.port || '');
      if ((host === '127.0.0.1' || host === 'localhost') && port === '5500' && String(parsed.pathname || '').toLowerCase().startsWith('/uploads/')) {
        return `${getBackendOrigin()}${parsed.pathname}`;
      }
    } catch (e) {
      // ignore parse errors
    }
    return raw;
  }

  if (/^(data:|blob:)/i.test(raw)) return raw;

  const normalized = raw.startsWith('/') ? raw : `/${raw}`;
  if (normalized.toLowerCase().startsWith('/uploads/')) {
    return `${getBackendOrigin()}${normalized}`;
  }
  return normalized;
}

async function fetchPublicBusinesses() {
  const url = `${getBackendOrigin()}/api/v1/public/businesses`;
  const resp = await fetch(url, { method: 'GET' });
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  const data = await resp.json();
  return Array.isArray(data) ? data : [];
}

async function fetchPublicBusinessBySlug(slug) {
  if (!slug) return null;
  const safeSlug = encodeURIComponent(String(slug).trim());
  const url = `${getBackendOrigin()}/api/v1/public/businesses/${safeSlug}`;
  const resp = await fetch(url, { method: 'GET' });
  if (resp.status === 404) return null;
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  return await resp.json();
}


// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// LOAD BUSINESS DATA
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function firstNonEmpty() {
  for (const value of arguments) {
    if (value === undefined || value === null) continue;
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed) return trimmed;
      continue;
    }
    return value;
  }
  return '';
}

function fixMojibakeText(value) {
  var text = String(value || '');
  var rules = [
    [/\u00C3\u00A1/g, '\u00E1'], [/\u00C3\u00A9/g, '\u00E9'], [/\u00C3\u00AD/g, '\u00ED'], [/\u00C3\u00B3/g, '\u00F3'], [/\u00C3\u00BA/g, '\u00FA'], [/\u00C3\u00B1/g, '\u00F1'],
    [/\u00C3\u0081/g, '\u00C1'], [/\u00C3\u0089/g, '\u00C9'], [/\u00C3\u008D/g, '\u00CD'], [/\u00C3\u0093/g, '\u00D3'], [/\u00C3\u009A/g, '\u00DA'], [/\u00C3\u0091/g, '\u00D1'],
    [/\u00C2\u00A1/g, '\u00A1'], [/\u00C2\u00BF/g, '\u00BF'], [/\u00C2\u00B7/g, '\u00B7'],
    [/\u00E2\u20AC\u201C/g, '\u2013'], [/\u00E2\u20AC\u201D/g, '\u2014'],
    [/\u00F0\u0178\u201C\u008D/g, '\u{1F4CD}'], [/\u00F0\u0178\u201C\u00B1/g, '\u{1F4F1}'], [/\u00F0\u0178\u203A\u00B5/g, '\u{1F6F5}'],
  ];
  rules.forEach(function (rule) { text = text.replace(rule[0], rule[1]); });
  return text.replace(/\uFFFD/g, '').trim();
}

function normalizeHorario(input) {
  const fallback = { L: true, M: true, X: true, J: true, V: true, S: false, D: false, apertura: '08:00', cierre: '18:00' };
  if (!input) return fallback;

  if (Array.isArray(input)) {
    const map = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
    const out = { ...fallback };
    let firstOpen = null;
    input.forEach((item) => {
      if (!item) return;
      const idx = Number(item.day_of_week);
      const day = map[idx];
      if (!day) return;
      const isOpen = item.is_open !== false;
      out[day] = isOpen;
      if (isOpen && !firstOpen) firstOpen = item;
    });
    if (firstOpen) {
      out.apertura = String(firstOpen.open_time || out.apertura).slice(0, 5);
      out.cierre = String(firstOpen.close_time || out.cierre).slice(0, 5);
    }
    return out;
  }

  return {
    ...fallback,
    ...input,
    apertura: String(firstNonEmpty(input.apertura, input.open_time, fallback.apertura)).slice(0, 5),
    cierre: String(firstNonEmpty(input.cierre, input.close_time, fallback.cierre)).slice(0, 5),
  };
}

function normalizeRedes(input, fallbackSession) {
  const red = (input && typeof input === 'object') ? input : {};
  return {
    instagram: firstNonEmpty(red.instagram, input && input.instagram, fallbackSession && fallbackSession.instagram, ''),
    facebook: firstNonEmpty(red.facebook, input && input.facebook, fallbackSession && fallbackSession.facebook, ''),
    youtube: firstNonEmpty(red.youtube, input && input.youtube, fallbackSession && fallbackSession.youtube, ''),
  };
}

function buildWhatsAppUrl(raw) {
  const digits = String(raw || '').replace(/\D/g, '');
  if (digits.length < 10) return '';
  const withCountry = digits.startsWith('57') ? digits : `57${digits}`;
  return `https://wa.me/${withCountry}`;
}

function buildMapsUrl(address, locality) {
  const parts = [address, locality, 'Bogota', 'Colombia']
    .map((v) => String(v || '').trim())
    .filter(Boolean);
  if (!parts.length) return '';
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(parts.join(', '))}`;
}

function normalizeNegocio(data, slug, fallbackSession) {
  const source = (data && typeof data === 'object') ? data : {};
  const session = (fallbackSession && typeof fallbackSession === 'object') ? fallbackSession : null;
  const isOwnBusiness = !!(session && slugify(firstNonEmpty(session.nombre, session.name, '')) === slug);

  const gallerySource = firstNonEmpty(source.galeria, source.gallery, source.images, session && session.galeria, isOwnBusiness ? Store.get('gallery', []) : []);
  const promosSource = firstNonEmpty(source.promos, session && session.promos, isOwnBusiness ? Store.get('promos', []) : []);

  return {
    nombre: fixMojibakeText(firstNonEmpty(source.nombre, source.name, source.business_name, session && session.nombre, 'Mi Negocio')),
    slug: firstNonEmpty(source.slug, slug, slugify(firstNonEmpty(source.nombre, source.name, ''))),
    categoria: fixMojibakeText(firstNonEmpty(source.categoria, source.category, session && session.categoria, '')),
    localidad: fixMojibakeText(firstNonEmpty(source.localidad, source.locality, session && session.localidad, '')),
    direccion: fixMojibakeText(firstNonEmpty(source.direccion, source.dir, source.address, session && session.dir, session && session.direccion, '')),
    descripcion: fixMojibakeText(firstNonEmpty(source.descripcion, source.description, session && session.descripcion, '')),
    whatsapp: fixMojibakeText(firstNonEmpty(source.whatsapp, source.wp, source.phone, source.telefono, session && session.wp, session && session.whatsapp, '')),
    horario: normalizeHorario(firstNonEmpty(source.horario, source.hours, session && session.horario, null)),
    domicilios: Boolean(source.domicilios ?? source.has_delivery ?? (session && session.domicilios)),
    redes: normalizeRedes(source.redes || source.socials || source, session),
    publicado: Boolean(source.publicado ?? source.published ?? true),
    logo: firstNonEmpty(
      source.logo,
      source.logo_path,
      source.logo_url,
      source.logoUrl,
      session && session.logo,
      isOwnBusiness ? Store.get('negLogoTemp', '') : '',
    ),
    galeria: Array.isArray(gallerySource) ? gallerySource : [],
    promos: Array.isArray(promosSource) ? promosSource : [],
    plan: fixMojibakeText(firstNonEmpty(source.plan, source.subscription_status, Store.get('user', {}).plan, 'GRATIS')),
  };
}

function loadNegocio(slug) {
  const allNegocios = Store.get('negocios', {});
  const currentNeg = Store.get('negocio', null);
  const currentSlug = currentNeg ? slugify(firstNonEmpty(currentNeg.nombre, currentNeg.name, '')) : '';
  const fallbackSession = currentSlug === slug ? currentNeg : null;

  if (allNegocios[slug]) return normalizeNegocio(allNegocios[slug], slug, fallbackSession);

  const byValue = Object.values(allNegocios).find((item) => {
    const itemSlug = firstNonEmpty(item && item.slug, '');
    const nameSlug = slugify(firstNonEmpty(item && item.nombre, item && item.name, ''));
    return itemSlug === slug || nameSlug === slug;
  });
  if (byValue) return normalizeNegocio(byValue, slug, fallbackSession);

  if (fallbackSession) return normalizeNegocio(fallbackSession, slug, fallbackSession);

  if (DEMO_NEGOCIOS[slug]) return normalizeNegocio(DEMO_NEGOCIOS[slug], slug, null);
  return null;
}

function buildNegocioFromSession(data, slug) {
  return normalizeNegocio(data || {}, slug, data || null);
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// RENDER
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
let lbImages = [];
let lbIndex = 0;
let promoModalItems = [];
let promoModalImageIndex = 0;

function renderPage(neg) {
  neg = normalizeNegocio(neg, firstNonEmpty(neg && neg.slug, ''), Store.get('negocio', null));
  neg.slug = firstNonEmpty(neg.slug, slugify(firstNonEmpty(neg.nombre, 'negocio')));
  const link = buildLink(neg.slug);
  const isOpen = checkIsOpen(neg.horario);
  const horarioHTML = buildHorarioHTML(neg.horario);

  const promosRaw = Array.isArray(neg.promos) ? neg.promos : Store.get('promos', []);
  const promos = Array.isArray(promosRaw)
    ? promosRaw.map((p) => ({
        ...p,
        titulo: firstNonEmpty(p && p.titulo, p && p.title, ''),
        contenido: firstNonEmpty(p && p.contenido, p && p.content_html, ''),
        estado: firstNonEmpty(p && p.estado, p && p.status, ''),
        publicado: firstNonEmpty(p && p.publicado, p && p.published_at, ''),
        fecha: firstNonEmpty(p && p.fecha, p && p.starts_at, ''),
        images: (Array.isArray(p && p.images) ? p.images : [])
          .map((img, idx) => ({
            file_path: firstNonEmpty(img && img.file_path, img && img.path, ''),
            description: firstNonEmpty(img && img.description, ''),
            position: Number(firstNonEmpty(img && img.position, idx) || idx),
          }))
          .filter((img) => !!img.file_path)
          .slice(0, 3),
        img: '',
      }))
    : [];
  promos.forEach((p) => {
    if (!p.images.length) {
      const fallbackPath = firstNonEmpty(p.img, p.image_path, '');
      if (fallbackPath) {
        p.images = [{ file_path: fallbackPath, description: '', position: 0 }];
      }
    }
    p.images = p.images.map((img, idx) => ({
      file_path: resolveAssetUrl(firstNonEmpty(img && img.file_path, '')),
      description: firstNonEmpty(img && img.description, ''),
      position: Number(firstNonEmpty(img && img.position, idx) || idx),
    }));
    p.img = p.images.length ? p.images[0].file_path : '';
  });

  const galeriaRaw = Array.isArray(neg.galeria) ? neg.galeria : [];
  const galeria = galeriaRaw.map(resolveAssetUrl).filter(Boolean);

  // Collect images for lightbox
  lbImages = galeria;

  const logoSrc = resolveAssetUrl(neg.logo || galeria[0] || '');
  const logoHTML = logoSrc
    ? `<img src="${logoSrc}" alt="${neg.nombre}" onerror="this.onerror=null;this.outerHTML='<div class=&quot;biz-logo-placeholder&quot;>&#127970;</div>';" />`
    : `<div class="biz-logo-placeholder">${getCategoryEmoji(neg.categoria)}</div>`;

  const galleryHTML = buildGalleryHTML(galeria);
  const promosHTML  = buildPromosHTML(promos);
  const redesHTML   = buildRedesHTML(neg.redes);
  const waHref = buildWhatsAppUrl(neg.whatsapp);
  const hasWhatsapp = !!waHref;
  const mapHref = buildMapsUrl(neg.direccion, neg.localidad);
  const hasMap = !!mapHref;
  const locationLabel = [neg.direccion, neg.localidad].filter(Boolean).join(', ');

  document.title = `${neg.nombre} - Comercio e-Bogotá`;

  document.getElementById('bizPage').innerHTML = `

    <!-- HERO -->
    <div class="biz-hero">
      <div class="biz-hero-bg"></div>
      <div class="biz-hero-inner">
        <div class="biz-logo-wrap">${logoHTML}</div>
        <div class="biz-info">
          <div class="biz-cat-row">
            ${neg.categoria ? `<span class="badge badge-gold">${neg.categoria}</span>` : ''}
            ${neg.localidad ? `<span class="badge badge-muted">&#128205; ${neg.localidad}</span>` : ''}
            ${neg.domicilios ? `<span class="delivery-tag">&#128757; Con domicilios</span>` : ''}
            <span class="biz-status ${isOpen?'open':'close'}">${isOpen?'Abierto ahora':'Cerrado ahora'}</span>
          </div>
          <h1 class="biz-name">${neg.nombre}</h1>
          ${neg.descripcion ? `<p class="biz-desc">${neg.descripcion}</p>` : ''}
          <div class="biz-meta-row">
            ${neg.direccion ? `<div class="biz-meta-item"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>${hasMap ? `<a href="${mapHref}" target="_blank" rel="noopener noreferrer" style="color:inherit;text-decoration:none;border-bottom:1px dashed var(--border);padding-bottom:1px">${neg.direccion}</a>` : neg.direccion}</div>` : ''}
            ${neg.horario ? `<div class="biz-meta-item"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>${neg.horario.apertura || '-'} - ${neg.horario.cierre || '-'}</div>` : ''}
            <div class="biz-meta-item">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
              <span class="badge badge-gold" style="font-size:.65rem;padding:2px 8px">${neg.plan||'ACTIVO'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- BODY -->
    <div class="biz-body">

      <!-- MAIN -->
      <div class="biz-main">

        <!-- GALLERY -->
        <div class="biz-section reveal">
          <div class="biz-section-title">
            <span>Imágenes del <em>negocio</em></span>
            ${galeria.length ? `<span class="biz-section-count">${galeria.length} / 10 imágenes</span>` : ''}
          </div>
          ${galleryHTML}
        </div>

        <!-- PROMOTIONS -->
        <div class="biz-section reveal">
          <div class="biz-section-title">
            <span><em>Promociones</em> activas</span>
            ${promos.length ? `<span class="biz-section-count">${promos.length} esta semana</span>` : ''}
          </div>
          ${promosHTML}
        </div>

      </div>

      <!-- ASIDE -->
      <div class="biz-aside">

        <!-- Contact -->
        <div class="aside-card reveal">
          <div class="aside-card-title">Contacto</div>
          ${hasWhatsapp ? `
            <div class="contact-row">
              <div class="cr-icon">&#128241;</div>
              <span>${neg.whatsapp}</span>
            </div>
            <a class="wa-btn" href="${waHref}" target="_blank" rel="noopener noreferrer">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.372 0 12c0 2.116.553 4.103 1.522 5.83L.044 23.95l6.263-1.643A11.954 11.954 0 0012 24c6.628 0 12-5.372 12-12S18.627 0 12 0zM12 22c-1.84 0-3.57-.497-5.063-1.364l-.363-.214-3.718.975.99-3.63-.237-.374A9.953 9.953 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/></svg>
              Contactar por WhatsApp
            </a>` : '<div class="contact-row"><span style="color:var(--text-muted);font-size:.85rem">Sin contacto registrado</span></div>'}
          ${locationLabel ? `<div class="contact-row"><div class="cr-icon">&#128205;</div>${hasMap ? `<a href="${mapHref}" target="_blank" rel="noopener noreferrer">${locationLabel}</a>` : `<span>${locationLabel}</span>`}</div>` : ''}
          ${hasMap ? `<a class="map-btn" href="${mapHref}" target="_blank" rel="noopener noreferrer"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>Abrir ubicacion en Maps</a>` : ''}
        </div>

        <!-- Hours -->
        ${neg.horario ? `
        <div class="aside-card reveal d1">
          <div class="aside-card-title">Horario de atención</div>
          ${horarioHTML}
        </div>` : ''}

        <!-- Social -->
        ${redesHTML ? `
        <div class="aside-card reveal d2">
          <div class="aside-card-title">Redes sociales</div>
          <div class="social-btns">${redesHTML}</div>
        </div>` : ''}

        <!-- Direct link -->
        <div class="aside-card reveal d3">
          <div class="aside-card-title">Enlace directo de este negocio</div>
          <div class="link-box" id="linkBox">
            <span class="link-url" id="linkUrl">${link}</span>
            <button class="copy-btn" onclick="copyLink()">Copiar</button>
          </div>
          <p style="font-size:.72rem;color:var(--text-muted);margin-top:8px;line-height:1.6">
            Comparte este link con tus clientes para que lleguen directamente a tu página.
          </p>
        </div>

        <!-- Back link -->
        <div style="text-align:center;margin-top:4px">
          <a href="index.html" style="font-size:.78rem;color:var(--text-muted);text-decoration:none">&larr; Volver a Comercio e-Bogotá</a>
        </div>

      </div>
    </div>
  `;

  // Init strip interaction
  initGalleryStrip();
  initReveal();
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// GALLERY
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function buildGalleryHTML(galeria) {
  if (!galeria.length) {
    return `<div class="gallery-empty"><div class="ge-icon">&#128247;</div><div>Este negocio aún no ha subido imágenes de sus productos o servicios.</div></div>`;
  }
  const featured = galeria[0];
  const extras   = galeria.slice(1);
  return `
    <div class="gallery-layout">
      <div class="gallery-featured" onclick="openLightbox(0)">
        <img id="galleryFeatured" src="${featured}" alt="Imagen principal" />
        <div class="gallery-featured-overlay"><span class="gfo-text">Ver galería completa &rarr;</span></div>
      </div>
      ${extras.length ? `
      <div class="gallery-strip" id="galleryStrip">
        <div class="gallery-strip-thumb active" data-index="0" onclick="setFeatured(0)">
          <img src="${featured}" alt="Imagen 1" />
        </div>
        ${extras.map((src,i)=>`<div class="gallery-strip-thumb" data-index="${i+1}" onclick="setFeatured(${i+1})"><img src="${src}" alt="Imagen ${i+2}" /></div>`).join('')}
      </div>` : ''}
    </div>`;
}

function initGalleryStrip() {
  // Already handled by inline onclick
}

function setFeatured(index) {
  const featured = document.getElementById('galleryFeatured');
  if (!featured || !lbImages[index]) return;
  featured.src = lbImages[index];
  featured.closest('.gallery-featured').onclick = () => openLightbox(index);
  document.querySelectorAll('.gallery-strip-thumb').forEach(t => {
    t.classList.toggle('active', +t.dataset.index === index);
  });
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// PROMOTIONS
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function buildPromosHTML(promos) {
  const active = Array.isArray(promos)
    ? promos.filter((p) => {
        const status = String((p && (p.estado || p.status)) || '').toUpperCase();
        return status === 'PUBLICADO' || status === 'PUBLISHED' || !!(p && p.publicado);
      })
    : [];
  promoModalItems = active;
  if (!active.length) {
    return `<div class="promo-empty"><div style="font-size:1.8rem;margin-bottom:10px">📣</div>Este negocio no tiene promociones activas esta semana.<br><small>Vuelve pronto para descubrir sus ofertas.</small></div>`;
  }
  return `<div class="promo-cards">${active.map((p, idx) => `
    <div class="promo-card" role="button" tabindex="0" onclick="openPromoModal(${idx})" onkeydown="if(event.key==='Enter'){openPromoModal(${idx});}">
      ${p.img
        ? `<img class="promo-card-img" src="${p.img}" alt="${p.titulo}" />`
        : `<div class="promo-card-img-placeholder">🏷️</div>`}
      <div class="promo-card-body">
        <div class="promo-card-date">✦ PROMOCION ACTIVA · ${p.publicado||p.fecha||''}</div>
        <div class="promo-card-title">${p.titulo}</div>
        <div class="promo-card-content">${p.contenido||''}</div>
        ${Array.isArray(p.images) && p.images.length ? `<div style="font-size:.72rem;color:var(--gold);margin-top:8px">Ver detalle (${p.images.length} imagen${p.images.length > 1 ? 'es' : ''})</div>` : ''}
      </div>
    </div>`).join('')}</div>`;
}

function getPromoModalImages(promo) {
  const rows = Array.isArray(promo && promo.images) ? promo.images : [];
  const list = [];
  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i] || {};
    const filePath = resolveAssetUrl(firstNonEmpty(row.file_path, row.path, ''));
    if (!filePath) continue;
    list.push({
      file_path: filePath,
      description: firstNonEmpty(row.description, ''),
      position: Number(firstNonEmpty(row.position, i) || i),
    });
  }
  if (!list.length) {
    const fallback = resolveAssetUrl(firstNonEmpty(promo && promo.img, promo && promo.image_path, ''));
    if (fallback) list.push({ file_path: fallback, description: '', position: 0 });
  }
  return list.slice(0, 3);
}

function renderPromoModalImage(images, index) {
  const media = document.getElementById('promoModalMedia');
  if (!media) return;
  if (!images.length) {
    media.innerHTML = '<div class="promo-modal-gallery-empty">Esta promoción no tiene imágenes cargadas.</div>';
    return;
  }
  const safeIndex = Math.max(0, Math.min(index, images.length - 1));
  promoModalImageIndex = safeIndex;
  const current = images[safeIndex];
  const safeDesc = String(current.description || '').trim();
  media.innerHTML = `
    <div class="promo-modal-gallery-main">
      <img id="promoModalMainImg" src="${current.file_path}" alt="Imagen promocion" />
    </div>
    <div class="promo-modal-img-desc" id="promoModalImgDesc">${safeDesc || 'Sin descripcion para esta imagen.'}</div>
    <div class="promo-modal-thumbs">
      ${images.map((img, idx) => `
        <button type="button" class="promo-modal-thumb ${idx === safeIndex ? 'active' : ''}" onclick="setPromoModalImage(${idx})">
          <img src="${img.file_path}" alt="Imagen ${idx + 1}" />
        </button>
      `).join('')}
    </div>
  `;
}

function setPromoModalImage(index) {
  const promo = promoModalItems[promoModalIndex];
  const images = getPromoModalImages(promo);
  renderPromoModalImage(images, Number(index || 0));
}

function openPromoModal(index) {
  const modal = document.getElementById('promoModal');
  if (!modal) return;
  if (!promoModalItems.length) return;
  const safePromoIndex = Math.max(0, Math.min(Number(index || 0), promoModalItems.length - 1));
  promoModalIndex = safePromoIndex;
  const promo = promoModalItems[safePromoIndex] || {};
  const title = firstNonEmpty(promo.titulo, promo.title, 'Promocion');
  const dateText = firstNonEmpty(promo.publicado, promo.fecha, '');
  const content = firstNonEmpty(promo.contenido, promo.content_html, '');
  const images = getPromoModalImages(promo);

  const titleEl = document.getElementById('promoModalTitle');
  const dateEl = document.getElementById('promoModalDate');
  const contentEl = document.getElementById('promoModalContent');
  if (titleEl) titleEl.textContent = title;
  if (dateEl) dateEl.textContent = dateText ? `Promocion activa · ${dateText}` : 'Promocion activa';
  if (contentEl) contentEl.innerHTML = content || '';
  renderPromoModalImage(images, 0);

  modal.classList.add('open');
  modal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
}

function closePromoModal() {
  const modal = document.getElementById('promoModal');
  if (!modal) return;
  modal.classList.remove('open');
  modal.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// HOURS
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const DAY_NAMES = { L:'Lunes', M:'Martes', X:'Miércoles', J:'Jueves', V:'Viernes', S:'Sábado', D:'Domingo' };
const DAY_JS = [null,'D','L','M','X','J','V','S']; // JS getDay(): 0=Sun
const CEB_TZ = (window.CEB_REGION && window.CEB_REGION.timeZone) || 'America/Bogota';
const WEEKDAY_TO_KEY = { Sun:'D', Mon:'L', Tue:'M', Wed:'X', Thu:'J', Fri:'V', Sat:'S' };

function getBogotaNowInfo() {
  const now = new Date();
  try {
    const weekday = new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone: CEB_TZ }).format(now);
    const parts = new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: CEB_TZ
    }).formatToParts(now);
    const hh = Number((parts.find((p) => p.type === 'hour') || {}).value || 0);
    const mm = Number((parts.find((p) => p.type === 'minute') || {}).value || 0);
    return { dayKey: WEEKDAY_TO_KEY[weekday] || 'L', minutes: hh * 60 + mm };
  } catch (e) {
    const dayKey = DAY_JS[now.getDay()];
    return { dayKey: dayKey, minutes: now.getHours() * 60 + now.getMinutes() };
  }
}

function checkIsOpen(horario) {
  if (!horario) return false;
  const nowInfo = getBogotaNowInfo();
  const day = nowInfo.dayKey;
  if (!horario[day]) return false;
  const [oh,om] = (horario.apertura||'08:00').split(':').map(Number);
  const [ch,cm] = (horario.cierre||'18:00').split(':').map(Number);
  const cur = nowInfo.minutes;
  return cur >= oh*60+om && cur <= ch*60+cm;
}

function buildHorarioHTML(horario) {
  if (!horario) return '';
  const todayKey = getBogotaNowInfo().dayKey;
  const rows = Object.entries(DAY_NAMES).map(([k,name]) => {
    const isToday = k === todayKey;
    const open    = horario[k];
    return `<tr class="${isToday?'today':''}">
      <td>${name}${isToday?' <em style="font-size:.68rem;color:var(--gold)">(hoy)</em>':''}</td>
      <td class="${open?'':'hours-closed'}">${open?(horario.apertura+' - '+horario.cierre):'Cerrado'}</td>
    </tr>`;
  }).join('');
  return `<table class="hours-table"><tbody>${rows}</tbody></table>`;
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// SOCIAL
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function buildRedesHTML(redes) {
  if (!redes) return '';
  const btns = [];
  if (redes.instagram) btns.push(`<a class="social-btn" href="https://instagram.com/${redes.instagram.replace('@','')}" target="_blank"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="5"/><path d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg> Instagram</a>`);
  if (redes.facebook) btns.push(`<a class="social-btn" href="${redes.facebook.startsWith('http')?redes.facebook:'https://facebook.com/'}" target="_blank"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z"/></svg> Facebook</a>`);
  if (redes.youtube) btns.push(`<a class="social-btn" href="${redes.youtube}" target="_blank"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22.54 6.42a2.78 2.78 0 00-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46a2.78 2.78 0 00-1.95 1.96A29 29 0 001 12a29 29 0 00.46 5.58A2.78 2.78 0 003.41 19.6C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 001.95-1.95A29 29 0 0023 12a29 29 0 00-.46-5.58z"/><polygon points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02"/></svg> YouTube</a>`);
  return btns.join('');
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// EMOJIS PER CATEGORY
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function getCategoryEmoji(cat) {
  const key = String(cat || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const map = {
    'Panaderias': '🥖',
    'Ferreterias': '🔧',
    'Restaurantes': '🍽️',
    'Peluquerias': '✂️',
    'Droguerias': '💊',
    'Veterinarias': '🐾',
    'Floristerias': '🌸',
    'Barberias': '💈',
    'Talleres mecanicos': '🔩',
    'Fruterias y verduras': '🥦',
    'Almacenes de ropa': '👗',
    'Almacenes de calzado': '👟',
    'Carnicerias': '🥩',
    'Comercio': '🏪',
  };
  return map[key] || '🏪';
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// COPY LINK
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function copyLink() {
  const url = document.getElementById('linkUrl')?.textContent;
  if (!url) return;
  navigator.clipboard.writeText(url).then(() => {
    showToast('Enlace copiado al portapapeles.', 'success');
    const btn = document.querySelector('.copy-btn');
    if (btn) { btn.textContent = 'Copiado'; setTimeout(() => btn.textContent = 'Copiar', 2000); }
  }).catch(() => {
    showToast('Copia manualmente: ' + url, 'info', 5000);
  });
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// LIGHTBOX
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function openLightbox(index) {
  if (!lbImages.length) return;
  lbIndex = index;
  document.getElementById('lbImg').src = lbImages[lbIndex];
  document.getElementById('lbCounter').textContent = `${lbIndex+1} / ${lbImages.length}`;
  document.getElementById('lightbox').classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeLightbox() {
  document.getElementById('lightbox').classList.remove('open');
  document.body.style.overflow = '';
}
function lbNavigate(dir) {
  lbIndex = (lbIndex + dir + lbImages.length) % lbImages.length;
  document.getElementById('lbImg').src = lbImages[lbIndex];
  document.getElementById('lbCounter').textContent = `${lbIndex+1} / ${lbImages.length}`;
}
document.getElementById('lightbox').addEventListener('click', function(e) {
  if (e.target === this) closeLightbox();
});
document.getElementById('promoModal').addEventListener('click', function(e) {
  if (e.target === this) closePromoModal();
});
document.addEventListener('keydown', e => {
  const lightboxOpen = document.getElementById('lightbox').classList.contains('open');
  const promoOpen = document.getElementById('promoModal').classList.contains('open');
  if (!lightboxOpen && !promoOpen) return;
  if (e.key === 'Escape') {
    if (lightboxOpen) closeLightbox();
    if (promoOpen) closePromoModal();
  }
  if (lightboxOpen && e.key === 'ArrowRight') lbNavigate(1);
  if (lightboxOpen && e.key === 'ArrowLeft') lbNavigate(-1);
});

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// NOT FOUND
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function renderNotFound(slug) {
  document.getElementById('bizPage').innerHTML = `
    <div class="not-found">
      <div style="font-size:3rem">&#128269;</div>
      <h2>Negocio <em>no encontrado</em></h2>
      <p>No encontramos un negocio registrado con el identificador <code>${slug}</code>. Verifica el enlace o busca el negocio desde la página principal.</p>
      <div style="display:flex;gap:12px;flex-wrap:wrap;justify-content:center;margin-top:8px">
        <a href="index.html" class="btn btn-gold">Ir a la plataforma</a>
        <a href="panel.html" class="btn btn-outline">Soy el propietario &rarr;</a>
      </div>
      <div style="margin-top:32px;padding:20px;background:var(--dark-2);border:1px solid var(--border);border-radius:var(--radius-lg);max-width:480px;text-align:left">
        <div class="eyebrow" style="margin-bottom:10px">Prueba estos negocios demo</div>
        <div style="display:flex;flex-direction:column;gap:8px">
          <a href="negocio.html?empresa=panaderia-san-jose" style="color:var(--gold);text-decoration:none;font-size:.85rem">&#129366; Panadería San José (Kennedy)</a>
          <a href="negocio.html?empresa=ferreteria-el-perno" style="color:var(--gold);text-decoration:none;font-size:.85rem">&#128295; Ferretería El Perno (Puente Aranda)</a>
        </div>
      </div>
    </div>`;
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// MAIN
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
document.addEventListener('DOMContentLoaded', async () => {
  const slug = getEmpresaSlug();
  if (!slug) {
    // No slug â€” show directory of all businesses
    await renderDirectory();
    return;
  }
  let neg = null;
  try {
    const fromApi = await fetchPublicBusinessBySlug(slug);
    if (fromApi) neg = normalizeNegocio(fromApi, slug, Store.get('negocio', null));
  } catch (e) {
    // fallback to local sources
  }

  if (!neg) neg = loadNegocio(slug);
  if (neg) renderPage(neg);
  else renderNotFound(slug);
});

async function renderDirectory() {
  const all = Store.get('negocios', {});
  const currentNeg = Store.get('negocio', null);
  const currentSlug = currentNeg ? slugify(firstNonEmpty(currentNeg.nombre, currentNeg.name, '')) : '';

  const demos = Object.values(DEMO_NEGOCIOS).map((n) =>
    normalizeNegocio(n, firstNonEmpty(n && n.slug, slugify(firstNonEmpty(n && n.nombre, n && n.name, ''))), null),
  );

  const stored = Object.values(all).map((n) => {
    const slug = firstNonEmpty(n && n.slug, slugify(firstNonEmpty(n && n.nombre, n && n.name, '')));
    const fallback = slug === currentSlug ? currentNeg : null;
    return normalizeNegocio(n, slug, fallback);
  });

  const bySlug = new Map();
  demos.forEach((n) => { if (n && n.slug) bySlug.set(n.slug, n); });
  stored.forEach((n) => { if (n && n.slug) bySlug.set(n.slug, n); });
  try {
    const fromApi = await fetchPublicBusinesses();
    fromApi.forEach((n) => {
      if (!n) return;
      const nSlug = firstNonEmpty(n.slug, slugify(firstNonEmpty(n.name, n.nombre, '')));
      if (!nSlug) return;
      bySlug.set(nSlug, normalizeNegocio(n, nSlug, null));
    });
  } catch (e) {
    // keep local/demos if backend is unavailable
  }

  const combined = Array.from(bySlug.values()).map((n) => ({ ...n, logo: resolveAssetUrl(n.logo) }));

  function esc(v) {
    return String(v || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function cleanText(v) {
    return fixMojibakeText(v)
      .replace(/\uFFFD/g, '')
      .replace(/\s{2,}/g, ' ')
      .trim();
  }

  function norm(v) {
    return cleanText(v)
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  }

  function cardHTML(n) {
    const slug = esc(n.slug || '');
    const nombre = esc(cleanText(n.nombre || n.name || ''));
    const categoria = esc(cleanText(n.categoria || n.category || ''));
    const localidad = esc(cleanText(n.localidad || n.locality || ''));
    const logo = esc(n.logo || '');
    const icon = esc(getCategoryEmoji(n.categoria || n.category || ''));
    return `
      <a href="negocio.html?empresa=${slug}" style="text-decoration:none">
        <div style="background:var(--dark-2);border:1px solid var(--border);border-radius:var(--radius-lg);padding:24px;transition:border-color .2s,transform .2s;display:flex;align-items:center;gap:16px" onmouseover="this.style.borderColor='var(--gold-dim)';this.style.transform='translateY(-2px)'" onmouseout="this.style.borderColor='';this.style.transform=''">
          <div style="width:52px;height:52px;border-radius:12px;background:var(--dark-3);border:1px solid var(--border);display:flex;align-items:center;justify-content:center;font-size:1.4rem;flex-shrink:0;overflow:hidden">${logo ? `<img src="${logo}" style="width:100%;height:100%;object-fit:cover" />` : `${icon}`}</div>
          <div style="min-width:0">
            <div style="font-weight:600;font-size:.95rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${nombre}</div>
            <div style="font-size:.78rem;color:var(--text-muted);margin-top:2px">${categoria} - ${localidad}</div>
            <div style="font-size:.7rem;color:var(--gold);font-family:var(--font-main);margin-top:4px">${slug}</div>
          </div>
        </div>
      </a>`;
  }

  const categories = Array.from(
    new Set(
      combined
        .map((n) => cleanText(n.categoria || n.category || ''))
        .filter(Boolean),
    ),
      ).sort((a, b) => a.localeCompare(b, 'es-419'));

  const localityOptions = [
    'Antonio Nari\u00f1o',
    'Barrios Unidos',
    'Bosa',
    'Chapinero',
    'Ciudad Bol\u00edvar',
    'Engativ\u00e1',
    'Fontib\u00f3n',
    'Kennedy',
    'La Candelaria',
    'Los M\u00e1rtires',
    'Puente Aranda',
    'Rafael Uribe Uribe',
    'San Crist\u00f3bal',
    'Santa Fe',
    'Suba',
    'Sumapaz',
    'Teusaquillo',
    'Tunjuelito',
    'Usaqu\u00e9n',
    'Usme',
  ];

  document.title = 'Directorio - Comercio e-Bogota';
  document.getElementById('bizPage').innerHTML = `
    <div style="max-width:1100px;margin:0 auto;padding:60px 5% 80px">
      <div class="eyebrow" style="margin-bottom:12px">Directorio</div>
      <h1 style="font-family:var(--font-main);font-size:clamp(2rem,4vw,3rem);font-weight:400;margin-bottom:8px">Negocios en <em style="font-style:italic;color:var(--gold-light)">Bogot&aacute;</em></h1>
      <p style="color:var(--text-muted);margin-bottom:24px;font-size:.9rem">Encuentra comercios, tiendas y servicios locales en tu ciudad.</p>

      <div id="dirFilters" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:10px;margin-bottom:14px">
        <input id="dirSearchName" class="form-input" placeholder="Buscar por nombre de empresa" />
        <select id="dirSearchLocality" class="form-input">
          <option value="">Todas las localidades</option>
        </select>
        <select id="dirCategory" class="form-input">
          <option value="">Todas las categorias</option>
        </select>
      </div>

      <div id="dirMeta" style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">
        <div id="dirCount" style="font-size:.78rem;color:var(--text-muted)"></div>
        <button id="dirClearFilters" class="btn btn-outline btn-sm">Limpiar filtros</button>
      </div>

      <div id="dirGrid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px"></div>
      <div id="dirEmpty" style="display:none;text-align:center;padding:36px;border:1px dashed var(--border);border-radius:var(--radius-lg);color:var(--text-muted);font-size:.9rem">
        No se encontraron negocios con esos filtros.
      </div>
    </div>`;

  const catSelect = document.getElementById('dirCategory');
  categories.forEach((c) => {
    const opt = document.createElement('option');
    opt.value = c;
    opt.textContent = c;
    catSelect.appendChild(opt);
  });

  const nameInput = document.getElementById('dirSearchName');
  const localitySelect = document.getElementById('dirSearchLocality');
  const grid = document.getElementById('dirGrid');
  const empty = document.getElementById('dirEmpty');
  const count = document.getElementById('dirCount');

  localityOptions.forEach((loc) => {
    const opt = document.createElement('option');
    const cleanLoc = cleanText(loc);
    opt.value = cleanLoc;
    opt.textContent = cleanLoc;
    localitySelect.appendChild(opt);
  });

  function applyFilters() {
    const qName = norm(nameInput.value);
    const qLocality = norm(localitySelect.value);
    const qCategory = String(catSelect.value || '').trim();

    const filtered = combined.filter((n) => {
      const nName = norm(n.nombre || n.name || '');
      const nSlug = norm(n.slug || '');
      const nLocality = norm(n.localidad || n.locality || '');
      const nCategory = cleanText(n.categoria || n.category || '');

      if (qCategory && nCategory !== qCategory) return false;
      if (qName && !(nName.includes(qName) || nSlug.includes(qName))) return false;
      if (qLocality && nLocality !== qLocality) return false;
      return true;
    });

    grid.innerHTML = filtered.map(cardHTML).join('');
    empty.style.display = filtered.length ? 'none' : 'block';
    count.textContent = `${filtered.length} negocio(s)`;
  }

  nameInput.addEventListener('input', applyFilters);
  localitySelect.addEventListener('change', applyFilters);
  catSelect.addEventListener('change', applyFilters);
  document.getElementById('dirClearFilters').addEventListener('click', () => {
    nameInput.value = '';
    localitySelect.value = '';
    catSelect.value = '';
    applyFilters();
  });

  applyFilters();
}
