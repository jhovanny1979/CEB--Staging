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
  const icons = { success: '✓', error: '✕', info: '◆' };
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.innerHTML = `<span>${icons[type] || '◆'}</span> ${msg}`;
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
function initActiveNav() {
  const current = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-menu a').forEach(a => {
    const href = a.getAttribute('href');
    if (href && (href === current || href.includes(current.replace('.html', '')))) {
      a.classList.add('active');
    }
  });
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

// ── Init on DOMContentLoaded ──────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initReveal();
  initActiveNav();
});
