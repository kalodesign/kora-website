import { renderTable } from './ui/table.js';
import { attachTabs } from './ui/tabs.js';
import { showToast } from './ui/toast.js';
import { getOrdersPage, PAGE_SIZE } from './api/orders.js';
import { getSupabase } from './supabase.js';
const CONFIG = Object.freeze({ locale: window.KORA_CONFIG?.locale || 'es-CO', currency: window.KORA_CONFIG?.currency || 'COP' });
const iconPaths = {
  box:'<path d="m12 3 9 5-9 5-9-5 9-5Z"/><path d="M3 8v9l9 5 9-5V8M12 13v9"/>',
  search:'<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
  home:'<path d="m3 10 9-7 9 7v10H3V10Z"/><path d="M9 20v-6h6v6"/>',
  shop:'<path d="M4 9h16l-1 12H5L4 9ZM3 9l2-6h14l2 6M9 9v3m6-3v3"/>',
  list:'<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
  users:'<circle cx="9" cy="7" r="3"/><path d="M3 20v-2a6 6 0 0 1 12 0v2M16 4a3 3 0 0 1 0 6m2 4a5 5 0 0 1 3 5v1"/>',
  settings:'<circle cx="12" cy="12" r="3"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l2 2m10 10 2 2M19 5l-2 2M7 17l-2 2"/>',
  chart:'<path d="M4 20V4m0 16h16M8 16l4-5 3 2 5-7"/>',
  inbox:'<path d="M3 4h18v16H3V4Zm0 10h5l2 3h4l2-3h5"/>',
  tag:'<path d="M3 4h9l9 9-8 8-10-10V4Z"/><circle cx="8" cy="8" r="1"/>',
  help:'<circle cx="12" cy="12" r="10"/><path d="M9.5 9a2.5 2.5 0 1 1 4 2l-1.5 1.5V14M12 18h.01"/>',
  plus:'<path d="M12 5v14M5 12h14"/>',more:'<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
  down:'<path d="m6 9 6 6 6-6"/>',menu:'<path d="M4 6h16M4 12h16M4 18h16"/>',filter:'<path d="M4 6h16M7 12h10M10 18h4"/>',
  calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4m10-4v4M3 10h18"/>',chevron:'<path d="m9 18 6-6-6-6"/>'
};
const icon = (name) => `<svg viewBox="0 0 24 24" aria-hidden="true">${iconPaths[name] || iconPaths.box}</svg>`;
const app = document.getElementById('app');
const authClient = getSupabase();
const { data: { session } } = await authClient.auth.getSession();
if (!session) {
  app.innerHTML = `<main class="ds-container ds-auth"><form class="ds-card ds-stack" id="admin-login"><h1 class="ds-h2">Iniciar sesión</h1><p class="ds-text-muted">Acceso privado para el equipo Kora.</p><label class="ds-field"><span class="ds-label">Correo</span><input class="ds-input" type="email" name="email" autocomplete="username" required></label><label class="ds-field"><span class="ds-label">Contraseña</span><input class="ds-input" type="password" name="password" autocomplete="current-password" required></label><button class="ds-btn ds-btn--primary ds-btn--block" type="submit">Entrar</button><p id="login-message" class="ds-error" role="alert"></p></form></main>`;
  document.querySelector('#admin-login').addEventListener('submit', async event => { event.preventDefault(); const form=event.currentTarget, button=form.querySelector('button'), message=document.querySelector('#login-message'); button.disabled=true; message.textContent='Validando acceso…'; try { const {error}=await authClient.auth.signInWithPassword({email:form.email.value.trim(),password:form.password.value}); if(error)throw error; location.reload(); } catch(error) { message.textContent=error.message || 'No fue posible iniciar sesión.'; button.disabled=false; } });
} else {
app.innerHTML = `<div class="ds-app">
  <div class="ds-overlay" id="overlay"></div>
  <aside class="ds-sidebar" id="sidebar" aria-label="Navegación de administración">
    <div class="brand"><span class="brand-mark">${icon('box')}</span>Kora Admin</div>
    <button class="ds-btn ds-btn--secondary side-search" type="button" id="global-search">${icon('search')} Buscar <kbd>⌘ K</kbd></button>
    <nav aria-label="Secciones">
      <p class="ds-nav__label">Menú principal</p>
      <button class="ds-nav__item" type="button" data-preview="Inicio">${icon('home')} Inicio</button>
      <button class="ds-nav__item" type="button" id="store-toggle" aria-expanded="true" aria-controls="store-nav">${icon('shop')} Mi tienda <span class="chevron">${icon('down')}</span></button>
      <div id="store-nav">
        <button class="ds-nav__item" type="button" data-preview="Productos">Productos</button>
        <button class="ds-nav__item" type="button" aria-current="page">Pedidos</button>
        <button class="ds-nav__item" type="button" data-preview="Clientes">Clientes</button>
      </div>
      <button class="ds-nav__item" type="button" data-preview="Gestión de tienda">${icon('settings')} Gestión de tienda</button>
      <button class="ds-nav__item" type="button" data-preview="Reportes">${icon('chart')} Reportes</button>
      <button class="ds-nav__item" type="button" data-preview="Bandeja">${icon('inbox')} Bandeja</button>
      <p class="ds-nav__label">Otros</p>
      <button class="ds-nav__item" type="button" data-preview="Promociones">${icon('tag')} Promociones</button>
      <button class="ds-nav__item" type="button" data-preview="Configuración">${icon('settings')} Configuración</button>
      <button class="ds-nav__item" type="button" data-preview="Ayuda">${icon('help')} Ayuda</button>
    </nav>
    <div class="ds-sidebar__footer"><button class="profile" type="button" id="user-menu"><span class="ds-avatar">K</span><span class="profile-copy"><strong>Equipo Kora</strong><small>Vista de diseño</small></span><span class="chevron">${icon('down')}</span></button></div>
  </aside>
  <main class="ds-main" id="main">
    <div class="mobile-topbar"><strong>Kora Admin</strong><button type="button" class="ds-btn ds-btn--ghost ds-btn--icon" id="open-menu" aria-label="Abrir menú">${icon('menu')}</button></div>
    <div class="ds-breadcrumb"><ol><li>Inicio</li><li aria-current="page">Pedidos</li></ol></div>
    <header class="ds-page-header"><div><h1 class="ds-h1">Lista de pedidos</h1><p>Gestiona los pedidos de impresión 3D de tu tienda.</p></div><div class="head-actions"><button type="button" class="ds-btn ds-btn--primary" data-preview="Nuevo pedido">${icon('plus')} Nuevo pedido</button><button type="button" class="ds-btn ds-btn--secondary" data-preview="Más acciones">Más acciones ${icon('more')}</button></div></header>
    <p class="ds-alert ds-alert--warning preview-note">Vista previa · datos de ejemplo · sin conexión a pedidos reales</p>
    <section class="ds-stats" aria-label="Indicadores de ejemplo">
      <div class="ds-stat"><span class="ds-stat__label">Pedidos totales</span><div class="ds-stat__value">1.248 <span class="ds-trend" aria-hidden="true"></span></div><small class="ds-stat__help">Últimos 365 días</small></div>
      <div class="ds-stat"><span class="ds-stat__label">Pedidos nuevos</span><div class="ds-stat__value">126 <span class="ds-trend" aria-hidden="true"></span></div><small class="ds-stat__help">Últimos 365 días</small></div>
      <div class="ds-stat"><span class="ds-stat__label">Completados</span><div class="ds-stat__value">982 <span class="ds-trend" aria-hidden="true"></span></div><small class="ds-stat__help">Últimos 365 días</small></div>
      <div class="ds-stat"><span class="ds-stat__label">Cancelados</span><div class="ds-stat__value">19 <span class="ds-trend" aria-hidden="true"></span></div><small class="ds-stat__help">Últimos 365 días</small></div>
    </section>
    <section class="ds-card ds-card--flush" aria-label="Pedidos de ejemplo">
      <div class="ds-tabs" role="tablist" aria-label="Estado del pedido">
        <button class="ds-tab" role="tab" aria-selected="true" tabindex="0" data-status="all">Todos <span class="ds-count" data-count="all">—</span></button>
        <button class="ds-tab" role="tab" aria-selected="false" tabindex="-1" data-status="new">Nuevos <span class="ds-count" data-count="new">—</span></button>
        <button class="ds-tab" role="tab" aria-selected="false" tabindex="-1" data-status="printing">En producción <span class="ds-count" data-count="printing">—</span></button>
        <button class="ds-tab" role="tab" aria-selected="false" tabindex="-1" data-status="delivered">Completados <span class="ds-count" data-count="delivered">—</span></button>
        <button class="ds-tab" role="tab" aria-selected="false" tabindex="-1" data-status="cancelled">Cancelados <span class="ds-count" data-count="cancelled">—</span></button>
      </div>
      <div class="ds-toolbar"><label class="ds-input-wrap ds-toolbar__grow">${icon('search')}<input class="ds-input" id="order-search" type="search" placeholder="Cliente, producto o número" aria-label="Buscar por cliente, producto o número de pedido"></label><label class="ds-sr-only" for="order-status">Estado del pedido</label><select class="ds-select" id="order-status"><option value="">Todos los estados</option><option value="pending">Pendiente</option><option value="in_progress">En producción</option><option value="ready">Listo</option><option value="shipped">Enviado</option><option value="delivered">Entregado</option><option value="cancelled">Cancelado</option></select><label class="ds-field"><span class="ds-sr-only">Desde</span><input class="ds-input" id="order-from" type="date" aria-label="Fecha desde"></label><label class="ds-field"><span class="ds-sr-only">Hasta</span><input class="ds-input" id="order-to" type="date" aria-label="Fecha hasta"></label></div><div class="ds-card__body" id="orders-feedback" aria-live="polite" hidden></div>
      <div class="ds-table-wrap"><table class="ds-table ds-table--cards orders-table"><thead><tr><th>Producto</th><th>Cliente</th><th>ID pedido</th><th>Monto</th><th>Estado</th><th>Acción</th></tr></thead><tbody id="order-rows"></tbody></table></div>
      
      <nav class="ds-pagination" id="orders-pagination" aria-label="Páginas de pedidos"><button class="ds-btn ds-btn--secondary" id="orders-prev" type="button">← Anterior</button><div class="ds-pages" id="orders-pages" aria-live="polite"></div><button class="ds-btn ds-btn--secondary" id="orders-next" type="button">Siguiente →</button></nav>
    </section>
  </main>
  <div class="ds-toasts"><div id="toast" role="status" aria-live="polite" hidden></div></div>
</div>`;
const params=new URLSearchParams(location.search);
const allowedTabs=['all','new','printing','delivered','cancelled'];const requestedTab=params.get('tab');const filters={page:Math.max(1,Number(params.get('page'))||1),tab:allowedTabs.includes(requestedTab)?requestedTab:'all',q:params.get('q')||'',status:params.get('status')||'',from:params.get('from')||'',to:params.get('to')||''};
const searchInput=document.getElementById('order-search'),statusInput=document.getElementById('order-status'),fromInput=document.getElementById('order-from'),toInput=document.getElementById('order-to');
searchInput.value=filters.q;statusInput.value=filters.status;fromInput.value=filters.from;toInput.value=filters.to;
const feedback=document.getElementById('orders-feedback'),tbody=document.getElementById('order-rows');let lastPayload={orders:[],count:0,page:1,pageSize:PAGE_SIZE};
function syncUrl(){const next=new URLSearchParams();for(const key of ['tab','q','status','from','to'])if(filters[key]&&!(key==='tab'&&filters[key]==='all'))next.set(key,filters[key]);if(filters.page>1)next.set('page',String(filters.page));history.replaceState(null,'',location.pathname+(next.size?'?'+next:''));}
function pagination(payload){const pages=document.getElementById('orders-pages'),total=Math.max(1,Math.ceil(payload.count/PAGE_SIZE));pages.replaceChildren();const button=(number,label=String(number))=>{const el=document.createElement('button');el.type='button';el.className='ds-page';el.textContent=label;if(number===filters.page)el.setAttribute('aria-current','page');el.addEventListener('click',()=>{filters.page=number;loadOrders()});pages.append(el)};if(filters.page>1)button(Math.max(1,filters.page-1),'…');button(1);if(total>1&&filters.page!==1&&filters.page!==total)button(filters.page);if(total>1)button(total);document.getElementById('orders-prev').disabled=filters.page<=1;document.getElementById('orders-next').disabled=filters.page>=total;}
async function loadOrders(){document.querySelectorAll('.ds-tab').forEach(tab=>{const selected=tab.dataset.status===filters.tab;tab.setAttribute('aria-selected',String(selected));tab.tabIndex=selected?0:-1});syncUrl();feedback.hidden=true;tbody.replaceChildren();const tr=document.createElement('tr'),td=document.createElement('td');td.colSpan=6;td.textContent='Cargando pedidos…';tr.append(td);tbody.append(tr);try{lastPayload=await getOrdersPage(filters);renderTable(lastPayload.orders,CONFIG,message=>showToast(message));pagination(lastPayload);for(const tab of ['all','new','printing','delivered','cancelled']){const el=document.querySelector('[data-count="'+tab+'"]');if(el)el.textContent=tab===filters.tab?String(lastPayload.count):'—';}if(!lastPayload.orders.length){feedback.hidden=false;feedback.textContent='Sin pedidos con estos filtros. Ajusta la búsqueda o limpia los filtros.';const clear=document.createElement('button');clear.type='button';clear.className='ds-btn ds-btn--secondary';clear.textContent='Limpiar filtros';clear.addEventListener('click',()=>{Object.assign(filters,{page:1,tab:'all',q:'',status:'',from:'',to:''});searchInput.value='';statusInput.value='';fromInput.value='';toInput.value='';loadOrders()});feedback.append(' ',clear);}}catch(error){feedback.hidden=false;feedback.replaceChildren();const message=document.createElement('p');message.textContent=error.message||'No se pudieron cargar los pedidos.';const retry=document.createElement('button');retry.type='button';retry.className='ds-btn ds-btn--secondary';retry.textContent='Reintentar';retry.addEventListener('click',loadOrders);feedback.append(message,retry);}}
document.querySelectorAll('.ds-tab').forEach(tab=>{const selected=tab.dataset.status===filters.tab;tab.setAttribute('aria-selected',String(selected));tab.tabIndex=selected?0:-1});
attachTabs(document.querySelector('.ds-tabs'),status=>{filters.tab=status;filters.page=1;loadOrders()});
let searchTimer;searchInput.addEventListener('input',()=>{clearTimeout(searchTimer);searchTimer=setTimeout(()=>{filters.q=searchInput.value.trim();filters.page=1;loadOrders()},300)});
for(const [input,key] of [[statusInput,'status'],[fromInput,'from'],[toInput,'to']])input.addEventListener('change',()=>{filters[key]=input.value;filters.page=1;loadOrders()});
document.getElementById('orders-prev').addEventListener('click',()=>{if(filters.page>1){filters.page--;loadOrders()}});document.getElementById('orders-next').addEventListener('click',()=>{filters.page++;loadOrders()});
document.getElementById('global-search').addEventListener('click',()=>searchInput.focus());document.addEventListener('keydown',e=>{if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='k'){e.preventDefault();searchInput.focus()}if(e.key==='Escape')closeMenu()});
const sidebar=document.getElementById('sidebar'),overlay=document.getElementById('overlay');function closeMenu(){sidebar.classList.remove('is-open');overlay.classList.remove('is-open')};document.getElementById('open-menu').addEventListener('click',()=>{sidebar.classList.add('is-open');overlay.classList.add('is-open')});overlay.addEventListener('click',closeMenu);
document.getElementById('store-toggle').addEventListener('click',e=>{const open=e.currentTarget.getAttribute('aria-expanded')==='true';e.currentTarget.setAttribute('aria-expanded',String(!open));document.getElementById('store-nav').hidden=open});
loadOrders();
}
