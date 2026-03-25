(function () {
  if (!window.CEBApi) return;

  function safeToast(msg, type) {
    if (typeof window.showToast === 'function') {
      window.showToast(msg, type || 'info');
    } else {
      alert(msg);
    }
  }

  function pageName() {
    return (location.pathname.split('/').pop() || '').toLowerCase();
  }

  function formValue(selector) {
    const el = document.querySelector(selector);
    return el ? el.value : '';
  }

  function storeRef() {
    try {
      // app.js defines Store as global const, not always on window.
      return typeof Store !== 'undefined' ? Store : null;
    } catch (e) {
      return null;
    }
  }

  async function setupRegistro() {
    const form = document.getElementById('mainForm');
    if (!form) return;

    form.addEventListener(
      'submit',
      async function (e) {
        e.preventDefault();
        e.stopImmediatePropagation();

        if (typeof window.validateForm === 'function' && !window.validateForm(form)) {
          safeToast('Revisa los campos requeridos.', 'error');
          return;
        }

        const terms = document.getElementById('termsCheck');
        if (terms && !terms.checked) {
          safeToast('Debes aceptar los terminos y condiciones.', 'error');
          return;
        }

        const body = {
          full_name: formValue('[name="nombre"]') || formValue('[name="negocio"]') || 'Usuario',
          email: formValue('[name="email"]'),
          password: formValue('[name="password"]'),
          business_name: formValue('[name="negocio"]'),
        };

        try {
          await window.CEBApi.register(body);
          const store = storeRef();
          if (store) {
            store.set('user', {
              email: body.email,
              nombre: body.business_name || body.full_name,
              plan: 'GRATIS',
              loggedIn: false,
            });
          }

          const successEmail = document.getElementById('successEmail');
          if (successEmail) successEmail.textContent = body.email;

          const registroForm = document.getElementById('registroForm');
          const regSuccess = document.getElementById('regSuccess');
          if (registroForm) registroForm.style.display = 'none';
          if (regSuccess) regSuccess.style.display = 'block';
          safeToast('Registro exitoso. Cuenta creada en backend.', 'success');
        } catch (err) {
          safeToast(err.message || 'No fue posible registrar.', 'error');
        }
      },
      true,
    );
  }

  async function syncBusinessFromApi() {
    const biz = await window.CEBApi.getBusiness();
    if (!biz) return;

    const store = storeRef();
    if (store) {
      store.set('negocio', {
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
        logo: biz.logo_path,
        domicilios: biz.has_delivery,
        horario: {},
        plan: store.get('user', {}).plan || 'ACTIVO',
      });
    }

    if (document.getElementById('negNombre')) document.getElementById('negNombre').value = biz.name || '';
    if (document.getElementById('negEmail')) {
      const store2 = storeRef();
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
  }

  async function syncPromosFromApi() {
    const promos = await window.CEBApi.listPromotions();
    const store = storeRef();
    if (store) {
      store.set(
        'promos',
        promos.map(function (p) {
          return {
            id: p.id,
            titulo: p.title,
            contenido: p.content_html,
            img: p.image_path || '',
            fecha: p.published_at || p.starts_at || '',
            estado: (p.status || '').toUpperCase(),
            publicado: p.published_at || '',
          };
        }),
      );
    }

    const list = document.getElementById('promoList');
    if (!list || typeof window.renderPromoItem !== 'function') return;
    list.innerHTML = '';

    const store2 = storeRef();
    const localPromos = (store2 && store2.get('promos', [])) || [];
    localPromos.forEach(function (p) {
      window.renderPromoItem(p);
    });
  }

  async function setupPanel() {
    if (!document.getElementById('loginForm')) return;

    window.doLogin = async function () {
      const email = formValue('#loginEmail').trim();
      const password = formValue('#loginPw');
      if (!email || !password) {
        safeToast('Ingresa usuario y contrasena.', 'error');
        return;
      }
      try {
        const res = await window.CEBApi.login({ email: email, password: password });
        window.CEBApi.setToken(res.access_token);

        const store = storeRef();
        if (store) {
          store.set('user', {
            email: res.user.email,
            nombre: res.user.full_name,
            plan: 'ACTIVO',
            loggedIn: true,
          });
        }

        if (typeof window.loadPanel === 'function') {
          const store2 = storeRef();
          window.loadPanel(store2 ? store2.get('user') : res.user);
        }
        await syncBusinessFromApi();
        await syncPromosFromApi();
        safeToast('Sesion iniciada con backend.', 'success');
      } catch (err) {
        const errEl = document.getElementById('loginError');
        if (errEl) errEl.style.display = 'flex';
        safeToast(err.message || 'No fue posible iniciar sesion.', 'error');
      }
    };

    window.doRecover = async function () {
      var tab = window.currentRecTab || 'contrasena';
      var identifier =
        tab === 'usuario' ? formValue('#recNegocio') : tab === 'contrasena' ? formValue('#recEmail') : formValue('#recCuenta');
      try {
        await window.CEBApi.recover({ recovery_type: tab, identifier: identifier || 'n/a' });
        if (document.getElementById('recSuccess')) document.getElementById('recSuccess').style.display = 'flex';
        safeToast('Solicitud de recuperacion enviada.', 'success');
      } catch (err) {
        safeToast(err.message || 'No fue posible recuperar.', 'error');
      }
    };

    window.guardarNegocio = async function () {
      const store = storeRef();
      const payload = {
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
        safeToast(err.message || 'No fue posible guardar negocio.', 'error');
      }
    };

    window.crearPromocion = async function () {
      const title = formValue('#promoTitulo').trim();
      const content = (document.getElementById('promoEditor') || {}).innerHTML || '';
      const imgEl = document.getElementById('promoImgPreview');
      const imagePath = imgEl && imgEl.src && imgEl.style.display !== 'none' ? imgEl.src : '';
      if (!title || !content || content === '<br>') {
        safeToast('Completa titulo y contenido.', 'error');
        return;
      }
      try {
        await window.CEBApi.createPromotion({ title: title, content_html: content, image_path: imagePath });
        await syncPromosFromApi();
        safeToast('Promocion creada en backend.', 'success');
      } catch (err) {
        safeToast(err.message || 'No fue posible crear promocion.', 'error');
      }
    };

    window.publicarPromo = async function (id) {
      try {
        await window.CEBApi.publishPromotion(id);
        await syncPromosFromApi();
        safeToast('Promocion publicada.', 'success');
      } catch (err) {
        safeToast(err.message || 'No fue posible publicar.', 'error');
      }
    };

    window.relanzarPromo = async function (id) {
      try {
        await window.CEBApi.relaunchPromotion(id);
        await syncPromosFromApi();
        safeToast('Promocion relanzada.', 'success');
      } catch (err) {
        safeToast(err.message || 'No fue posible relanzar.', 'error');
      }
    };

    window.activarCodigo = async function () {
      const code = formValue('#promoCodeInput').trim();
      if (!code) {
        safeToast('Ingresa un codigo.', 'error');
        return;
      }
      try {
        await window.CEBApi.activateCode({ code: code.toUpperCase() });
        safeToast('Codigo activado.', 'success');
      } catch (err) {
        safeToast(err.message || 'No fue posible activar codigo.', 'error');
      }
    };

    window.actualizarSuscripcion = async function () {
      const selected = document.querySelector('input[name=planSel]:checked');
      const months = selected ? selected.value : '1';
      const plans = await window.CEBApi.listPlans();
      const plan = plans.find(function (p) {
        return String(p.months) === String(months);
      }) || plans[0];
      if (!plan) {
        safeToast('No hay planes disponibles.', 'error');
        return;
      }
      try {
        await window.CEBApi.upgradeSubscription({ plan_id: plan.id, payment_method: 'manual', notes: 'Desde panel cliente' });
        safeToast('Solicitud enviada para aprobacion.', 'success');
      } catch (err) {
        safeToast(err.message || 'No fue posible actualizar suscripcion.', 'error');
      }
    };
  }

  async function setupAdmin() {
    if (!document.getElementById('adminLogin')) return;

    function renderPending(rows) {
      const body = document.getElementById('bPendientes');
      const empty = document.getElementById('emPend');
      if (!body) return;
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
            '<td><div class="tn">' +
            r.business_id +
            '</div></td>' +
            '<td class="tmo">' +
            r.plan_id +
            '</td>' +
            '<td style="font-weight:600;color:var(--gold-light)">$' +
            Number(r.amount_cop || 0).toLocaleString('es-CO') +
            '</td>' +
            '<td class="tm">' +
            (r.payment_method || '') +
            '</td>' +
            '<td class="tm">' +
            (r.submitted_at || '') +
            '</td>' +
            '<td><div class="tact">' +
            '<button class="ab suc" onclick="window.__adminApprove(\'' +
            r.id +
            '\')">Aprobar</button>' +
            '<button class="ab dan" onclick="window.__adminReject(\'' +
            r.id +
            '\')">Rechazar</button>' +
            '</div></td>' +
            '</tr>'
          );
        })
        .join('');
    }

    async function loadAdminData() {
      try {
        const dashboard = await window.CEBApi.adminDashboard();
        const pending = await window.CEBApi.adminReceipts('pending');

        if (document.getElementById('k-total')) document.getElementById('k-total').textContent = dashboard.total_businesses || 0;
        if (document.getElementById('k-act')) document.getElementById('k-act').textContent = dashboard.active_subscriptions || 0;
        if (document.getElementById('k-pen')) document.getElementById('k-pen').textContent = dashboard.pending_receipts || 0;
        if (document.getElementById('k-ing')) document.getElementById('k-ing').textContent = '-';
        if (document.getElementById('sbNegocios')) document.getElementById('sbNegocios').textContent = dashboard.total_businesses || 0;
        if (document.getElementById('sbPendientes')) document.getElementById('sbPendientes').textContent = dashboard.pending_receipts || 0;

        renderPending(pending || []);
      } catch (err) {
        safeToast(err.message || 'No fue posible cargar datos admin.', 'error');
      }
    }

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

    window.doLogin = async function () {
      const email = formValue('#adminUser').trim();
      const password = formValue('#adminPw');
      try {
        const res = await window.CEBApi.adminLogin({ email: email, password: password });
        window.CEBApi.setAdminToken(res.access_token);
        if (document.getElementById('adminErr')) document.getElementById('adminErr').style.display = 'none';
        if (document.getElementById('adminLogin')) document.getElementById('adminLogin').style.display = 'none';
        if (document.getElementById('adminPanel')) document.getElementById('adminPanel').style.display = 'block';
        if (document.getElementById('tbUser')) document.getElementById('tbUser').textContent = res.user.email;
        await loadAdminData();
        safeToast('Sesion admin iniciada.', 'success');
      } catch (err) {
        if (document.getElementById('adminErr')) document.getElementById('adminErr').style.display = 'flex';
        safeToast(err.message || 'No fue posible iniciar sesion admin.', 'error');
      }
    };
  }

  async function bootstrap() {
    const page = pageName();
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
