(function () {
  'use strict';

  function unique(list) {
    var seen = {};
    var out = [];
    for (var i = 0; i < list.length; i += 1) {
      var value = list[i];
      if (!value || seen[value]) continue;
      seen[value] = true;
      out.push(value);
    }
    return out;
  }

  function normalizeApiBase(url) {
    if (!url || typeof url !== 'string') return '';
    var cleaned = url.trim().replace(/\/+$/, '');
    if (!/^https?:\/\//i.test(cleaned)) return '';
    cleaned = cleaned.replace(/\/api\/v1$/i, '');
    return cleaned + '/api/v1';
  }

  var runtimeHost = (window.location && window.location.hostname) ? window.location.hostname : '127.0.0.1';
  var apiBases = unique([
    normalizeApiBase(window.CEB_API_BASE || ''),
    'http://' + runtimeHost + ':8000/api/v1',
    'http://127.0.0.1:8000/api/v1',
    'http://localhost:8000/api/v1'
  ]).filter(Boolean);

  function parseJson(responseText) {
    if (!responseText) return null;
    try {
      return JSON.parse(responseText);
    } catch (err) {
      return null;
    }
  }

  async function fetchFromBases(path, options) {
    var lastError = null;
    for (var i = 0; i < apiBases.length; i += 1) {
      var base = apiBases[i];
      try {
        var response = await fetch(base + path, options || { method: 'GET' });
        var text = await response.text();
        var payload = parseJson(text);
        if (!response.ok) {
          var error = new Error('HTTP ' + response.status + ' at ' + path);
          error.status = response.status;
          error.payload = payload;
          throw error;
        }
        return payload;
      } catch (err) {
        lastError = err;
      }
    }
    throw lastError || new Error('API unavailable');
  }

  function toArray(payload) {
    if (Array.isArray(payload)) return payload;
    if (payload && Array.isArray(payload.items)) return payload.items;
    if (payload && Array.isArray(payload.value)) return payload.value;
    return [];
  }

  function toObject(payload) {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return null;
    return payload;
  }

  function planRank(plan) {
    var score = 0;
    var code = String(plan && plan.code || '').toUpperCase();
    var price = Number(plan && plan.price_cop || 0);

    if (!/TRIAL|PRUEBA|FREE|GRATIS/.test(code) && price > 0) score += 100;
    if (/PLAN/.test(code)) score += 10;
    score += Math.min(price, 999999) / 1000000;
    return score;
  }

  function pickPlanByMonths(plans, months) {
    var targetMonths = Number(months);
    var matches = plans.filter(function (plan) {
      return Number(plan.months) === targetMonths;
    });

    if (!matches.length) return null;

    matches.sort(function (a, b) {
      var scoreDiff = planRank(b) - planRank(a);
      if (scoreDiff !== 0) return scoreDiff;
      return Number(b.price_cop || 0) - Number(a.price_cop || 0);
    });

    return matches[0];
  }

  function formatCop(value) {
    var amount = Number(value || 0);
    try {
      return amount.toLocaleString('es-CO');
    } catch (err) {
      return String(Math.round(amount));
    }
  }

  function buildTotalLabel(months, planPrice, baseMonthPrice) {
    var monthCount = Number(months || 0);
    var configuredTotal = Number(planPrice || 0);

    if (monthCount <= 1) {
      return 'Sin descuento adicional';
    }

    // Regla: precio de cada plan (3/6/12) es total del periodo configurado en Admin.
    var regular = monthCount * Number(baseMonthPrice || 0);
    var savings = Math.max(0, regular - configuredTotal);
    if (savings > 0) {
      return 'Total: $' + formatCop(configuredTotal) + ' - Ahorras $' + formatCop(savings) + ' pesos.';
    }

    return 'Total: $' + formatCop(configuredTotal);
  }

  function updatePlanCard(card, plan, basePlan) {
    var months = Number(plan.months || card.getAttribute('data-plan-months') || 0);
    var images = Number(plan.max_images || 0);
    var promos = Number(plan.max_promotions_month || 0);
    var price = Number(plan.price_cop || 0);
    var basePrice = Number((basePlan && basePlan.price_cop) || 0);

    var tagNode = card.querySelector('.plan-tag');
    var priceNode = card.querySelector('.plan-price');
    var totalNode = card.querySelector('.plan-total');
    var listItems = card.querySelectorAll('.plan-list li, .plan-features .plan-feat');

    if (tagNode) {
      tagNode.textContent = 'Plan ' + months + ' ' + (months === 1 ? 'Mes' : 'Meses');
    }

    if (priceNode) {
      priceNode.innerHTML = '<sup>$</sup>' + formatCop(price) + '<small>/plan</small>';
    }

    if (totalNode) {
      totalNode.textContent = buildTotalLabel(months, price, basePrice);
    }

    if (listItems && listItems[0]) {
      listItems[0].textContent = images + ' imágenes de productos';
    }

    if (listItems && listItems[1]) {
      var promosMes = Number(promos || 0);
      var promosSemana = promosMes > 0 ? Math.max(1, Math.floor(promosMes / 4)) : 0;
      listItems[1].textContent = promosSemana + ' promoción semanal (' + promosMes + ' al mes)';
    }
  }

  function renderPublicPlans(plansPayload) {
    var plans = toArray(plansPayload);
    if (!plans.length) return;

    var cards = document.querySelectorAll('#plansGrid [data-plan-months]');
    if (!cards.length) return;

    var planByMonths = {};
    [1, 3, 6, 12].forEach(function (months) {
      var plan = pickPlanByMonths(plans, months);
      if (plan) planByMonths[months] = plan;
    });

    var basePlan = planByMonths[1] || null;

    cards.forEach(function (card) {
      var months = Number(card.getAttribute('data-plan-months') || 0);
      var plan = planByMonths[months];
      if (!plan) return;
      updatePlanCard(card, plan, basePlan);
    });
  }

  function applyPublicSettings(plansPayload, settingsPayload) {
    var plans = toArray(plansPayload);
    var settings = toObject(settingsPayload) || {};

    var basePlan = pickPlanByMonths(plans, 1) || (plans[0] || null);
    var maxImages = Number((basePlan && basePlan.max_images) || 10);
    var maxPromos = Number((basePlan && basePlan.max_promotions_month) || 4);
    var trialDays = Number(settings.trial_days || 30);
    var expiryNoticeDays = Number(settings.expiry_notice_days || 5);

    if (!Number.isFinite(maxImages) || maxImages <= 0) maxImages = 10;
    if (!Number.isFinite(maxPromos) || maxPromos <= 0) maxPromos = 4;
    if (!Number.isFinite(trialDays) || trialDays <= 0) trialDays = 30;
    if (!Number.isFinite(expiryNoticeDays) || expiryNoticeDays <= 0) expiryNoticeDays = 5;

    var statImages = document.getElementById('indexStatMaxImages');
    if (statImages) statImages.textContent = String(maxImages);
    var statPromos = document.getElementById('indexStatMaxPromos');
    if (statPromos) statPromos.textContent = String(maxPromos);
    var statTrial = document.getElementById('indexStatTrialDays');
    if (statTrial) statTrial.textContent = String(trialDays);

    var featPromos = document.getElementById('indexFeatPromosDesc');
    if (featPromos) {
      featPromos.textContent = 'Hasta ' + String(maxPromos) + ' promociones por mes, visibles en la página principal de la plataforma y en tu sitio.';
    }
    var featImages = document.getElementById('indexFeatImagesDesc');
    if (featImages) {
      featImages.textContent = 'Hasta ' + String(maxImages) + ' imágenes con editor integrado: recorte, filtros, rotación, directamente en el navegador.';
    }
    var featAlert = document.getElementById('indexFeatAlertDesc');
    if (featAlert) {
      featAlert.textContent = 'Notificación ' + String(expiryNoticeDays) + ' días antes del vencimiento de tu plan para que nunca pierdas visibilidad.';
    }
    var stepTrial = document.getElementById('indexStepTrialDesc');
    if (stepTrial) {
      stepTrial.textContent = 'Solicita tu código de prueba gratuita (' + String(trialDays) + ' días) a través de WhatsApp. Ingrésalo en MI CUENTA.';
    }
    var ctaDays = document.getElementById('indexPromoCtaDays');
    if (ctaDays) ctaDays.textContent = String(trialDays) + ' días gratis';
  }

  async function loadPublicPlans() {
    var plans = [];
    var settings = null;

    try {
      plans = await fetchFromBases('/public/plans', { method: 'GET' });
    } catch (err) {
      plans = [];
    }
    try {
      settings = await fetchFromBases('/public/platform-settings', { method: 'GET' });
    } catch (err) {
      settings = null;
    }

    if (!toArray(plans).length) {
      var adminToken = localStorage.getItem('ceb_admin_api_token') || sessionStorage.getItem('ceb_admin_api_token') || '';
      if (adminToken) {
        try {
          plans = await fetchFromBases('/admin/plans', {
            method: 'GET',
            headers: { Authorization: 'Bearer ' + adminToken }
          });
        } catch (err) {
          plans = [];
        }
      }
    }

    if (!toArray(plans).length) {
      var userToken = localStorage.getItem('ceb_api_token') || sessionStorage.getItem('ceb_api_token') || '';
      if (userToken) {
        try {
          plans = await fetchFromBases('/me/plans', {
            method: 'GET',
            headers: { Authorization: 'Bearer ' + userToken }
          });
        } catch (err) {
          plans = [];
        }
      }
    }

    renderPublicPlans(plans);
    applyPublicSettings(plans, settings);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadPublicPlans);
  } else {
    loadPublicPlans();
  }
})();
