(() => {
  const root = document.querySelector("#product-detail-root");
  if (!root) return;
  const money = new Intl.NumberFormat("es-CO", {style:"currency",currency:"COP",maximumFractionDigits:0});
  const esc = (value) => String(value ?? "").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");
  const $ = (selector) => document.querySelector(selector);
  const el = {
    image:$("#product-detail-image"), thumbs:$("#product-gallery-thumbnails"), category:$("#product-detail-category"),
    title:$("#product-detail-title"), price:$("#product-detail-price"), compare:$("#product-detail-compare"),
    description:$("#product-detail-description"), materials:$("#product-detail-materials"), specs:$("#product-detail-specs"),
    breadcrumb:$("#product-breadcrumb-category"), breadcrumbTitle:$("#product-breadcrumb-title"),
    quantity:$("#product-quantity-value"), stock:$("#product-stock-status"), add:$("#product-detail-add"), buy:$("#product-detail-buy"),
    components:$("#product-components"), componentsGrid:$("#product-components-grid"), relatedGrid:$("#product-related-grid")
  };
  let products=[], product=null, currentMode="suggestions";
  const idFromUrl=()=>new URLSearchParams(location.search).get("id");
  const readProducts=async()=>{
    try { const r=await fetch("data/products.json",{cache:"no-store"}); if(!r.ok) throw 0; const data=await r.json(); if(Array.isArray(data)&&data.length) return data; }
    catch {}
    try { const r=await fetch("data/demo-products.json",{cache:"no-store"}); if(r.ok) return await r.json(); } catch {}
    return window.KORA_PRODUCTS||[];
  };
  const productCard=(item)=>`<article class="product-card"><a class="product-media" href="producto.html?id=${encodeURIComponent(item.id)}"><img src="${esc(item.image)}" alt="${esc(item.title)}" loading="lazy"></a><div class="product-info"><h3>${esc(item.title)}</h3><div class="product-price"><strong>${money.format(item.price||0)}</strong></div><a class="product-card-cta" href="producto.html?id=${encodeURIComponent(item.id)}">Ver producto</a></div></article>`;
  const recentIds=()=>{try{return JSON.parse(localStorage.getItem("kora_recent_products")||"[]")}catch{return[]}};
  const remember=()=>{const list=[product.id,...recentIds().filter(id=>id!==product.id)].slice(0,8);localStorage.setItem("kora_recent_products",JSON.stringify(list));};
  const renderRelated=()=>{
    const recent=currentMode==="recent";
    const related=recent
      ?recentIds().filter(id=>id!==product.id).map(id=>products.find(p=>p.id===id)).filter(Boolean).slice(0,4)
      :products.filter(p=>p.id!==product.id).sort((a,b)=>Number((b.category===product.category))-Number((a.category===product.category))).slice(0,4);
    el.relatedGrid.hidden=false; el.relatedGrid.innerHTML=related.map(productCard).join("")||'<p class="product-related-empty">Pronto encontrarás más productos aquí.</p>';
  };
  const setGallery=(images)=>{
    const gallery=(Array.isArray(images)&&images.length?images:[product.image]).filter(Boolean).slice(0,3);
    el.image.src=gallery[0]; el.image.alt=product.title;
    el.thumbs.innerHTML=gallery.map((src,i)=>`<button type="button" class="product-gallery-thumb${i===0?" is-active":""}" data-gallery-index="${i}" aria-label="Ver foto ${i+1}"><img src="${esc(src)}" alt="" loading="lazy"></button>`).join("");
  };
  const updatePriceAndStock=()=>{
    const qty=Number(el.quantity.value||1), tiers=product.priceTiers||[];
    const tier=[...tiers].sort((a,b)=>b.quantity-a.quantity).find(t=>qty>=Number(t.quantity))||null;
    el.price.textContent=money.format(tier?.price??product.price??0);
    const stock=Number(product.stock||0), label=stock<=0?"Agotado":stock<=5?`¡Últimas ${stock} unidades!`:stock<=15?`Solo ${stock} disponibles`:"Disponible";
    el.stock.textContent=label; el.stock.className="product-stock-status "+(stock<=0?"is-out":stock<=5?"is-low":"is-ready");
    [...el.quantity.options].forEach(o=>{o.disabled=Number(o.value)>stock;});
    if(Number(el.quantity.value)>stock) el.quantity.value="1";
    el.add.disabled=stock<=0; el.buy.disabled=stock<=0;
  };
  const addToCart=(goToCheckout)=>{
    const qty=Number(el.quantity.value||1);
    if(!product||qty>Number(product.stock||0)) return;
    const tiers=product.priceTiers||[];
    const tier=[...tiers].sort((a,b)=>Number(b.quantity)-Number(a.quantity)).find(t=>qty>=Number(t.quantity));
    const cartProduct={...product,price:Number(tier?.price??product.price??0)};
    window.KoraCart?.add(product.id,qty,cartProduct);
    if(goToCheckout){location.href="carrito.html";return;}
    const original=el.add.textContent; el.add.textContent="Añadido al carrito";
    setTimeout(()=>el.add.textContent=original,1200);
  };
  const renderComponents=()=>{
    const rows=(product.components||[]).map(c=>{const p=products.find(item=>item.id===c.productId);return p?{...p,quantity:c.quantity||1}:null}).filter(Boolean);
    if(!rows.length){el.components.hidden=true;return;}
    el.components.hidden=false;
    el.componentsGrid.innerHTML=rows.map(item=>`<a class="product-component-card" href="producto.html?id=${encodeURIComponent(item.id)}"><img src="${esc(item.image)}" alt="${esc(item.title)}"><span><strong>${esc(item.title)}</strong><small>Cantidad ${item.quantity} · Comprar por separado</small></span></a>`).join("");
  };
  const render=()=>{
    document.title=`${product.title} | Kora Studio`;
    el.image.src=product.image; el.category.textContent=product.category||"Kora"; el.title.textContent=product.title;
    el.compare.textContent=product.compareAt?money.format(product.compareAt):""; el.compare.hidden=!product.compareAt;
    el.description.textContent=product.description||"Una pieza creada para acompañarte.";
    el.materials.textContent=product.material||"Materiales seleccionados y acabados cuidados para cada pieza.";
    if(el.breadcrumb){el.breadcrumb.textContent="Tienda"; el.breadcrumb.href="hazlotumismo.html";} el.breadcrumbTitle.textContent=product.title;
    el.specs.innerHTML=`<div><dt>Medida</dt><dd>${esc(product.size||"No aplica")}</dd></div><div><dt>Disponibilidad</dt><dd>${Number(product.stock||0)} unidades</dd></div><div><dt>Tipo</dt><dd>${esc(product.category||"Producto")}</dd></div>`;
    setGallery(product.images); updatePriceAndStock(); renderComponents(); remember(); renderRelated();
  };
  el.quantity.addEventListener("change",updatePriceAndStock);
  el.add.addEventListener("click",()=>addToCart(false)); el.buy.addEventListener("click",()=>addToCart(true));
  el.thumbs.addEventListener("click",event=>{const button=event.target.closest("[data-gallery-index]");if(!button)return;const index=Number(button.dataset.galleryIndex);el.image.src=(product.images||[product.image])[index];el.thumbs.querySelectorAll(".product-gallery-thumb").forEach((b,i)=>b.classList.toggle("is-active",i===index));});
  document.querySelectorAll("[data-related-mode]").forEach(button=>button.addEventListener("click",()=>{currentMode=button.dataset.relatedMode;document.querySelectorAll("[data-related-mode]").forEach(b=>b.setAttribute("aria-selected",String(b===button)));renderRelated();}));
  readProducts().then(items=>{products=items;product=products.find(p=>p.id===idFromUrl())||products[0];if(!product){root.innerHTML='<section class="section-inner product-not-found"><h1>Pronto llegan nuevos productos</h1><a class="button button-primary" href="hazlotumismo.html">Ir a Tienda</a></section>';return;}render();});
})();