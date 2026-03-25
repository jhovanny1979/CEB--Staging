
const logoZone = document.getElementById('logoZone');
const logoInput = document.getElementById('logoInput');
const logoPreview = document.getElementById('logoPreview');

logoZone.addEventListener('click', () => logoInput.click());
logoZone.addEventListener('dragover', e => { e.preventDefault(); logoZone.style.borderColor = 'var(--gold)'; });
logoZone.addEventListener('dragleave', () => { logoZone.style.borderColor = ''; });
logoZone.addEventListener('drop', e => {
  e.preventDefault(); logoZone.style.borderColor = '';
  const file = e.dataTransfer.files[0];
  if (file) handleLogoFile(file);
});
logoInput.addEventListener('change', () => { if (logoInput.files[0]) handleLogoFile(logoInput.files[0]); });

function handleLogoFile(file) {
  if (!file.type.startsWith('image/')) { showToast('Solo se aceptan imÃ¡genes JPG o PNG.', 'error'); return; }
  if (file.size > 2 * 1024 * 1024) { showToast('La imagen supera el lÃ­mite de 2MB.', 'error'); return; }
  const reader = new FileReader();
  reader.onload = e => {
    logoPreview.src = e.target.result;
    logoZone.classList.add('has-image');
    showToast('Logo cargado correctamente âœ“', 'success');
  };
  reader.readAsDataURL(file);
}

// Password strength
document.getElementById('pwField').addEventListener('input', function() {
  const v = this.value;
  const bar = document.getElementById('pwBar');
  const hint = document.getElementById('pwHint');
  let score = 0;
  if (v.length >= 8) score++;
  if (/[A-Z]/.test(v)) score++;
  if (/[0-9]/.test(v)) score++;
  if (/[^A-Za-z0-9]/.test(v)) score++;
  const colors = ['', '#E55', '#E5A020', '#C9A84C', '#2ECC71'];
  const labels = ['', 'Muy dÃ©bil', 'DÃ©bil', 'Regular', 'Segura'];
  bar.style.width = (score * 25) + '%';
  bar.style.background = colors[score] || 'transparent';
  hint.textContent = score > 0 ? `ContraseÃ±a: ${labels[score]}` : 'Usa letras, nÃºmeros y sÃ­mbolos para mayor seguridad.';
  hint.style.color = colors[score] || '';
});

// Promo toggle
document.getElementById('promoCheck').addEventListener('change', function() {
  document.getElementById('promoField').classList.toggle('show', this.checked);
});

// Real-time validation
document.querySelectorAll('.form-input, .form-select, .form-textarea').forEach(el => {
  el.addEventListener('blur', () => validateField(el));
});

// Form submit
document.getElementById('mainForm').addEventListener('submit', function(e) {
  e.preventDefault();
  const terms = document.getElementById('termsCheck');
  const termsErr = document.getElementById('termsError');

  let valid = validateForm(this);

  if (!terms.checked) {
    termsErr.textContent = 'Debes aceptar los tÃ©rminos y condiciones.';
    termsErr.style.display = 'block';
    valid = false;
  } else {
    termsErr.style.display = 'none';
  }

  if (!valid) {
    showToast('Por favor, revisa los campos marcados en rojo.', 'error');
    const firstError = this.querySelector('.has-error');
    if (firstError) firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }

  const submitBtn = document.getElementById('submitBtn');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Procesando...';

  // Simulate registration
  setTimeout(() => {
    const email = this.querySelector('[name="email"]').value;
    const nombre = this.querySelector('[name="negocio"]').value;
    Store.set('user', { email, nombre, plan: 'GRATIS', loggedIn: false });
    document.getElementById('successEmail').textContent = email;
    document.getElementById('registroForm').style.display = 'none';
    document.getElementById('regSuccess').style.display = 'block';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, 1500);
});
