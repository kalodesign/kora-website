# Inicio de Kora: análisis del referente

## Fase 1 — arquitectura de información

Las cinco capturas entregadas son de escritorio y muestran fragmentos sucesivos, no una captura móvil completa. El orden observable es: franja promocional y navegación; hero fotográfico a pantalla completa; productos más vendidos en una fila horizontal; bloque editorial dividido entre texto y fotografía; cuatro accesos visuales a categorías; anuncio de tienda física; galería social; footer con enlaces y suscripción. No aparecen una sección de beneficios ni FAQ en el referente visible. Kora ya cuenta con ambas: se conservan como contenido propio después de los bloques comerciales.

La navegación del referente agrupa novedades, compra, destacados, personalización y marca. En Kora se conserva la jerarquía existente: Inicio, Mascotas, Llaveros, Hazlo tú mismo, Nosotros y Contacto; el carrito y los canales sociales quedan como acciones secundarias.

## Layout

El hero ocupa aproximadamente toda la primera pantalla, con fotografía a sangre y contenido superpuesto. Los productos se presentan en cuatro columnas visibles en escritorio, con una fotografía grande por producto y espacio generoso entre título y precio. El bloque editorial usa dos mitades. Las categorías se ven en cuatro columnas de fotografías cuadradas; la galería social usa una fila de imágenes verticales. El contenido horizontalmente alineado deja márgenes estrechos en escritorio. Los intervalos entre bloques son amplios, cercanos visualmente a 64–112 px. La alineación de títulos de sección es centrada; el texto editorial se alinea a la izquierda.

Las capturas no muestran estados a 320–768 px. La adaptación propuesta usa dos columnas de productos y categorías en móvil, cuatro desde tableta, y apila las mitades editoriales. No se atribuye este comportamiento al referente.

## Tokens observados y adaptación

El referente usa fondo blanco (`#ffffff`), texto casi negro (`#111111`) y una franja verde muy brillante (aproximadamente `#0aef15`). La tipografía parece una sans geométrica de peso normal a muy grueso; el HTML de referencia incluye Archivo. Los títulos se ven aproximadamente entre 24 y 48 px en los fragmentos de escritorio, los textos entre 12 y 18 px. Tarjetas fotográficas con esquinas discretamente redondeadas (aproximadamente 6 px), sin bordes dominantes ni sombras constantes. El CTA principal se ve como píldora negra. Los iconos son lineales, pequeños y monocromos. Estas mediciones son aproximaciones visuales, no especificaciones extraídas de diseño.

Para Kora, la hoja `home-editorial.css` conserva los tokens de marca: azul `#171d67`, tinta `#001233`, violeta `#c4bbfe`, verde `#c5f273`, amarillo `#fbee64` y radios de 6 px. Las variables de `:root` reúnen colores, familias y escalas de letra, espaciado, radios, bordes, sombra y dimensiones.

## Interacción visible

La captura de productos muestra una flecha de carrusel. Las capturas fijas no demuestran su desplazamiento ni el comportamiento hover. Tampoco permiten verificar si la cabecera permanece sticky o si hay animaciones al scroll. El código de Kora conserva la interacción existente del carrito, menú móvil y catálogo; la nueva capa visual añade elevación discreta en hover y la desactiva cuando el visitante prefiere menos movimiento. No se imitan comportamientos no verificables.

## Fases 2 y 3

Fase 2: tokens específicos del home definidos en `:root` de `home-editorial.css`. Fase 3: `index.html` reorganizado visualmente con hero fotográfico, destacados, editorial, categorías y galería social, reutilizando imágenes de `assets/` de Kora. El catálogo mantiene `#productos-destacados` para su renderizado existente. No se copiaron recursos, textos ni logos de Filamental.
