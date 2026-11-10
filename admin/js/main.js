import { renderTable } from './ui/table.js';
import { attachTabs } from './ui/tabs.js';
import { showToast } from './ui/toast.js';
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
      <div class="ds-stat"><span class="ds-stat__label">Pedidos totales</span><div class="ds-stat__value">1.248 <span class="ds-trend">—</span></div><small class="ds-stat__help">Últimos 365 días</small></div>
      <div class="ds-stat"><span class="ds-stat__label">Pedidos nuevos</span><div class="ds-stat__value">126 <span class="ds-trend">—</span></div><small class="ds-stat__help">Últimos 365 días</small></div>
      <div class="ds-stat"><span class="ds-stat__label">Completados</span><div class="ds-stat__value">982 <span class="ds-trend">—</span></div><small class="ds-stat__help">Últimos 365 días</small></div>
      <div class="ds-stat"><span class="ds-stat__label">Cancelados</span><div class="ds-stat__value">19 <span class="ds-trend">—</span></div><small class="ds-stat__help">Últimos 365 días</small></div>
    </section>
    <section class="ds-card ds-card--flush" aria-label="Pedidos de ejemplo">
      <div class="ds-tabs" role="tablist" aria-label="Estado del pedido">
        <button class="ds-tab" role="tab" aria-selected="true" tabindex="0" data-status="all">Todos <span class="ds-count">10</span></button>
        <button class="ds-tab" role="tab" aria-selected="false" tabindex="-1" data-status="new">Nuevos <span class="ds-count">2</span></button>
        <button class="ds-tab" role="tab" aria-selected="false" tabindex="-1" data-status="printing">En producción <span class="ds-count">4</span></button>
        <button class="ds-tab" role="tab" aria-selected="false" tabindex="-1" data-status="delivered">Completados <span class="ds-count">3</span></button>
        <button class="ds-tab" role="tab" aria-selected="false" tabindex="-1" data-status="cancelled">Cancelados <span class="ds-count">1</span></button>
      </div>
      <div class="ds-toolbar"><label class="ds-input-wrap ds-toolbar__grow">${icon('search')}<input class="ds-input" type="search" placeholder="Cliente, producto o ID" aria-label="Buscar pedidos de ejemplo"></label><div class="toolbar-actions"><button type="button" class="ds-btn ds-btn--secondary" data-preview="Estado">${icon('list')} Todos los estados ${icon('down')}</button><button type="button" class="ds-btn ds-btn--secondary" data-preview="Fechas">${icon('calendar')} Rango de fechas ${icon('down')}</button><button type="button" class="ds-btn ds-btn--secondary" data-preview="Más filtros">${icon('filter')} Más filtros</button></div></div>
      <div class="ds-table-wrap"><table class="ds-table ds-table--cards orders-table"><thead><tr><th>Producto</th><th>Cliente</th><th>ID pedido</th><th>Monto</th><th>Estado</th><th>Acción</th></tr></thead><tbody id="order-rows"></tbody></table></div>
      <div class="mobile-orders" id="mobile-orders"></div>
      <nav class="ds-pagination" aria-label="Páginas de ejemplo"><button class="ds-btn ds-btn--secondary" type="button" data-preview="Anterior">← Anterior</button><div class="ds-pages"><button class="ds-page" aria-current="page" type="button">1</button><button class="ds-page" type="button" data-preview="Página 2">2</button><span>…</span><button class="ds-page" type="button" data-preview="Página 10">10</button></div><button class="ds-btn ds-btn--secondary" type="button" data-preview="Siguiente">Siguiente →</button></nav>
    </section>
  </main>
  <div class="ds-toasts"><div id="toast" role="status" aria-live="polite" hidden></div></div>
</div>`;
const orders = [
  ['Bola de Navidad personalizada','PLA · Rosado · 0,2 mm','Valentina Gómez','Nuevo','#00001234','2026-11-09',29000,'Transferencia','queued'],
  ['Llavero de mascota Bonnie','PLA · Negro · 0,2 mm','Carlos Muñoz','Recurrente','#00001233','2026-11-09',45000,'Wompi','printing'],
  ['Micrófono con logo 3D','PLA · Beige · 0,2 mm','Mariana Ríos','Nuevo','#00001232','2026-11-08',65000,'Transferencia','pending_payment'],
  ['Clicker 3D personalizado','PLA · Amarillo · 0,2 mm','Julián Torres','Recurrente','#00001231','2026-11-08',18500,'Wompi','post_processing'],
  ['Porta labial de cadena','PLA · Vinotinto · 0,2 mm','Natalia Cárdenas','Nuevo','#00001230','2026-11-07',24000,'Nequi','delivered'],
  ['Kit de dijes Kora','PLA · Lila · 0,2 mm','Andrés Medina','Recurrente','#00001229','2026-11-07',72000,'Transferencia','shipped'],
  ['Galletas clicleables x12','PLA · Café · 0,2 mm','Paola Herrera','Nuevo','#00001228','2026-11-06',162000,'Wompi','delivered'],
  ['Llavero con nombre','PLA · Blanco · 0,2 mm','Sofía Pardo','Recurrente','#00001227','2026-11-05',28000,'Transferencia','printing'],
  ['Exhibidor QR para tienda','PLA · Verde · 0,2 mm','Juan Ospina','Nuevo','#00001226','2026-11-04',85000,'Nequi','cancelled'],
  ['Dije perro globo','PLA · Azul · 0,2 mm','Laura Perdomo','Nuevo','#00001225','2026-11-03',18000,'Wompi','delivered']
].map(([product,detail,customer,type,reference,created,total,payment,status])=>({product,detail,customer,type,reference,created,total,payment,status}));
renderTable(orders, CONFIG, message => showToast(message));
attachTabs(document.querySelector('.ds-tabs'), (status) => {
 const match = {all:orders,new:orders.filter(o=>['queued','pending_payment'].includes(o.status)),printing:orders.filter(o=>['printing','post_processing','shipped'].includes(o.status)),delivered:orders.filter(o=>o.status==='delivered'),cancelled:orders.filter(o=>o.status==='cancelled')};
 renderTable(match[status] || orders,CONFIG,message=>showToast(message));
});
const sidebar=document.getElementById('sidebar'),overlay=document.getElementById('overlay');
function closeMenu(){sidebar.classList.remove('is-open');overlay.classList.remove('is-open')}
document.getElementById('open-menu').addEventListener('click',()=>{sidebar.classList.add('is-open');overlay.classList.add('is-open')});
overlay.addEventListener('click',closeMenu);
document.getElementById('store-toggle').addEventListener('click',e=>{const open=e.currentTarget.getAttribute('aria-expanded')==='true';e.currentTarget.setAttribute('aria-expanded',String(!open));document.getElementById('store-nav').hidden=open});
document.querySelectorAll('[data-preview]').forEach(button=>button.addEventListener('click',()=>showToast('Disponible en la siguiente fase: '+button.dataset.preview)));
document.getElementById('global-search').addEventListener('click',()=>document.querySelector('.ds-input-wrap input').focus());
document.addEventListener('keydown',e=>{if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='k'){e.preventDefault();document.querySelector('.ds-input-wrap input').focus()}if(e.key==='Escape')closeMenu()});
document.querySelector('.ds-input-wrap input').addEventListener('input',e=>{const q=e.target.value.trim().toLocaleLowerCase(CONFIG.locale);renderTable(orders.filter(o=>[o.product,o.customer,o.reference].some(v=>v.toLocaleLowerCase(CONFIG.locale).includes(q))),CONFIG,message=>showToast(message))});
