
// â”€â”€ DATA â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const SEED = [
  {id:1,nombre:'PanaderÃ­a San JosÃ©',     email:'sanjose@gmail.com',    cat:'PanaderÃ­as',        loc:'Kennedy',       plan:'3 Meses',  val:72000,  est:'activo',   ini:'2024-01-10',vence:'2024-04-10',medio:'Nequi',       fotos:8, promos:2},
  {id:2,nombre:'FerreterÃ­a El Perno',    email:'perno@hotmail.com',    cat:'FerreterÃ­as',       loc:'Puente Aranda', plan:'6 Meses',  val:138000, est:'activo',   ini:'2024-01-05',vence:'2024-07-05',medio:'Bancolombia', fotos:5, promos:1},
  {id:3,nombre:'EstÃ©tica Glamour',       email:'glamour@gmail.com',    cat:'Salas de belleza',  loc:'Chapinero',     plan:'1 Mes',    val:25000,  est:'pendiente',ini:'2024-02-01',vence:'2024-03-01',medio:'Efecty',     fotos:10,promos:3},
  {id:4,nombre:'Restaurante El Sabor',   email:'sabor@yahoo.com',      cat:'Restaurantes',      loc:'UsaquÃ©n',       plan:'12 Meses', val:252000, est:'activo',   ini:'2023-12-01',vence:'2024-12-01',medio:'Daviplata',  fotos:10,promos:4},
  {id:5,nombre:'DroguerÃ­a La Salud',     email:'salud@gmail.com',      cat:'DroguerÃ­as',        loc:'Bosa',          plan:'3 Meses',  val:72000,  est:'vencido',  ini:'2023-10-01',vence:'2024-01-01',medio:'Nequi',       fotos:3, promos:0},
  {id:6,nombre:'Veterinaria Pelitos',    email:'pelitos@gmail.com',    cat:'Veterinarias',      loc:'Suba',          plan:'GRATIS',   val:0,      est:'gratis',   ini:'2024-02-10',vence:'2024-03-10',medio:'â€”',           fotos:2, promos:0},
  {id:7,nombre:'Taller RÃ¡pidoFix',       email:'rapidofix@gmail.com',  cat:'Talleres mecÃ¡nicos',loc:'FontibÃ³n',      plan:'1 Mes',    val:25000,  est:'pendiente',ini:'2024-02-14',vence:'2024-03-14',medio:'Baloto',     fotos:6, promos:1},
  {id:8,nombre:'FlorerÃ­a Las Rosas',     email:'rosas@gmail.com',      cat:'FloristerÃ­as',      loc:'Teusaquillo',   plan:'6 Meses',  val:138000, est:'activo',   ini:'2024-01-20',vence:'2024-07-20',medio:'Mercado Pago',fotos:9, promos:2},
];
const CODES = [
  {code:'DEMO30D1',dias:30,gen:'2024-01-15',uso:'Veterinaria Pelitos',est:'usado'},
  {code:'PROMO2024',dias:30,gen:'2024-02-01',uso:'â€”',est:'activo'},
  {code:'BOGO2024A',dias:30,gen:'2024-02-10',uso:'â€”',est:'activo'},
];
let data = [...SEED], codes = [...CODES], curFilter = 'todos';
const SC = {activo:'s-act',pendiente:'s-pen',vencido:'s-exp',gratis:'s-fre'};
const SL = {activo:'Activo',pendiente:'Pendiente',vencido:'Vencido',gratis:'Prueba'};

// â”€â”€ AUTH â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function doLogin(){
  const u=document.getElementById('adminUser').value.trim(), p=document.getElementById('adminPw').value;
  if(u==='admin'&&p==='admin123'){
    document.getElementById('adminErr').style.display='none';
    document.getElementById('adminLogin').style.display='none';
    document.getElementById('adminPanel').style.display='block';
    document.getElementById('tbUser').textContent=u;
    initAll();
  } else { document.getElementById('adminErr').style.display='flex'; }
}
function doLogout(){document.getElementById('adminPanel').style.display='none';document.getElementById('adminLogin').style.display='flex';}
document.getElementById('adminPw').addEventListener('keydown',e=>{if(e.key==='Enter')doLogin()});
document.getElementById('adminUser').addEventListener('keydown',e=>{if(e.key==='Enter')doLogin()});

// â”€â”€ NAV â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const TITLES={dashboard:'Dashboard',negocios:'Negocios',suscripciones:'Suscripciones y Pagos',usuarios:'Usuarios',promociones:'Promociones',codigos:'CÃ³digos Promocionales',reportes:'Reportes',config:'ConfiguraciÃ³n'};
function nav(name,el){
  document.querySelectorAll('.asec').forEach(s=>s.classList.remove('active'));
  document.querySelectorAll('.al').forEach(l=>l.classList.remove('active'));
  const s=document.getElementById('s-'+name); if(s)s.classList.add('active');
  if(el)el.classList.add('active');
  document.getElementById('tbTitle').textContent=TITLES[name]||name;
}

// â”€â”€ INIT â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function initAll(){
  loadKPIs(); drawChart(); drawDonut(); renderActivity();
  renderNegocios(); renderPendientes(); renderHistorial();
  renderUsuarios(); renderPromos(); renderCodigos(); renderVenc(); loadReportes();
}

function loadKPIs(){
  const act=data.filter(n=>n.est==='activo').length;
  const pen=data.filter(n=>n.est==='pendiente').length;
  const ing=data.filter(n=>n.est==='activo').reduce((a,n)=>a+n.val,0);
  document.getElementById('k-total').textContent=data.length;
  document.getElementById('k-act').textContent=act;
  document.getElementById('k-pen').textContent=pen;
  document.getElementById('k-ing').textContent='$'+ing.toLocaleString('es-419');
  document.getElementById('sbNegocios').textContent=data.length;
  document.getElementById('sbPendientes').textContent=pen;
  document.getElementById('penCount').textContent=pen+' pendiente'+(pen!==1?'s':'');
}

function drawChart(){
  const months=['Sep','Oct','Nov','Dic','Ene','Feb'], vals=[3,5,4,7,6,data.length];
  const mx=Math.max(...vals);
  document.getElementById('barChart').innerHTML=vals.map((v,i)=>`<div class="bar-group"><div class="bar ${i===vals.length-1?'hi':''}" style="height:${Math.round(v/mx*95)}px"></div></div>`).join('');
  document.getElementById('barLbls').innerHTML=months.map(m=>`<div style="flex:1;text-align:center;font-size:.6rem;color:var(--text-muted)">${m}</div>`).join('');
}

function drawDonut(){
  const planes={};
  data.forEach(n=>{planes[n.plan]=(planes[n.plan]||0)+1});
  const colors=['#C9A84C','#E2C97E','#8A6E2F','#2ECC71','#FFC107','#4A90E2'];
  const total=data.length||1, entries=Object.entries(planes);
  let ang=0;
  const paths=entries.map(([p,c],i)=>{
    const s=(c/total)*360,pa=descArc(45,45,38,ang,ang+s);ang+=s;
    return `<path d="${pa}" fill="${colors[i%colors.length]}"/>`;
  });
  document.getElementById('donutSvg').innerHTML=paths.join('')+`<circle cx="45" cy="45" r="24" fill="#161616"/><text x="45" y="50" text-anchor="middle" fill="#E2C97E" font-size="12" font-family="Sora,Segoe UI,sans-serif" font-weight="700">${total}</text>`;
  document.getElementById('donutLgd').innerHTML=entries.map(([p,c],i)=>`<div class="dleg-item"><div class="dleg-dot" style="background:${colors[i%colors.length]}"></div>${p} â€” ${c}</div>`).join('');
}

function descArc(cx,cy,r,a1,a2){
  const r2=a=>(a-90)*Math.PI/180;
  const x1=cx+r*Math.cos(r2(a1)),y1=cy+r*Math.sin(r2(a1));
  const x2=cx+r*Math.cos(r2(a2)),y2=cy+r*Math.sin(r2(a2));
  return `M${cx} ${cy} L${x1} ${y1} A${r} ${r} 0 ${a2-a1>180?1:0} 1 ${x2} ${y2} Z`;
}

function renderActivity(){
  const acts=[
    {ico:'',txt:'<strong>FlorerÃ­a Las Rosas</strong> publicÃ³ su negocio',t:'Hace 10 min'},
    {ico:'ðŸ’³',txt:'<strong>Taller RÃ¡pidoFix</strong> enviÃ³ soporte de pago',t:'Hace 32 min'},
    {ico:'ðŸ“£',txt:'<strong>Restaurante El Sabor</strong> creÃ³ nueva promociÃ³n',t:'Hace 1h'},
    {ico:'ðŸ†•',txt:'<strong>EstÃ©tica Glamour</strong> se registrÃ³ en la plataforma',t:'Hace 2h'},
    {ico:'âœ…',txt:'SuscripciÃ³n activada: <strong>PanaderÃ­a San JosÃ©</strong>',t:'Ayer 15:30'},
    {ico:'ðŸ””',txt:'Alerta enviada a <strong>DroguerÃ­a La Salud</strong>',t:'Ayer 08:00'},
  ];
  document.getElementById('actFeed').innerHTML=`<div class="act-feed">${acts.map(a=>`<div class="act-item"><div class="ai-ico">${a.ico}</div><div><div class="ai-txt">${a.txt}</div><div class="ai-time">${a.t}</div></div></div>`).join('')}</div>`;
}

// â”€â”€ NEGOCIOS TABLE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function setFilter(f,el){
  curFilter=f;
  document.querySelectorAll('.ftab').forEach(t=>t.classList.remove('active'));
  if(el)el.classList.add('active');
  renderNegocios();
}

function renderNegocios(){
  const q=(document.getElementById('qNegocios')?.value||'').toLowerCase();
  let rows=data;
  if(curFilter!=='todos') rows=rows.filter(n=>n.est===curFilter);
  if(q) rows=rows.filter(n=>n.nombre.toLowerCase().includes(q)||n.loc.toLowerCase().includes(q)||n.cat.toLowerCase().includes(q)||n.email.toLowerCase().includes(q));
  const em=document.getElementById('emNegocios'), tb=document.getElementById('bNegocios');
  if(!rows.length){tb.innerHTML='';em.style.display='block';return;}
  em.style.display='none';
  tb.innerHTML=rows.map(n=>`<tr>
    <td><div class="tn">${n.nombre}</div><div class="tm">${n.email}</div></td>
    <td class="tm">${n.cat}</td>
    <td class="tm">${n.loc}</td>
    <td class="tmo">${n.plan}</td>
    <td><span class="badge ${SC[n.est]}" style="font-size:.63rem">${SL[n.est]}</span></td>
    <td class="tm">${fd(n.vence)}</td>
    <td><div class="tact">
      <button class="ab" onclick="openDetail(${n.id})">Ver</button>
      ${n.est==='pendiente'?`<button class="ab suc" onclick="aprobar(${n.id})">âœ“ Aprobar</button>`:''}
      ${n.est==='activo'?`<button class="ab" onclick="alertar(${n.id})">ðŸ””</button>`:''}
      <button class="ab dan" onclick="borrar(${n.id})">âœ•</button>
    </div></td>
  </tr>`).join('');
}

// â”€â”€ SUSCRIPCIONES â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function renderPendientes(){
  const pen=data.filter(n=>n.est==='pendiente');
  const em=document.getElementById('emPend'),tb=document.getElementById('bPendientes');
  if(!pen.length){tb.innerHTML='';em.style.display='block';return;}
  em.style.display='none';
  tb.innerHTML=pen.map(n=>`<tr>
    <td><div class="tn">${n.nombre}</div><div class="tm">${n.email}</div></td>
    <td class="tmo">${n.plan}</td>
    <td style="font-weight:600;color:var(--gold-light)">$${n.val.toLocaleString('es-419')}</td>
    <td class="tm">${n.medio}</td>
    <td class="tm">${fd(n.ini)}</td>
    <td><div class="tact">
      <button class="ab suc" onclick="aprobar(${n.id})">âœ“ Aprobar</button>
      <button class="ab dan" onclick="rechazar(${n.id})">âœ• Rechazar</button>
    </div></td>
  </tr>`).join('');
}

function renderHistorial(){
  const act=data.filter(n=>n.est==='activo');
  document.getElementById('bHistorial').innerHTML=act.map(n=>`<tr>
    <td class="tn">${n.nombre}</td><td class="tmo">${n.plan}</td>
    <td style="color:var(--gold-light)">$${n.val.toLocaleString('es-419')}</td>
    <td class="tm">${fd(n.ini)}</td><td class="tm">${fd(n.vence)}</td>
    <td><span class="badge s-act" style="font-size:.63rem">Activo</span></td>
  </tr>`).join('');
}

function aprobar(id){
  const n=data.find(x=>x.id===id); if(!n) return;
  n.est='activo';
  showToast(`âœ… ${n.nombre} activada correctamente.`,'success',4000);
  loadKPIs(); renderNegocios(); renderPendientes(); renderHistorial();
}
function rechazar(id){
  const n=data.find(x=>x.id===id); if(!n||!confirm(`Â¿Rechazar pago de ${n.nombre}?`)) return;
  showToast(`Pago de ${n.nombre} rechazado.`,'error',4000);
}
function borrar(id){
  if(!confirm('Â¿Eliminar permanentemente este negocio?')) return;
  data=data.filter(x=>x.id!==id);
  showToast('Negocio eliminado.','info');
  loadKPIs(); renderNegocios(); renderPendientes(); renderHistorial();
}
function alertar(id){
  const n=data.find(x=>x.id===id); if(!n) return;
  showToast(`ðŸ”” Alerta enviada a ${n.nombre} (${n.email})`,'success',4000);
}

// â”€â”€ DETAIL PANEL â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function openDetail(id){
  const n=data.find(x=>x.id===id); if(!n) return;
  const slug=slugify(n.nombre), link=`negocio.html?empresa=${slug}`;
  document.getElementById('detailPanel').innerHTML=`
    <div class="dp-hd"><h3>${n.nombre}</h3><button class="dp-cl" onclick="closeDetail()">âœ•</button></div>
    <span class="badge ${SC[n.est]}" style="font-size:.68rem">${SL[n.est]}</span>
    <div class="dp-div"></div>
    <div class="dp-grid">
      <div class="dp-field"><div class="dp-key">CategorÃ­a</div><div class="dp-val">${n.cat}</div></div>
      <div class="dp-field"><div class="dp-key">Localidad</div><div class="dp-val">${n.loc}</div></div>
      <div class="dp-field"><div class="dp-key">Correo</div><div class="dp-val" style="word-break:break-all">${n.email}</div></div>
      <div class="dp-field"><div class="dp-key">Plan</div><div class="dp-val">${n.plan}</div></div>
      <div class="dp-field"><div class="dp-key">ActivaciÃ³n</div><div class="dp-val">${fd(n.ini)}</div></div>
      <div class="dp-field"><div class="dp-key">Vencimiento</div><div class="dp-val">${fd(n.vence)}</div></div>
      <div class="dp-field"><div class="dp-key">Valor</div><div class="dp-val">${n.val?'$'+n.val.toLocaleString('es-419'):'â€”'}</div></div>
      <div class="dp-field"><div class="dp-key">Medio de pago</div><div class="dp-val">${n.medio||'â€”'}</div></div>
      <div class="dp-field"><div class="dp-key">ImÃ¡genes</div><div class="dp-val">${n.fotos} / 10</div></div>
      <div class="dp-field"><div class="dp-key">Promociones</div><div class="dp-val">${n.promos} / 4</div></div>
    </div>
    <div class="dp-div"></div>
    <div class="dp-field">
      <div class="dp-key">Enlace pÃºblico del negocio</div>
      <div style="background:var(--dark-3);border:1px solid rgba(201,168,76,.25);border-radius:9px;padding:11px 14px;margin-top:6px;display:flex;align-items:center;gap:8px">
        <span style="flex:1;font-family:var(--font-main);font-size:.7rem;color:var(--gold);word-break:break-all;line-height:1.5">${link}</span>
        <button onclick="navigator.clipboard.writeText('${link}').then(()=>showToast('Copiado âœ“','success'))" style="background:none;border:1px solid var(--border);border-radius:6px;color:var(--gold);cursor:pointer;padding:5px 10px;font-size:.7rem;font-weight:600;transition:background .15s;white-space:nowrap" onmouseover="this.style.background='rgba(201,168,76,.1)'" onmouseout="this.style.background='none'">Copiar</button>
      </div>
    </div>
    <div class="dp-div"></div>
    <div class="dp-acts">
      ${n.est==='pendiente'?`<button class="btn btn-gold btn-sm" onclick="aprobar(${n.id});closeDetail()">âœ“ Aprobar pago y activar</button>`:''}
      <button class="btn btn-outline btn-sm" onclick="alertar(${n.id})">ðŸ”” Enviar alerta de vencimiento</button>
      <a href="${link}" target="_blank" class="btn btn-outline btn-sm"> Ver pÃ¡gina pÃºblica</a>
      <button class="btn btn-danger btn-sm" onclick="if(confirm('Â¿Eliminar?')){borrar(${n.id});closeDetail()}">Eliminar negocio</button>
    </div>`;
  document.getElementById('detailModal').classList.add('open');
}
function closeDetail(){document.getElementById('detailModal').classList.remove('open');}
document.getElementById('detailModal').addEventListener('click',function(e){if(e.target===this)closeDetail();});

// â”€â”€ USUARIOS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function renderUsuarios(){
  const q=(document.getElementById('qUsuarios')?.value||'').toLowerCase();
  const rows=data.filter(n=>!q||n.email.toLowerCase().includes(q)||n.nombre.toLowerCase().includes(q));
  document.getElementById('bUsuarios').innerHTML=rows.map(n=>`<tr>
    <td><div class="tn">${n.email}</div></td>
    <td>${n.nombre}</td>
    <td class="tm">${fd(n.ini)}</td>
    <td><span class="badge ${SC[n.est]}" style="font-size:.63rem">${SL[n.est]}</span></td>
    <td><div class="tact">
      <button class="ab" onclick="openDetail(${n.id})">Ver negocio</button>
      <button class="ab dan" onclick="showToast('Acceso suspendido temporalmente.','info')">Suspender</button>
    </div></td>
  </tr>`).join('');
}

// â”€â”€ PROMOCIONES ADMIN â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function renderPromos(){
  const promos=[];
  data.forEach(n=>{for(let i=0;i<n.promos;i++)promos.push({neg:n.nombre,titulo:`PromociÃ³n ${i+1}`,fecha:fd(n.ini),id:n.id});});
  const em=document.getElementById('emPromos'),tb=document.getElementById('bPromos');
  if(!promos.length){tb.innerHTML='';em.style.display='block';return;}
  em.style.display='none';
  tb.innerHTML=promos.map(p=>`<tr>
    <td class="tn">${p.neg}</td><td>${p.titulo}</td><td class="tm">${p.fecha}</td>
    <td><span class="badge badge-green" style="font-size:.63rem">Publicada</span></td>
    <td><button class="ab dan" onclick="showToast('PromociÃ³n despublicada.','info')">Despublicar</button></td>
  </tr>`).join('');
}

// â”€â”€ CÃ“DIGOS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function renderCodigos(){
  document.getElementById('bCodigos').innerHTML=codes.map((c,i)=>`<tr>
    <td class="tmo">${c.code}</td><td>${c.dias} dÃ­as</td><td class="tm">${c.gen}</td>
    <td class="tm">${c.uso}</td>
    <td><span class="badge ${c.est==='usado'?'badge-muted':'badge-green'}" style="font-size:.63rem">${c.est==='usado'?'Usado':'Disponible'}</span></td>
    <td><div class="tact">
      ${c.est!=='usado'?`<button class="ab pri" onclick="copyCodigo('${c.code}')">Copiar</button>`:''}
      <button class="ab dan" onclick="codes.splice(${i},1);renderCodigos();showToast('Eliminado.','info')">âœ•</button>
    </div></td>
  </tr>`).join('');
}

function genCodigo(){
  const ch='ABCDEFGHJKLMNPRSTUVWXYZ23456789';
  const code=Array.from({length:8},()=>ch[Math.floor(Math.random()*ch.length)]).join('');
  codes.unshift({code,dias:30,gen:new Date().toISOString().split('T')[0],uso:'â€”',est:'activo'});
  renderCodigos();
  copyCodigo(code);
  showToast(`CÃ³digo generado: ${code}  âœ“ copiado`,'success',5000);
}

function copyCodigo(code){
  navigator.clipboard.writeText(code).catch(()=>{});
}

// â”€â”€ REPORTES â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function loadReportes(){
  const ing=data.filter(n=>n.est==='activo').reduce((a,n)=>a+n.val,0);
  const grat=data.filter(n=>n.est==='gratis').length;
  const conv=data.length?Math.round((1-grat/data.length)*100):0;
  const vp=data.filter(n=>du(n.vence)<=5&&du(n.vence)>=0).length;
  if(document.getElementById('r-ing')){
    document.getElementById('r-ing').textContent='$'+ing.toLocaleString('es-419');
    document.getElementById('r-proy').textContent='$'+Math.round(ing*1.15).toLocaleString('es-419');
    document.getElementById('r-conv').textContent=conv+'%';
    document.getElementById('r-venc').textContent=vp;
  }
}

function renderVenc(){
  const rows=data.filter(n=>n.est==='activo').map(n=>({...n,d:du(n.vence)})).filter(n=>n.d<=30).sort((a,b)=>a.d-b.d);
  document.getElementById('bVenc').innerHTML=rows.length
    ?rows.map(n=>`<tr>
        <td class="tn">${n.nombre}</td><td class="tmo">${n.plan}</td>
        <td class="tm">${fd(n.vence)}</td>
        <td><span style="color:${n.d<=5?'#E55':n.d<=10?'#FFC107':'#2ECC71'};font-weight:700">${n.d} dÃ­as</span></td>
        <td><button class="ab suc" onclick="alertar(${n.id})">ðŸ”” Alertar</button></td>
      </tr>`).join('')
    :'<tr><td colspan="5" style="text-align:center;color:var(--text-muted);padding:28px">Sin vencimientos prÃ³ximos.</td></tr>';
}

// â”€â”€ HELPERS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function fd(d){if(!d)return'â€”';const[y,m,day]=d.split('-');return`${day}/${m}/${y}`;}
function du(d){const diff=new Date(d)-new Date();return Math.ceil(diff/(1000*60*60*24));}
function slugify(s){return(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9\s-]/g,'').trim().replace(/\s+/g,'-').replace(/-+/g,'-');}
function exportCSV(){
  const h='Nombre,Email,CategorÃ­a,Localidad,Plan,Estado,Vence,Valor\n';
  const r=data.map(n=>`"${n.nombre}","${n.email}","${n.cat}","${n.loc}","${n.plan}","${n.est}","${n.vence}","${n.val}"`).join('\n');
  const b=new Blob([h+r],{type:'text/csv;charset=utf-8;'});
  const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download='negocios.csv';a.click();
  showToast('CSV exportado âœ“','success');
}
