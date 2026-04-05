# InstaCompras Live — Arquitectura Modular

## Estructura del Proyecto

```
instacompras/
├── index.html          → Solo HTML (estructura de pantallas)
├── css/                → Estilos separados por pantalla
│   ├── base.css        → Variables, reset, animaciones, toast
│   ├── nav.css         → Barra de navegación + topbar
│   ├── home.css        → Pantalla principal, grid de productos
│   ├── stream.css      → Página de stream + chat en vivo
│   ├── product.css     → Detalle de producto
│   ├── cart.css        → Carrito + checkout
│   ├── explore.css     → Pantalla de explorar tiendas
│   ├── profiles.css    → Perfil de usuario + perfil de vendedor
│   ├── activity.css    → Notificaciones + tracking + dashboard
│   ├── wallet.css      → Wallet + subastas
│   └── onboarding.css  → Onboarding + registro + go live + broadcast
└── js/                 → Lógica separada por responsabilidad
    ├── config.js       → API keys y configuración (Firebase, Agora, Google)
    ├── firebase.js     → Auth REST API + Firestore CRUD helpers
    ├── data.js         → Datos estáticos (sellers, productos, categorías)
    ├── core.js         → Estado, navegación, build de grids, utilidades
    ├── commerce.js     → Producto, carrito, checkout, wallet, subastas
    ├── social.js       → Stream, chat, seller profiles, notificaciones
    ├── account.js      → Auth, registro, perfil, dashboard, order tracking
    ├── broadcast.js    → Go live, Agora RTC, broadcast, simulador live
    └── init.js         → Auto-login y bootstrap
```

## Orden de Carga (importante)

Los scripts se cargan en orden de dependencia:

```
1. config.js     ← Constantes globales (sin dependencias)
2. firebase.js   ← Usa config.js (FB, GOOGLE_CLIENT_ID)
3. data.js       ← Datos puros (sin dependencias)
4. core.js       ← Usa firebase.js + data.js
5. commerce.js   ← Usa core.js + data.js
6. social.js     ← Usa core.js + data.js
7. account.js    ← Usa core.js + firebase.js
8. broadcast.js  ← Usa core.js + config.js
9. init.js       ← Bootstrap (usa todo lo anterior)
```

## Guía para Desarrolladores

### Agregar un nuevo producto
Edita `js/data.js` → array `PRODS[]`

### Agregar un nuevo vendedor
Edita `js/data.js` → array `SELLERS[]` + agrega al `SELLER_ORDER[]`

### Cambiar API keys
Edita `js/config.js` — un solo lugar para todas las keys

### Modificar estilos de una pantalla
Cada pantalla tiene su propio CSS:
- Home → `css/home.css`
- Stream → `css/stream.css`
- Producto → `css/product.css`
- etc.

### Agregar nueva funcionalidad
1. Identifica a qué módulo pertenece (commerce, social, account, broadcast)
2. Agrega la función al archivo correspondiente
3. Si necesita un onclick en HTML, la función debe ser global (no usar `const`)

## Próximos Pasos Recomendados

### Corto plazo
- [ ] Mover datos de `data.js` a Firestore (cargar dinámicamente)
- [ ] Agregar validación de inputs en formularios
- [ ] Implementar Firestore Security Rules

### Mediano plazo
- [ ] Migrar a ES Modules (`import`/`export`) con Vite como bundler
- [ ] Implementar sistema de pagos real (Stripe, MercadoPago)
- [ ] Agregar tests unitarios para funciones de carrito/checkout

### Largo plazo
- [ ] Migrar a framework (React/Vue/Svelte)
- [ ] Backend con Node.js/Express para tokens de Agora
- [ ] PWA con Service Worker para uso offline
