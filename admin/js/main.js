import { renderTable } from './ui/table.js?v=20261110-startupfix';
import { attachTabs } from './ui/tabs.js?v=20261110-startupfix';
import { showToast } from './ui/toast.js?v=20261110-startupfix';
import { getOrdersPage, getOrderMetrics, getOrderDetail, updateOrderStatus, PAGE_SIZE } from './api/orders.js?v=20261110-startupfix';
import { openOrderDrawer } from './ui/drawer.js?v=20261110-startupfix';
import { getSupabase } from './supabase.js?v=20261110-startupfix';
import { mountStoreContent } from './ui/store-content.js?v=20261110-store-content';
const CONFIG = Object.freeze({ locale: window.KORA_CONFIG?.locale || 'es-CO', currency: window.KORA_CONFIG?.currency || 'COP' });
const iconPaths = {download:'<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/><path d="M12 15V3"/>',
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
if (app) {
  delete app.dataset.boot;
  app.setAttribute('aria-busy', 'true');
  app.replaceChildren();
  const shell = document.createElement('main'); shell.className = 'ds-container ds-auth';
  const card = document.createElement('section'); card.className = 'ds-card ds-stack';
  const title = document.createElement('h1'); title.className = 'ds-h2'; title.textContent = 'Conectando con Kora';
  const detail = document.createElement('p'); detail.className = 'ds-text-muted'; detail.textContent = 'Validando el acceso seguro…';
  card.append(title, detail); shell.append(card); app.append(shell);
}
let authClient = null;
let session = null;
let startupError = null;
try {
  authClient = getSupabase();
  let timeoutId;
  const authResult = await Promise.race([
    authClient.auth.getSession(),
    new Promise((_, reject) => { timeoutId = window.setTimeout(() => reject(new Error('La validación de sesión tardó demasiado. Comprueba tu conexión y vuelve a intentar.')), 10000); })
  ]);
  window.clearTimeout(timeoutId);
  session = authResult.data?.session || null;
  if (authResult.error) throw authResult.error;
} catch (error) {
  app?.setAttribute('aria-busy', 'false');
  startupError = error;
}
function showStartupError(error) {
  app.replaceChildren();
  const main = document.createElement('main');
  main.className = 'ds-container ds-auth';
  const card = document.createElement('section');
  card.className = 'ds-card ds-stack';
  const title = document.createElement('h1');
  title.className = 'ds-h2';
  title.textContent = 'No se pudo iniciar el panel';
  const detail = document.createElement('p');
  detail.className = 'ds-text-muted';
  detail.textContent = error?.message || 'No se pudo validar la sesión con Supabase.';
  const hint = document.createElement('p');
  hint.className = 'ds-text-muted';
  hint.textContent = 'Verifica la conexión, las claves públicas y que la librería de Supabase esté disponible.';
  const retry = document.createElement('button');
  retry.className = 'ds-btn ds-btn--primary';
  retry.type = 'button';
  retry.textContent = 'Reintentar';
  retry.addEventListener('click', () => location.reload());
  card.append(title, detail, hint, retry);
  main.append(card);
  app.append(main);
}
if (startupError) {
  showStartupError(startupError);
} else if (!session) {
  app?.setAttribute('aria-busy', 'false');
  app.innerHTML = `<main class="ds-container ds-auth"><form class="ds-card ds-stack" id="admin-login"><h1 class="ds-h2">Iniciar sesión</h1><p class="ds-text-muted">Acceso privado para el equipo Kora.</p><label class="ds-field"><span class="ds-label">Correo</span><input class="ds-input" type="email" name="email" autocomplete="username" required></label><label class="ds-field"><span class="ds-label">Contraseña</span><input class="ds-input" type="password" name="password" autocomplete="current-password" required></label><button class="ds-btn ds-btn--primary ds-btn--block" type="submit">Entrar</button><p id="login-message" class="ds-error" role="alert"></p></form></main>`;
  document.querySelector('#admin-login').addEventListener('submit', async event => { event.preventDefault(); const form=event.currentTarget, button=form.querySelector('button'), message=document.querySelector('#login-message'); button.disabled=true; message.textContent='Validando acceso…'; try { const {error}=await authClient.auth.signInWithPassword({email:form.email.value.trim(),password:form.password.value}); if(error)throw error; location.reload(); } catch(error) { message.textContent=error.message || 'No fue posible iniciar sesión.'; button.disabled=false; } });
} else {
app?.setAttribute('aria-busy', 'false');
app.innerHTML = `<div class="ds-app admin-page">
  <div class="ds-overlay" id="overlay"></div>
  <aside class="ds-sidebar" id="sidebar" aria-label="Navegación de administración">
    <div class="brand"><span class="brand-mark">${icon('box')}</span>Kora Admin</div>
    <button class="ds-btn ds-btn--secondary side-search" type="button" id="global-search">${icon('search')} Buscar <kbd>⌘ K</kbd></button>
    <nav aria-label="Secciones">
      <p class="ds-nav__label">Menú principal</p>
      <button class="ds-nav__item" type="button" data-admin-section="home">${icon('home')} Inicio</button>
      <button class="ds-nav__item" type="button" id="store-toggle" aria-expanded="true" aria-controls="store-nav">${icon('shop')} Mi tienda <span class="chevron">${icon('down')}</span></button>
      <div id="store-nav">
        <button class="ds-nav__item" type="button" data-admin-section="products">Productos</button>
        <button class="ds-nav__item" type="button" data-admin-section="orders">Pedidos</button>
        <button class="ds-nav__item" type="button" data-admin-section="customers">Clientes</button>
      </div>
      <button class="ds-nav__item" type="button" data-admin-section="store">${icon('settings')} Gestión de tienda</button>
      <button class="ds-nav__item" type="button" data-admin-section="reports">${icon('chart')} Reportes</button>
      <button class="ds-nav__item" type="button" data-admin-section="inbox">${icon('inbox')} Bandeja</button>
      <p class="ds-nav__label">Otros</p>
      <button class="ds-nav__item" type="button" data-admin-section="promotions">${icon('tag')} Promociones</button>
      <button class="ds-nav__item" type="button" data-admin-section="settings">${icon('settings')} Configuración</button>
      <button class="ds-nav__item" type="button" data-admin-section="help">${icon('help')} Ayuda</button>
    </nav>
    <div class="ds-sidebar__footer"><button class="profile" type="button" id="user-menu"><span class="ds-avatar">K</span><span class="profile-copy"><strong>Equipo Kora</strong><small>Vista de diseño</small></span><span class="chevron">${icon('down')}</span></button></div>
  </aside>
  <main class="ds-main" id="main">
    <div class="mobile-topbar"><strong>Kora Admin</strong><button type="button" class="ds-btn ds-btn--ghost ds-btn--icon" id="open-menu" aria-label="Abrir menú">${icon('menu')}</button></div>
    <div id="orders-view"><div class="ds-breadcrumb"><ol><li>Inicio</li><li aria-current="page">Pedidos</li></ol></div>
    <header class="ds-page-header"><div><h1 class="ds-h1">Lista de pedidos</h1><p>Gestiona los pedidos de impresión 3D de tu tienda.</p></div><div class="head-actions"><button type="button" class="ds-btn ds-btn--primary" data-admin-section="new-order">${icon('plus')} Nuevo pedido</button><button type="button" class="ds-btn ds-btn--secondary" id="orders-export">Exportar pedidos ${icon('download')}</button></div></header>
    <section class="ds-stats" aria-label="Indicadores de pedidos" aria-busy="true">
      <div class="ds-stat"><span class="ds-stat__label">Pedidos totales</span><div class="ds-stat__value" data-metric="total"><span class="ds-skeleton" aria-label="Cargando"></span></div><small class="ds-stat__help">Últimos 365 días</small></div>
      <div class="ds-stat"><span class="ds-stat__label">Nuevos</span><div class="ds-stat__value" data-metric="new"><span class="ds-skeleton" aria-label="Cargando"></span></div><small class="ds-stat__help">Últimos 365 días</small></div>
      <div class="ds-stat"><span class="ds-stat__label">Completados</span><div class="ds-stat__value" data-metric="delivered"><span class="ds-skeleton" aria-label="Cargando"></span></div><small class="ds-stat__help">Últimos 365 días</small></div>
      <div class="ds-stat"><span class="ds-stat__label">Ventas</span><div class="ds-stat__value" data-metric="revenue"><span class="ds-skeleton" aria-label="Cargando"></span></div><small class="ds-stat__help">Últimos 365 días</small></div>
    </section>
    <section class="ds-card ds-card--flush" aria-label="Pedidos">
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
    </section></div>
    <section id="products-view" hidden aria-label="Gestión de productos">
      <div class="ds-breadcrumb"><ol><li>Inicio</li><li aria-current="page">Productos</li></ol></div>
      <header class="ds-page-header"><div><h1 class="ds-h1">Productos</h1><p>Administra el catálogo que se muestra en la tienda online.</p></div></header>
      <div id="admin-loading" class="admin-loading ds-card" role="status">Cargando catálogo de productos…</div>
      <div id="admin-app" hidden>
        <span id="admin-user" class="ds-sr-only"></span><button type="button" id="admin-logout" hidden>Cerrar sesión</button>
        <div class="admin-shell">
<section class="admin-global-colors" id="admin-global-colors" hidden aria-labelledby="admin-global-colors-title">
          <div class="admin-section-head"><div><h2 id="admin-global-colors-title">Colores maestros globales</h2><p>Esta paleta se aplicará a los productos que usen la opción “Paleta global”.</p></div><button class="admin-icon-button ds-btn ds-btn--ghost ds-btn--icon" type="button" id="admin-global-colors-close" aria-label="Cerrar colores">×</button></div>
          <div class="admin-color-editor" id="admin-global-colors-list"></div>
          <div class="admin-panel-actions"><button class="ds-btn ds-btn--secondary" type="button" id="admin-add-global-color">Agregar color</button><button class="ds-btn ds-btn--primary" type="button" id="admin-save-global-colors">Guardar paleta global</button></div>
          <p class="admin-status" id="admin-global-colors-status" aria-live="polite"></p>
        </section>
        <section class="admin-dashboard admin-module" id="admin-dashboard-view" aria-labelledby="admin-products-title">
          <div class="admin-section-head admin-section-divider"><div><h2 id="admin-products-title">Productos</h2><strong id="admin-product-count">0</strong></div><div class="admin-title-actions"><button class="ds-btn ds-btn--secondary" type="button" id="admin-colors-button">Colores maestros</button><button class="ds-btn ds-btn--primary" type="button" id="admin-create-button">Crear nuevo producto</button></div></div>
          <div class="admin-filters">
            <label class="ds-field">Buscar<input id="admin-search" type="search" placeholder="Por nombre, categoría o material"  class="ds-input"/></label>
            <label class="ds-field">Categorías<select id="admin-filter-category" class="ds-select"><option value="">Todas las categorías</option></select></label>
            <label class="ds-field">Origen<select id="admin-filter-origin" class="ds-select"><option value="">Todos</option><option value="kora">Kora Studio</option><option value="other">Otros</option></select></label>
            <label class="ds-field">Estado<select id="admin-filter-status" class="ds-select"><option value="">Todos</option><option value="stock">En stock</option><option value="out">Sin stock</option><option value="draft">Borrador</option></select></label>
            <label class="ds-field">Rango de precio<select id="admin-filter-price" class="ds-select"><option value="">Todos</option><option value="0-20000">Hasta $20.000</option><option value="20001-50000">$20.001 a $50.000</option><option value="50001-100000">$50.001 a $100.000</option><option value="100001+">Más de $100.000</option></select></label>
          </div>
          <div class="admin-product-table-head" aria-hidden="true"><span>Nombre del producto</span><span>Categoría</span><span>Estado</span><span>Medida</span><span>Vendidos</span><span>Precio</span><span>Precio anterior</span><span></span></div>
          <div class="admin-list" id="admin-products-list"></div>
          <nav class="admin-pagination" id="admin-pagination" aria-label="Paginación de productos"></nav>
          <p class="admin-status" id="admin-list-status" aria-live="polite"></p>
        </section>
        <section class="admin-editor admin-module" id="admin-editor-view" hidden aria-labelledby="admin-form-title">
          <div class="admin-section-head admin-section-divider">
            <h2 id="admin-form-title">Nuevo producto</h2>
            <div class="admin-editor-navigation" aria-label="Navegación del administrador">
              <button class="ds-btn ds-btn--secondary" type="button" id="admin-cancel"><span aria-hidden="true">←</span>Volver al catálogo</button>
              <button class="ds-btn ds-btn--secondary" type="button" data-admin-calculator><span aria-hidden="true">⌁</span>Cotizador 3D</button>
            </div>
          </div>
          <form class="admin-product-form" id="product-admin-form">
            <input type="hidden" id="admin-product-id" />
            <div class="admin-form-column">
              <label class="ds-field"><span>Nombre del producto <b aria-hidden="true">*</b></span><input id="admin-title" type="text" placeholder="Ej: Dije corazón rojo" required  class="ds-input"/></label>
              <label class="ds-field">Descripción del producto<textarea id="admin-description" rows="7" placeholder="Describe el producto para mostrar esta información en la tienda" required class="ds-textarea"></textarea></label>
              <label class="ds-field"><span>Precio <b aria-hidden="true">*</b></span><input id="admin-price" type="number" min="0" step="500" placeholder="$" required  class="ds-input"/></label>
              <label class="ds-field">Precio anterior<input id="admin-compare" type="number" min="0" step="500" placeholder="$"  class="ds-input"/></label>
              <label class="ds-field"><span>Stock <b aria-hidden="true">*</b></span><input id="admin-stock" type="number" min="0" value="0" required  class="ds-input"/></label>
              <label class="admin-toggle"><input id="admin-custom" type="checkbox"  class="ds-check"/>¿El producto es personalizado?</label>
              <p class="admin-field-help">Al activarlo, el comprador verá un campo de texto abierto “Agrega el nombre” por cada unidad.</p>
              <section class="admin-associations" id="admin-product-components" hidden>
                <div class="admin-inline-head">
                  <h3>Items incluidos en el producto</h3>
                  <button class="ds-btn ds-btn--secondary" type="button" id="admin-add-component" aria-expanded="false" aria-controls="admin-component-picker">Añadir producto</button>
                </div>
                <p>Define los dijes, accesorios o piezas asociadas y su cantidad.</p>
                <div class="admin-component-picker" id="admin-component-picker" hidden>
                  <div class="admin-component-picker-head">
                    <label for="admin-component-search">Buscar en el catálogo</label>
                    <button class="admin-icon-button ds-btn ds-btn--ghost ds-btn--icon" type="button" id="admin-close-component-picker" aria-label="Cerrar buscador de productos" title="Cerrar">×</button>
                  </div>
                  <input id="admin-component-search" type="search" placeholder="Buscar por nombre o categoría" autocomplete="off"  class="ds-input"/>
                  <div class="admin-component-catalog" id="admin-component-catalog" role="listbox" aria-label="Productos del catálogo"></div>
                </div>
                <div id="admin-components"></div>
              </section>
            </div>
            <div class="admin-form-column">
              <input id="admin-product-type" type="hidden" value="dije" />
              <label class="ds-field"><span>Categorías <b aria-hidden="true">*</b></span><select id="admin-category" required class="ds-select"><option value="">Selecciona una categoría</option><option value="Acrílicos">Acrílicos</option><option value="Bases">Bases</option><option value="Dijes">Dijes</option><option value="Dijes y kits">Dijes y kits</option><option value="Dijes y charms">Dijes y charms</option><option value="Dijes cover gold">Dijes cover gold</option><option value="Dijes de vidrio">Dijes de vidrio</option><option value="Dijes rodinados">Dijes rodinados</option><option value="Kits">Kits</option><option value="Llaveros">Llaveros</option><option value="Navidad">Navidad</option></select></label>
              <label class="ds-field"><span>Material <b aria-hidden="true">*</b></span><select id="admin-material" required class="ds-select"><option value="">Selecciona una</option><option value="Biocompostable">Biocompostable</option><option value="Resina">Resina</option><option value="other">Otro material</option></select></label>
              <label class="admin-material-custom ds-field" id="admin-material-custom-field" hidden>Especifica el material<input id="admin-material-custom" type="text" maxlength="80" placeholder="Ej: Madera reciclada" autocomplete="off"  class="ds-input"/></label>
              <fieldset class="admin-image-fieldset"><legend>Imágenes del producto</legend>
                <input id="admin-image" type="hidden" />
                <label class="admin-images-upload"><input id="admin-images-file" type="file" accept="image/png,image/jpeg,image/webp" multiple /><img class="admin-image-icon" src="assets/pet-camera.svg" alt="" aria-hidden="true" /><strong>Sube hasta 3 imágenes</strong><small>Selecciona una o varias imágenes al mismo tiempo</small></label>
                <div class="admin-image-list" id="admin-image-list" aria-live="polite"></div>
                <p class="admin-image-status" id="admin-image-status"></p>
              </fieldset>
              <label class="ds-field">Medida<input id="admin-size" type="text" placeholder="Ej: 30 x 34 mm"  class="ds-input"/></label>
              <fieldset class="admin-color-fieldset"><legend>Colores disponibles</legend>
                <div class="admin-color-modes"><label><input type="radio" name="admin-color-mode" value="none" checked  class="ds-check"/>Sin selección</label><label><input type="radio" name="admin-color-mode" value="global"  class="ds-check"/>Paleta global</label><label><input type="radio" name="admin-color-mode" value="manual"  class="ds-check"/>Paleta manual</label></div>
                <p class="admin-field-help" id="admin-color-help">Úsalo para productos revendidos o con color fijo.</p>
                <div class="admin-color-editor" id="admin-manual-colors-list" hidden></div><button class="ds-btn ds-btn--secondary" type="button" id="admin-add-manual-color" hidden>Agregar color</button>
              </fieldset>
              <label class="ds-field">Etiquetas adicionales<input id="admin-tags" type="text" placeholder="Regalo, edición limitada"  class="ds-input"/></label>
              <label class="admin-toggle"><input id="admin-active" type="checkbox" checked  class="ds-check"/>Publicar en la tienda</label>
            </div>
            <div class="admin-form-actions"><button class="ds-btn ds-btn--secondary" type="button" id="admin-reset">Limpiar</button><button class="ds-btn ds-btn--primary" id="admin-submit" type="submit">Guardar</button><p class="admin-status" id="admin-status" aria-live="polite"></p></div>
          </form>
        </section>
        
        </div>
      </div>
    </section>
    <section id="other-view" hidden aria-live="polite"></section>
  </main>
  <div class="ds-toasts"><div id="toast" role="status" aria-live="polite" hidden></div></div>
  <div id="order-drawer-root"></div>
</div>`;
const params=new URLSearchParams(location.search);
const allowedViews=['orders','products','home','customers','store','reports','inbox','promotions','settings','help','new-order'];
const startView=allowedViews.includes(params.get('view'))?params.get('view'):'home';
const allowedTabs=['all','new','printing','delivered','cancelled'];const requestedTab=params.get('tab');const filters={page:Math.max(1,Number(params.get('page'))||1),tab:allowedTabs.includes(requestedTab)?requestedTab:'all',q:params.get('q')||'',status:params.get('status')||'',from:params.get('from')||'',to:params.get('to')||''};
const searchInput=document.getElementById('order-search'),statusInput=document.getElementById('order-status'),fromInput=document.getElementById('order-from'),toInput=document.getElementById('order-to');
searchInput.value=filters.q;statusInput.value=filters.status;fromInput.value=filters.from;toInput.value=filters.to;
const feedback=document.getElementById('orders-feedback'),tbody=document.getElementById('order-rows');let lastPayload={orders:[],count:0,page:1,pageSize:PAGE_SIZE};
function syncUrl(){const next=new URLSearchParams();for(const key of ['tab','q','status','from','to'])if(filters[key]&&!(key==='tab'&&filters[key]==='all'))next.set(key,filters[key]);if(filters.page>1)next.set('page',String(filters.page));history.replaceState(null,'',location.pathname+(next.size?'?'+next:''));}
function pagination(payload){const pages=document.getElementById('orders-pages'),total=Math.max(1,Math.ceil(payload.count/PAGE_SIZE));pages.replaceChildren();const button=(number,label=String(number))=>{const el=document.createElement('button');el.type='button';el.className='ds-page';el.textContent=label;if(number===filters.page)el.setAttribute('aria-current','page');el.addEventListener('click',()=>{filters.page=number;loadOrders()});pages.append(el)};if(filters.page>1)button(Math.max(1,filters.page-1),'…');button(1);if(total>1&&filters.page!==1&&filters.page!==total)button(filters.page);if(total>1)button(total);document.getElementById('orders-prev').disabled=filters.page<=1;document.getElementById('orders-next').disabled=filters.page>=total;}
async function loadOrders(){document.querySelectorAll('.ds-tab').forEach(tab=>{const selected=tab.dataset.status===filters.tab;tab.setAttribute('aria-selected',String(selected));tab.tabIndex=selected?0:-1});syncUrl();feedback.hidden=true;tbody.replaceChildren();for(let i=0;i<4;i++){const tr=document.createElement('tr');for(let j=0;j<6;j++){const td=document.createElement('td');const skeleton=document.createElement('span');skeleton.className='ds-skeleton';skeleton.setAttribute('aria-hidden','true');td.append(skeleton);tr.append(td)}tbody.append(tr)}try{lastPayload=await getOrdersPage(filters);renderTable(lastPayload.orders,CONFIG,order=>openOrderDrawer(order,{getOrderDetail,updateOrderStatus,showToast,refresh:loadOrders}));pagination(lastPayload);for(const tab of ['all','new','printing','delivered','cancelled']){const el=document.querySelector('[data-count="'+tab+'"]');if(el)el.textContent=tab===filters.tab?String(lastPayload.count):'—';}if(!lastPayload.orders.length){feedback.hidden=false;feedback.textContent='Sin pedidos con estos filtros. Ajusta la búsqueda o limpia los filtros.';const clear=document.createElement('button');clear.type='button';clear.className='ds-btn ds-btn--secondary';clear.textContent='Limpiar filtros';clear.addEventListener('click',()=>{Object.assign(filters,{page:1,tab:'all',q:'',status:'',from:'',to:''});searchInput.value='';statusInput.value='';fromInput.value='';toInput.value='';loadOrders()});feedback.append(' ',clear);}}catch(error){feedback.hidden=false;feedback.replaceChildren();const message=document.createElement('p');message.textContent=error.message||'No se pudieron cargar los pedidos.';const retry=document.createElement('button');retry.type='button';retry.className='ds-btn ds-btn--secondary';retry.textContent='Reintentar';retry.addEventListener('click',loadOrders);feedback.append(message,retry);}}
document.querySelectorAll('.ds-tab').forEach(tab=>{const selected=tab.dataset.status===filters.tab;tab.setAttribute('aria-selected',String(selected));tab.tabIndex=selected?0:-1});
attachTabs(document.querySelector('.ds-tabs'),status=>{filters.tab=status;filters.page=1;loadOrders()});
let searchTimer;searchInput.addEventListener('input',()=>{clearTimeout(searchTimer);searchTimer=setTimeout(()=>{filters.q=searchInput.value.trim();filters.page=1;loadOrders()},300)});
for(const [input,key] of [[statusInput,'status'],[fromInput,'from'],[toInput,'to']])input.addEventListener('change',()=>{filters[key]=input.value;filters.page=1;loadOrders()});
document.getElementById('orders-prev').addEventListener('click',()=>{if(filters.page>1){filters.page--;loadOrders()}});document.getElementById('orders-next').addEventListener('click',()=>{filters.page++;loadOrders()});
document.querySelectorAll('[data-admin-section]').forEach(button=>button.addEventListener('click',()=>showAdminSection(button.dataset.adminSection)));
document.getElementById('user-menu').addEventListener('click',async()=>{await authClient.auth.signOut({scope:'local'});window.KORA_ADMIN_SESSION=null;location.reload()});
document.getElementById('global-search').addEventListener('click',()=>{showAdminSection('orders');requestAnimationFrame(()=>searchInput.focus())});
document.getElementById('orders-export').addEventListener('click',exportOrders);document.addEventListener('keydown',e=>{if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='k'){e.preventDefault();searchInput.focus()}if(e.key==='Escape')closeMenu()});
const sidebar=document.getElementById('sidebar'),overlay=document.getElementById('overlay');function closeMenu(){sidebar.classList.remove('is-open');overlay.classList.remove('is-open')};document.getElementById('open-menu').addEventListener('click',()=>{sidebar.classList.add('is-open');overlay.classList.add('is-open')});overlay.addEventListener('click',closeMenu);
document.getElementById('store-toggle').addEventListener('click',e=>{const open=e.currentTarget.getAttribute('aria-expanded')==='true';e.currentTarget.setAttribute('aria-expanded',String(!open));document.getElementById('store-nav').hidden=open});
document.getElementById('other-view').addEventListener('click',e=>{const button=e.target.closest('[data-dashboard-go]');if(button)showAdminSection(button.dataset.dashboardGo)});
const homeCrumbs=new MutationObserver(()=>document.querySelectorAll('.ds-breadcrumb li:first-child').forEach(li=>{
  if(li.hasAttribute('aria-current')||li.querySelector('button'))return;
  const button=document.createElement('button');button.type='button';button.className='ds-btn ds-btn--ghost ds-btn--sm';button.textContent='Inicio';button.addEventListener('click',()=>showAdminSection('home'));li.replaceChildren(button);
}));
homeCrumbs.observe(document.getElementById('main'),{childList:true,subtree:true});
document.querySelectorAll('.ds-breadcrumb li:first-child').forEach(li=>{if(!li.hasAttribute('aria-current')){const button=document.createElement('button');button.type='button';button.className='ds-btn ds-btn--ghost ds-btn--sm';button.textContent='Inicio';button.addEventListener('click',()=>showAdminSection('home'));li.replaceChildren(button)}});
showAdminSection(startView,false);
loadMetrics();
async function ensureProducts(){const loading=document.getElementById('admin-loading');try{if(!window.KORA_ADMIN_CLIENT){window.KORA_ADMIN_CLIENT=authClient;window.KORA_ADMIN_SESSION=session}if(!window.KORA_PRODUCTS_MODULE)window.KORA_PRODUCTS_MODULE=import(new URL('./js/products.js?v=20261110-component-picker',location.href));await window.KORA_PRODUCTS_MODULE}catch(error){loading.hidden=false;loading.textContent='No se pudo cargar el catálogo: '+(error.message||'Intenta nuevamente.')}}
function showAdminSection(view,updateUrl=true){const selected=allowedViews.includes(view)?view:'home';const products=selected==='products',orders=selected==='orders';document.title=(products?'Productos':orders?'Pedidos':selected==='new-order'?'Nuevo pedido':(document.querySelector('[data-admin-section="'+selected+'"]')?.textContent.trim()||'Inicio'))+' · Kora Admin';document.getElementById('orders-view').hidden=!orders;document.getElementById('products-view').hidden=!products;document.getElementById('other-view').hidden=orders||products;document.querySelectorAll('[data-admin-section]').forEach(button=>{if(button.dataset.adminSection===selected)button.setAttribute('aria-current','page');else button.removeAttribute('aria-current')});if(updateUrl){const url=new URL(location.href);if(selected==='home')url.searchParams.delete('view');else url.searchParams.set('view',selected);history.replaceState(null,'',url.pathname+url.search)}if(products)ensureProducts();else if(orders)loadOrders();else if(selected==='home')renderHomeDashboard();else if(selected==='store')mountStoreContent({root:document.getElementById('other-view'),client:authClient,onNavigate:showAdminSection,showToast});else renderOtherSection(selected);closeMenu()}
async function renderHomeDashboard(){
  const root=document.getElementById('other-view');
  root.innerHTML=`<div class="ds-breadcrumb"><ol><li aria-current="page">Inicio</li></ol></div>
    <header class="ds-page-header"><div><h1 class="ds-h1">Resumen de Kora</h1><p>Ventas, pedidos, productos y tráfico en un solo lugar.</p></div><button type="button" class="ds-btn ds-btn--secondary" data-dashboard-go="reports">Ver reportes</button></header>
    <section class="ds-stats kora-summary-stats" aria-label="Resumen de la tienda" aria-busy="true">
      <div class="ds-stat"><span class="ds-stat__label">Ventas confirmadas</span><div class="ds-stat__value" data-summary="revenue">—</div><small class="ds-stat__help">Últimos 365 días; no incluye costos</small></div>
      <div class="ds-stat"><span class="ds-stat__label">Pedidos</span><div class="ds-stat__value" data-summary="orders">—</div><small class="ds-stat__help">Últimos 365 días</small></div>
      <div class="ds-stat"><span class="ds-stat__label">Productos activos</span><div class="ds-stat__value" data-summary="products">—</div><small class="ds-stat__help">Visibles en la tienda</small></div>
      <div class="ds-stat"><span class="ds-stat__label">Sesiones del sitio</span><div class="ds-stat__value" data-summary="visits">—</div><small class="ds-stat__help">Últimos 30 días</small></div>
    </section>
    <div class="kora-summary-grid">
      <section class="ds-card"><div class="ds-card__header"><h2 class="ds-h3">Últimos pedidos gestionados</h2></div><div class="ds-card__body" data-summary-list="orders">Cargando…</div></section>
      <section class="ds-card"><div class="ds-card__header"><h2 class="ds-h3">Productos más vendidos</h2></div><div class="ds-card__body" data-summary-list="sellers">Cargando…</div></section>
      <section class="ds-card"><div class="ds-card__header"><h2 class="ds-h3">Stock por actualizar</h2></div><div class="ds-card__body" data-summary-list="stock">Cargando…</div></section>
      <section class="ds-card"><div class="ds-card__header"><h2 class="ds-h3">Origen de visitas</h2></div><div class="ds-card__body" data-summary-list="traffic">Cargando…</div></section>
    </div><p class="ds-text-muted">La ganancia neta requiere registrar el costo de producción de cada producto. Aquí se muestran ventas confirmadas.</p>`;
  const money=new Intl.NumberFormat(CONFIG.locale,{style:'currency',currency:CONFIG.currency,maximumFractionDigits:0});
  const number=new Intl.NumberFormat(CONFIG.locale);
  const line=(left,right)=>{const row=document.createElement('div');row.className='kora-summary-row';const label=document.createElement('span');label.textContent=left;const value=document.createElement('strong');value.textContent=right;row.append(label,value);return row};
  const fill=(key,items,empty)=>{const target=root.querySelector('[data-summary-list="'+key+'"]');target.replaceChildren();if(!items.length){target.textContent=empty;return}target.append(...items)};
  try{
    const endpoint=window.koraEndpoint?.('admin-business','');
    if(!endpoint)throw new Error('No está configurada la conexión del admin.');
    const response=await fetch(endpoint+'?view=dashboard',{headers:{Authorization:'Bearer '+session.access_token}});
    const payload=await response.json();
    if(!response.ok)throw new Error(payload.error||'No se pudo cargar el resumen.');
    if(document.getElementById('other-view')!==root||root.hidden||!root.querySelector('[data-summary="revenue"]'))return;
    const data=payload.summary||{},metrics=data.metrics||{};
    for(const [key,value] of Object.entries({revenue:money.format(metrics.revenue||0),orders:number.format(metrics.total||0),products:number.format(data.products||0),visits:number.format(data.visits||0)}))root.querySelector('[data-summary="'+key+'"]').textContent=value;
    root.querySelector('.kora-summary-stats').setAttribute('aria-busy','false');
    fill('orders',(data.latestOrders||[]).map(o=>line((o.reference||String(o.id).slice(0,8))+' · '+new Intl.DateTimeFormat(CONFIG.locale,{dateStyle:'short'}).format(new Date(o.created_at)),money.format(o.total||0))),'Todavía no hay pedidos.');
    fill('sellers',(data.bestSellers||[]).map(p=>line(p.title,number.format(p.units)+' vendidos')),'Sin ventas registradas para los productos actuales.');
    fill('stock',(data.lowStock||[]).map(p=>line(p.title,number.format(p.stock)+' disponibles')),'El stock de los productos activos está al día.');
    const names={instagram:'Instagram',facebook:'Facebook',organic_search:'Búsqueda orgánica',direct:'Directo',referral:'Otros sitios',other_social:'Otras redes'};
    fill('traffic',Object.entries(data.sources||{}).sort((a,b)=>b[1]-a[1]).map(([source,count])=>line(names[source]||source,number.format(count))),'Todavía no hay sesiones registradas.');
  }catch(error){root.querySelector('.kora-summary-stats')?.setAttribute('aria-busy','false');root.querySelectorAll('[data-summary-list]').forEach(el=>el.textContent=error.message||'No se pudo cargar el resumen.');}
}
function renderOtherSection(view){const pages={home:{title:'Inicio',description:'Resumen rápido de la administración de Kora.',empty:'Tu panel está listo',detail:'Abre Pedidos para gestionar ventas o Productos para actualizar el catálogo.',actions:[['Ver pedidos','orders'],['Administrar productos','products']]},customers:{title:'Clientes',description:'Consulta los clientes que han comprado en la tienda.',empty:'Vista de clientes',detail:'El listado dedicado de clientes aún no está conectado. Puedes consultar la información de cada comprador desde el detalle de sus pedidos.',actions:[['Ir a Pedidos','orders']]},store:{title:'Gestión de tienda',description:'Administra el catálogo y el contenido comercial.',empty:'Gestión de tienda',detail:'El catálogo de productos ya está conectado. Los demás ajustes de tienda se agregarán aquí.',actions:[['Administrar productos','products']]},reports:{title:'Reportes',description:'Indicadores de pedidos y ventas.',empty:'Reportes',detail:'Los indicadores disponibles están en la vista de Pedidos. El módulo de reportes detallados aún no está conectado.',actions:[['Ver Pedidos','orders']]},inbox:{title:'Bandeja',description:'Mensajes y solicitudes recibidas por Kora.',empty:'Bandeja de mensajes',detail:'La bandeja unificada aún no está conectada. Puedes abrir el sitio público para revisar los canales de contacto.',actions:[['Abrir sitio público','../index.html']]},promotions:{title:'Promociones',description:'Gestiona campañas y descuentos de la tienda.',empty:'Promociones',detail:'No hay un módulo de promociones conectado todavía. Puedes preparar etiquetas y precios desde el editor de productos.',actions:[['Administrar productos','products']]},settings:{title:'Configuración',description:'Preferencias y ajustes del panel.',empty:'Configuración',detail:'Los ajustes del catálogo están disponibles desde Productos. Las demás preferencias aún no están conectadas.',actions:[['Abrir productos','products']]},help:{title:'Ayuda',description:'Ayuda para usar la administración de Kora.',empty:'Centro de ayuda',detail:'Puedes gestionar pedidos y mantener actualizado el catálogo desde este panel.',actions:[['Ver pedidos','orders'],['Administrar productos','products']]},'new-order':{title:'Nuevo pedido',description:'Inicia un pedido desde la tienda pública.',empty:'Los pedidos se generan desde la tienda',detail:'El cliente completa allí el carrito y el proceso de compra. Desde el panel puedes consultar el pedido una vez registrado.',actions:[['Abrir tienda','../index.html'],['Volver a Pedidos','orders']]}};const page=pages[view]||pages.home,root=document.getElementById('other-view');root.replaceChildren();const breadcrumb=document.createElement('div');breadcrumb.className='ds-breadcrumb';const crumbs=document.createElement('ol');for(const label of ['Inicio',page.title]){const item=document.createElement('li');item.textContent=label;if(label===page.title)item.setAttribute('aria-current','page');crumbs.append(item)}breadcrumb.append(crumbs);const header=document.createElement('header');header.className='ds-page-header';const heading=document.createElement('div');const title=document.createElement('h1');title.className='ds-h1';title.textContent=page.title;const description=document.createElement('p');description.textContent=page.description;heading.append(title,description);header.append(heading);const card=document.createElement('section');card.className='ds-card';const empty=document.createElement('div');empty.className='ds-empty';const emptyTitle=document.createElement('strong');emptyTitle.className='ds-empty__title';emptyTitle.textContent=page.empty;const detail=document.createElement('p');detail.textContent=page.detail;const actions=document.createElement('div');actions.className='head-actions';for(const [label,target] of page.actions){if(target.startsWith('../')){const link=document.createElement('a');link.className='ds-btn ds-btn--primary';link.href=target;link.textContent=label;actions.append(link)}else{const button=document.createElement('button');button.type='button';button.className='ds-btn ds-btn--primary';button.textContent=label;button.addEventListener('click',()=>showAdminSection(target));actions.append(button)}}empty.append(emptyTitle,detail,actions);card.append(empty);root.append(breadcrumb,header,card);const url=new URL(location.href);document.title=page.title+' · Kora Admin';}
function exportOrders(){if(!lastPayload.orders.length){showToast('No hay pedidos en esta página para exportar.');return}const quote=value=>'"'+String(value??'').replaceAll('"','""')+'"';const rows=[['Pedido','Cliente','Fecha','Total COP','Estado']];for(const order of lastPayload.orders){const customer=order.customer?.name||[order.customer?.firstName,order.customer?.lastName].filter(Boolean).join(' ')||'Cliente';rows.push([order.reference||order.id,customer,order.created_at||'',order.total||0,order.fulfillment_status||order.status||''])}const csv='\uFEFF'+rows.map(row=>row.map(quote).join(',')).join('\r\n');const blob=new Blob([csv],{type:'text/csv;charset=utf-8'});const href=URL.createObjectURL(blob);const link=document.createElement('a');link.href=href;link.download='pedidos-kora.csv';link.click();window.setTimeout(()=>URL.revokeObjectURL(href),1000);showToast('Se exportó la página actual de pedidos.')}
async function loadMetrics(){try{const data=await getOrderMetrics();const money=new Intl.NumberFormat(CONFIG.locale,{style:'currency',currency:CONFIG.currency,maximumFractionDigits:0});for(const [key,value] of Object.entries({total:data.total||0,new:data.new||0,delivered:data.delivered||0,revenue:money.format(data.revenue||0)})){const target=document.querySelector('[data-metric="'+key+'"]');if(target)target.textContent=String(value)}document.querySelector('.ds-main .ds-stats')?.setAttribute('aria-busy','false')}catch(error){document.querySelectorAll('[data-metric]').forEach(el=>el.textContent='—');document.querySelector('.ds-main .ds-stats')?.setAttribute('aria-busy','false');showToast(error.message||'No se pudieron cargar las métricas.')}}
}
