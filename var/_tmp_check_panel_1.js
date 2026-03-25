
// â”€â”€ Auth â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function doLogin() {
  const email = document.getElementById('loginEmail').value.trim();
  const pw    = document.getElementById('loginPw').value;
  const errEl = document.getElementById('loginError');

  if (!email || !pw) { showToast('Ingresa usuario y contraseÃ±a.', 'error'); return; }

  // Demo: any email+pw combination works, or match stored user
  const stored = Store.get('user');
  const match  = stored ? (stored.email === email) : true;

  if (!match) {
    errEl.style.display = 'flex'; return;
  }

  errEl.style.display = 'none';
  const user = stored || { email, nombre: email.split('@')[0].replace(/[._]/g,' ').replace(/\b\w/g,c=>c.toUpperCase()), plan: 'GRATIS' };
  user.loggedIn = true;
  Store.set('user', user);
  loadPanel(user);
}

document.getElementById('loginPw').addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });

function loadPanel(user) {
  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('panelScreen').style.display = 'block';
  document.getElementById('sbName').textContent = user.nombre || user.email;
  document.getElementById('sbPlan').textContent = user.plan || 'GRATIS';
  document.getElementById('planBadge').textContent = user.plan || 'GRATIS';
  document.getElementById('planNombre').textContent = user.plan || 'GRATIS';

  const navUserItem = document.getElementById('navUserItem');
  navUserItem.style.display = '';
  document.getElementById('navUserName').textContent = user.nombre || user.email;

  // Load stored negocio data
  const neg = Store.get('negocio', {});
  if (neg.nombre) {
    document.getElementById('negNombre').value = neg.nombre;
    // Show direct link card if already saved
    const url = buildNegocioURL(neg.nombre);
    const linkCard = document.getElementById('linkCard');
    const linkEl   = document.getElementById('panelLinkUrl');
    const anchor   = document.getElementById('panelLinkAnchor');
    if (linkEl)   linkEl.textContent = url;
    if (anchor)   anchor.href = url;
    if (linkCard) linkCard.style.display = 'block';
  }
  if (neg.email)  document.getElementById('negEmail').value  = neg.email;
  if (neg.dir)    document.getElementById('negDir').value    = neg.dir;
  if (neg.logo) {
    const imgEl = document.getElementById('negLogoImg');
    imgEl.src = neg.logo;
    const av = document.getElementById('sbAvatarImg');
    av.src = neg.logo; av.classList.add('show');
    document.querySelector('#sbAvatar .av-icon').style.display = 'none';
  }

  // Load gallery
  const gal = Store.get('gallery', []);
  gal.forEach(src => addGalleryThumb(src));

  // Load promos
  const promos = Store.get('promos', []);
  if (promos.length) {
    document.getElementById('promoList').innerHTML = '';
    promos.forEach(p => renderPromoItem(p));
  }

  if (typeof window.initWAModule === 'function') window.initWAModule(true);

  // Set date
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('fechaPago').value = today;
  document.getElementById('planActivacion').textContent = today.split('-').reverse().join('/');
  const exp = new Date(); exp.setDate(exp.getDate() + 8);
  document.getElementById('planVencimiento').textContent = exp.toISOString().split('T')[0].split('-').reverse().join('/');
}

function doLogout() {
  const u = Store.get('user'); if (u) { u.loggedIn = false; Store.set('user', u); }
  document.getElementById('panelScreen').style.display = 'none';
  document.getElementById('loginScreen').style.display = 'flex';
  document.getElementById('navUserItem').style.display = 'none';
  showToast('SesiÃ³n cerrada.', 'info');
}

// Auto-login if stored
document.addEventListener('DOMContentLoaded', () => {
  const u = Store.get('user');
  if (u && u.loggedIn) loadPanel(u);
});

// â”€â”€ Section navigation â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function showSection(name, linkEl, noscroll) {
  document.querySelectorAll('.panel-section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));
  const sec = document.getElementById('sec-' + name);
  if (sec) sec.classList.add('active');
  if (linkEl) linkEl.classList.add('active');
  if (name === 'promociones' && typeof window.initWAModule === 'function') window.initWAModule(true);
  if (!noscroll) window.scrollTo({ top: 0, behavior: 'smooth' });
}

// â”€â”€ Recovery modal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
let currentRecTab = 'usuario';
function openRecover(tab) {
  document.getElementById('recoverModal').classList.add('show');
  setRecTab(tab, document.querySelector(`.rec-tab:nth-child(${tab==='usuario'?1:tab==='contrasena'?2:3})`));
}
function closeRecover() { document.getElementById('recoverModal').classList.remove('show'); document.getElementById('recSuccess').style.display='none'; }
function setRecTab(tab, el) {
  currentRecTab = tab;
  document.querySelectorAll('.rec-tab').forEach(t => t.classList.remove('active'));
  if (el) el.classList.add('active');
  ['usuario','contrasena','cuenta'].forEach(t => {
    const el = document.getElementById('rec-' + t);
    if (el) el.style.display = t === tab ? 'block' : 'none';
  });
}
function doRecover() {
  const msgs = { usuario:'El nombre de usuario fue enviado a tu correo registrado.', contrasena:'Se enviÃ³ una contraseÃ±a temporal a tu correo.', cuenta:'Los datos de acceso fueron enviados a tu correo registrado.' };
  const el = document.getElementById('recSuccess');
  document.getElementById('recSuccessMsg').textContent = msgs[currentRecTab];
  el.style.display = 'flex';
  showToast('Â¡Listo! Revisa tu correo electrÃ³nico.', 'success');
}

// â”€â”€ Mi Cuenta â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
document.querySelectorAll('.plan-option').forEach(opt => {
  opt.addEventListener('click', () => {
    document.querySelectorAll('.plan-option').forEach(o => o.classList.remove('selected'));
    opt.classList.add('selected');
  });
});

const pfZone = document.getElementById('pfZone');
const pfInput = document.getElementById('pfInput');
pfZone.addEventListener('click', () => pfInput.click());
pfInput.addEventListener('change', () => {
  const file = pfInput.files[0]; if (!file) return;
  pfZone.classList.add('has-file');
  document.getElementById('pfName').textContent = file.name;
  document.getElementById('pfSize').textContent = (file.size / 1024).toFixed(1) + ' KB';
  document.getElementById('pfPreviewWrap').style.display = 'flex';
  if (file.type.startsWith('image/')) {
    const r = new FileReader();
    r.onload = e => { document.getElementById('pfThumb').src = e.target.result; };
    r.readAsDataURL(file);
  } else {
    document.getElementById('pfThumb').src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23C9A84C"%3E%3Cpath d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/%3E%3Cpolyline points="14 2 14 8 20 8" stroke="white" fill="none"/%3E%3C/svg%3E';
  }
  document.getElementById('pfEmpty').style.display = 'none';
  showToast('Soporte adjuntado âœ“', 'success');
});

function actualizarSuscripcion() {
  if (!pfInput.files[0]) { showToast('Adjunta el soporte de pago antes de continuar.', 'error'); return; }
  const meses = document.querySelector('input[name=planSel]:checked')?.value || '1';
  const precios = {'1':25000,'3':69000,'6':138000,'12':252000};
  const valorPlanFmt = (window.CEBFormat && typeof window.CEBFormat.number === 'function')
    ? window.CEBFormat.number(precios[meses])
    : precios[meses].toLocaleString('es-419');
  if (confirm(`Â¿EstÃ¡ seguro de realizar la actualizaciÃ³n de la suscripciÃ³n?\nPlan: ${meses} mes(es) â€” Valor: $${valorPlanFmt}`)) {
    showToast('Â¡SuscripciÃ³n enviada a verificaciÃ³n! RecibirÃ¡s un correo de confirmaciÃ³n en mÃ¡ximo 2 horas.', 'success', 5000);
    const u = Store.get('user', {}); u.plan = `PLAN ÃšNICO ${meses} MES${meses>1?'ES':''}`; Store.set('user', u);
    document.getElementById('planNombre').textContent = u.plan;
    document.getElementById('sbPlan').textContent = u.plan;
    document.getElementById('planBadge').textContent = u.plan;
    document.getElementById('planImagenes').textContent = '10';
    document.getElementById('planPromos').textContent = '4';
    document.getElementById('planValor').textContent = '$' + valorPlanFmt;
  }
}

function activarCodigo() {
  const codigo = document.getElementById('promoCodeInput').value.trim().toUpperCase();
  if (!codigo) { showToast('Ingresa un cÃ³digo promocional.', 'error'); return; }
  // Simulate validation
  setTimeout(() => {
    showToast('Â¡Actualizado! La suscripciÃ³n fue actualizada con el cÃ³digo promocional.', 'success', 4000);
    document.getElementById('planNombre').textContent = 'DEMO';
    document.getElementById('planImagenes').textContent = '10';
    document.getElementById('planPromos').textContent = '4';
    const exp = new Date(); exp.setDate(exp.getDate() + 30);
    document.getElementById('planVencimiento').textContent = exp.toISOString().split('T')[0].split('-').reverse().join('/');
    document.getElementById('promoCodeInput').value = '';
  }, 600);
}

function confirmarCancelar() {
  if (confirm('Â¿EstÃ¡ seguro de que desea cancelar su suscripciÃ³n?')) {
    showToast('SuscripciÃ³n cancelada. Tus datos permanecerÃ¡n activos hasta la fecha de vencimiento.', 'info', 4000);
  }
}

function cambiarPw() {
  const a = document.getElementById('pwActual').value;
  const n = document.getElementById('pwNueva').value;
  const n2= document.getElementById('pwNueva2').value;
  if (!a||!n||!n2) { showToast('Completa todos los campos.', 'error'); return; }
  if (n !== n2) { showToast('Las contraseÃ±as nuevas no coinciden.', 'error'); return; }
  if (n.length < 8) { showToast('La nueva contraseÃ±a debe tener al menos 8 caracteres.', 'error'); return; }
  showToast('ContraseÃ±a actualizada correctamente âœ“', 'success');
  document.getElementById('pwActual').value = document.getElementById('pwNueva').value = document.getElementById('pwNueva2').value = '';
  showSection('cuenta', document.querySelector('.sidebar-link'));
}

// â”€â”€ Mi Negocio â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
document.getElementById('negLogoInput').addEventListener('change', function() {
  const file = this.files[0]; if (!file) return;
  previewImage(file, document.getElementById('negLogoImg'), (src) => {
    const av = document.getElementById('sbAvatarImg');
    av.src = src; av.classList.add('show');
    document.querySelector('#sbAvatar .av-icon').style.display = 'none';
    Store.set('negLogoTemp', src);
    showToast('Logo actualizado âœ“', 'success');
  });
});

// Days toggle
document.querySelectorAll('.day-chip').forEach(chip => {
  chip.addEventListener('click', () => chip.classList.toggle('on'));
});

// Gallery
function getPanelMaxImages() {
  const limits = (window.__cebPlatformLimits && typeof window.__cebPlatformLimits === 'object')
    ? window.__cebPlatformLimits
    : null;
  const max = Number(limits && limits.max_images);
  if (Number.isFinite(max) && max > 0) return Math.floor(max);
  return 10;
}

const galleryInput = document.getElementById('galleryInput');
galleryInput.addEventListener('change', function() {
  const files = Array.from(this.files);
  const current = document.querySelectorAll('.gallery-thumb').length;
  const remaining = getPanelMaxImages() - current;
  if (files.length > remaining) {
    showToast(`Solo puedes agregar ${remaining} imagen${remaining!==1?'s':''} mÃ¡s (mÃ¡ximo ${getPanelMaxImages()}).`, 'error');
    return;
  }
  files.slice(0, remaining).forEach(file => {
    const reader = new FileReader();
    reader.onload = e => addGalleryThumb(e.target.result);
    reader.readAsDataURL(file);
  });
  this.value = '';
});

function addGalleryThumb(src) {
  const total = document.querySelectorAll('.gallery-thumb').length;
  if (total >= getPanelMaxImages()) return;
  const grid = document.getElementById('galleryGrid');
  const addBtn = document.getElementById('galleryAddBtn');
  const div = document.createElement('div');
  div.className = 'gallery-thumb';
  div.innerHTML = `<img src="${src}" alt="Imagen negocio" /><div class="gt-actions"><button class="gt-btn" title="Vista previa" onclick="previewGalleryImg(this)"></button><button class="gt-btn del" title="Eliminar" onclick="removeGalleryThumb(this)">âœ•</button></div>`;
  grid.insertBefore(div, addBtn);
  updateGalleryCount();
}

function removeGalleryThumb(btn) {
  if (confirm('Â¿Eliminar esta imagen?')) {
    btn.closest('.gallery-thumb').remove();
    updateGalleryCount();
  }
}

function previewGalleryImg(btn) {
  const img = btn.closest('.gallery-thumb').querySelector('img');
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.85);z-index:9999;display:flex;align-items:center;justify-content:center;cursor:pointer;padding:20px';
  overlay.innerHTML = `<img src="${img.src}" style="max-width:90%;max-height:90%;border-radius:12px;object-fit:contain" />`;
  overlay.addEventListener('click', () => overlay.remove());
  document.body.appendChild(overlay);
}

function updateGalleryCount() {
  const count = document.querySelectorAll('.gallery-thumb').length;
  const maxImages = getPanelMaxImages();
  document.getElementById('galleryCount').textContent = count;
  document.getElementById('galleryAddBtn').style.display = count >= maxImages ? 'none' : '';
}

function guardarNegocio() {
  const nombre = document.getElementById('negNombre').value.trim();
  if (!nombre) { showToast('El nombre del negocio es obligatorio.', 'error'); return; }

  const dias = {};
  document.querySelectorAll('.day-chip').forEach(c => { dias[c.dataset.day] = c.classList.contains('on'); });

  const data = {
    nombre,
    email:       document.getElementById('negEmail').value,
    dir:         document.getElementById('negDir').value,
    localidad:   document.getElementById('negLocalidad').value,
    categoria:   document.getElementById('negCategoria').value,
    descripcion: document.getElementById('negDesc').value,
    wp:          document.getElementById('negWp').value,
    instagram:   document.getElementById('negIg').value,
    facebook:    document.getElementById('negFb').value,
    youtube:     document.getElementById('negYt').value,
    logo:        Store.get('negLogoTemp', ''),
    domicilios:  document.getElementById('domicilios').checked,
    horario:     { ...dias, apertura: document.getElementById('horaApertura').value, cierre: document.getElementById('horaCierre').value },
    plan:        Store.get('user', {}).plan || 'ACTIVO'
  };

  Store.set('negocio', data);
  const gal = Array.from(document.querySelectorAll('.gallery-thumb img')).map(i => i.src);
  Store.set('gallery', gal);
  saveNegocioToStore({ ...data, galeria: gal, promos: Store.get('promos', []) });
  showToast('Â¡Negocio guardado correctamente âœ“', 'success');
}

function publicarNegocio() {
  const nombre = document.getElementById('negNombre').value.trim();
  if (!nombre) { showToast('El nombre del negocio es obligatorio para publicar.', 'error'); return; }

  guardarNegocio();
  const url = buildNegocioURL(nombre);

  // Update persistent card below the button
  const linkCard = document.getElementById('linkCard');
  const linkEl   = document.getElementById('panelLinkUrl');
  const anchor   = document.getElementById('panelLinkAnchor');
  if (linkEl)   linkEl.textContent = url;
  if (anchor)   anchor.href = url;
  if (linkCard) linkCard.style.display = 'block';

  // Show prominent modal immediately
  document.getElementById('modalLinkUrl').textContent  = url;
  document.getElementById('modalLinkAnchor').href      = url;
  document.getElementById('publishModal').style.display = 'flex';
}

function closePublishModal() {
  document.getElementById('publishModal').style.display = 'none';
}

// Close modal on backdrop click
document.getElementById('publishModal').addEventListener('click', function(e) {
  if (e.target === this) closePublishModal();
});

function copyModalLink() {
  const url = document.getElementById('modalLinkUrl').textContent;
  navigator.clipboard.writeText(url).then(() => {
    const btn = document.getElementById('copyModalBtn');
    if (btn) { btn.innerHTML = 'âœ“ &nbsp;Â¡Enlace copiado!'; btn.style.background = '#2ECC71'; }
    setTimeout(() => {
      if (btn) { btn.innerHTML = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg> Copiar enlace'; btn.style.background = 'var(--gold)'; }
    }, 2500);
    showToast('Â¡Enlace copiado al portapapeles! âœ“', 'success');
  }).catch(() => showToast('Copia manualmente: ' + url, 'info', 6000));
}

function copyPanelLink() {
  const url = document.getElementById('panelLinkUrl')?.textContent;
  if (!url) return;
  navigator.clipboard.writeText(url).then(() => {
    showToast('Â¡Enlace copiado! âœ“', 'success');
    const btn = document.getElementById('copyPanelBtn');
    if (btn) { btn.textContent = 'Â¡Copiado!'; setTimeout(() => btn.textContent = 'Copiar', 2000); }
  }).catch(() => showToast('Copia manualmente: ' + url, 'info', 6000));
}

// â”€â”€ Promociones â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function togglePromoForm() {
  const fc = document.getElementById('promoFormCard');
  fc.classList.toggle('show');
  if (fc.classList.contains('show')) fc.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

document.getElementById('promoImgInput').addEventListener('change', function() {
  if (window.CEBApi && typeof window.CEBApi.getToken === 'function' && window.CEBApi.getToken()) {
    return; // El flujo real con backend lo maneja integration.js
  }
  const file = this.files[0]; if (!file) return;
  const prev = document.getElementById('promoImgPreview');
  const nameEl = document.getElementById('promoImgName');
  previewImage(file, prev, () => {
    prev.style.display = 'block';
    nameEl.textContent = file.name; nameEl.style.display = 'block';
    showToast('Imagen cargada âœ“', 'success');
  });
});

function execCmd(cmd, val) {
  document.getElementById('promoEditor').focus();
  document.execCommand(cmd, false, val || null);
}

function crearPromocion() {
  const titulo  = document.getElementById('promoTitulo').value.trim();
  const editor  = document.getElementById('promoEditor').innerHTML.trim();
  const imgPrev = document.getElementById('promoImgPreview');

  if (!titulo) { showToast('El tÃ­tulo de la promociÃ³n es obligatorio.', 'error'); return; }
  if (!editor || editor === '<br>') { showToast('Escribe el contenido de la promociÃ³n.', 'error'); return; }

  if (!confirm('Â¿EstÃ¡ seguro de crear esta promociÃ³n? Solo puede publicar 1 semanal.')) return;

  const promo = {
    id: Date.now(), titulo, contenido: editor,
    img: imgPrev.src && imgPrev.style.display !== 'none' ? imgPrev.src : '',
    fecha: (window.CEBFormat && typeof window.CEBFormat.date === 'function')
      ? window.CEBFormat.date(new Date())
      : new Date().toLocaleDateString('es-419'),
    estado: 'NO PUBLICADO'
  };

  const promos = Store.get('promos', []);
  promos.unshift(promo);
  Store.set('promos', promos);

  if (document.getElementById('promoList').querySelector('div[style]')) {
    document.getElementById('promoList').innerHTML = '';
  }
  renderPromoItem(promo);
  showToast('Â¡PromociÃ³n creada correctamente!', 'success');
  document.getElementById('promoTitulo').value = '';
  document.getElementById('promoEditor').innerHTML = '';
  imgPrev.style.display = 'none';
  document.getElementById('promoImgName').style.display = 'none';
  document.getElementById('promoFormCard').classList.remove('show');
}

function getPromoPrimaryImage(promo) {
  const imgs = Array.isArray(promo && promo.images) ? promo.images : [];
  if (imgs.length) {
    const first = imgs[0] || {};
    return String(first.file_path || first.path || promo.image_path || promo.img || '');
  }
  return String((promo && (promo.image_path || promo.img)) || '');
}

function getPromoImageCount(promo) {
  const imgs = Array.isArray(promo && promo.images) ? promo.images : [];
  if (imgs.length) return imgs.length;
  return getPromoPrimaryImage(promo) ? 1 : 0;
}

function resolvePromoThumbUrl(path) {
  const raw = String(path || '').trim();
  if (!raw) return '';
  if (/^(data:|blob:)/i.test(raw)) return raw;
  if (/^https?:\/\//i.test(raw)) return raw;

  const normalized = raw.startsWith('/') ? raw : ('/' + raw);
  if (normalized.toLowerCase().startsWith('/uploads/')) {
    const apiBase = (window.CEBApi && window.CEBApi.baseUrl)
      || localStorage.getItem('ceb_api_base')
      || 'http://127.0.0.1:8000/api/v1';
    const origin = String(apiBase).replace(/\/?api\/v1\/?$/i, '');
    return origin + normalized;
  }
  return normalized;
}

function renderPromoItem(promo) {
  const list = document.getElementById('promoList');
  const div = document.createElement('div');
  const promoId = String(promo.id ?? '');
  const promoIdEscaped = promoId.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  const estadoRaw = String(promo.estado || '').trim().toUpperCase();
  const isPublished = estadoRaw === 'PUBLICADO' || estadoRaw === 'PUBLISHED';
  const estadoLabel = isPublished ? 'PUBLICADO' : (estadoRaw || 'NO PUBLICADO');
  const primaryImage = resolvePromoThumbUrl(getPromoPrimaryImage(promo));
  const imageCount = getPromoImageCount(promo);
  const promoTitle = String(promo.titulo || 'Promocion').replace(/"/g, '&quot;');
  div.className = `promo-item${isPublished?' published':''}`;
  div.id = 'promo-' + promoId;
  div.innerHTML = `
    ${primaryImage
      ? `<img class="pi-thumb" src="${primaryImage}" alt="${promoTitle}" onerror="this.style.display='none'; var fb=this.nextElementSibling; if(fb){fb.style.display='flex';}" /><div class="pi-thumb" style="display:none;align-items:center;justify-content:center;font-size:1.5rem">&#128227;</div>`
      : `<div class="pi-thumb" style="display:flex;align-items:center;justify-content:center;font-size:1.5rem">&#128227;</div>`}
    <div class="pi-body">
      <div class="pi-title">${promo.titulo}</div>
      <div class="pi-meta">Creado: ${promo.fecha} | Imagenes: ${imageCount} | Vence: - | Estado: <span class="${isPublished?'badge badge-green':'badge badge-muted'}">${estadoLabel}</span></div>
      <div class="pi-actions">
        ${!isPublished ? `<button class="btn btn-gold btn-sm" onclick="publicarPromo('${promoIdEscaped}')">Publicar</button>` : `<button class="btn btn-ghost btn-sm" onclick="relanzarPromo('${promoIdEscaped}')">Volver a lanzar</button>`}
        <button class="btn btn-danger btn-sm" onclick="borrarPromo('${promoIdEscaped}')">Borrar</button>
      </div>
    </div>`;
  list.prepend(div);
}

function publicarPromo(id) {
  if (!confirm('Â¿EstÃ¡ seguro de publicar esta promociÃ³n?')) return;
  const promos = Store.get('promos', []);
  const p = promos.find(x => String(x.id) === String(id));
  if (p) {
    p.estado = 'PUBLICADO';
    p.publicado = (window.CEBFormat && typeof window.CEBFormat.date === 'function')
      ? window.CEBFormat.date(new Date())
      : new Date().toLocaleDateString('es-419');
    Store.set('promos', promos);
  }
  const el = document.getElementById('promo-' + String(id));
  if (el) {
    el.classList.add('published');
    const badge = el.querySelector('.badge');
    if (badge) { badge.className = 'badge badge-green'; badge.textContent = 'PUBLICADO'; }
    const btn = el.querySelector('.btn-gold');
    if (btn) { btn.textContent = 'Volver a lanzar'; btn.className = 'btn btn-ghost btn-sm'; btn.onclick = () => relanzarPromo(id); }
  }
  showToast('Â¡PromociÃ³n publicada! Ya es visible en la plataforma.', 'success');
}

function relanzarPromo(id) { showToast('Funcionalidad de relanzamiento disponible en la plataforma.', 'info'); }

async function borrarPromo(id) {
  if (!confirm('Â¿Eliminar esta promociÃ³n?')) return;

  if (window.CEBApi && typeof window.CEBApi.deletePromotion === 'function' && window.CEBApi.getToken && window.CEBApi.getToken()) {
    try {
      await window.CEBApi.deletePromotion(id);
      const rows = await window.CEBApi.listPromotions();
      const mapped = (rows || []).map(function (p) {
        const images = Array.isArray(p.images) ? p.images : [];
        const imagePath = images.length ? String((images[0] || {}).file_path || p.image_path || '') : String(p.image_path || '');
        return {
          id: p.id,
          titulo: p.title,
          contenido: p.content_html,
          img: imagePath || '',
          image_path: imagePath || '',
          images: images.map(function (img, idx) {
            return {
              file_path: String((img && img.file_path) || ''),
              description: String((img && img.description) || ''),
              position: Number((img && img.position) || idx),
            };
          }),
          fecha: p.published_at || p.starts_at || '',
          estado: (p.status || '').toUpperCase(),
          publicado: p.published_at || '',
        };
      });
      Store.set('promos', mapped);
      const list = document.getElementById('promoList');
      list.innerHTML = '';
      mapped.forEach(renderPromoItem);
      if (!mapped.length) {
        list.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text-muted);font-size:.875rem"><div style="font-size:2rem;margin-bottom:12px">ðŸ“£</div>No se han creado promociones. Haz clic en "+" para crear una.</div>';
      }
      showToast('PromociÃ³n eliminada.', 'info');
      return;
    } catch (e) {
      showToast('No se pudo eliminar en backend. Intentando local...', 'error');
    }
  }

  const el = document.getElementById('promo-' + String(id));
  if (el) el.remove();
  const promos = Store.get('promos', []).filter(x => String(x.id) !== String(id));
  Store.set('promos', promos);
  if (!document.getElementById('promoList').children.length) {
    document.getElementById('promoList').innerHTML = '<div style="text-align:center;padding:40px;color:var(--text-muted);font-size:.875rem"><div style="font-size:2rem;margin-bottom:12px">ðŸ“£</div>No se han creado promociones. Haz clic en "+" para crear una.</div>';
  }
  showToast('PromociÃ³n eliminada.', 'info');
}
