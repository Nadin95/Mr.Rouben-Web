# Mr. Rouben Platform

Plataforma e-commerce para productos de consumo para adultos (Tabaco, Vapers y Parafernalia), construida con Node.js, TypeScript, Express, MongoDB y vistas EJS.

## Estado actual

La aplicación incluye:

- Frontend web con home, catálogo por categorías, foro, login, registro y checkout.
- Autenticación JWT (cookie HTTP-only + Bearer) con contraseñas hasheadas en bcrypt.
- Registro de usuarios con verificación de email y filtro básico anti cuentas temporales.
- Suscripción opcional a novedades por email (nuevos productos y reposición de stock).
- Rol administrador restringido a Nadine para acceso a /admin.
- Panel admin para:
  - agregar productos
  - actualizar stock
  - eliminar productos
  - aprobar pagos manuales
- Flujo de pagos manuales por WhatsApp con whatsapp-web.js.

## Stack

- Node.js
- TypeScript
- Express
- MongoDB + Mongoose
- EJS
- JWT + bcrypt
- Nodemailer
- whatsapp-web.js

## Estructura (MVC)

```text
src/
  app.ts
  server.ts
  config/
  controllers/
  middlewares/
  models/
  routes/
  services/
  scripts/
  types/
  views/
  public/
docs/
```

## Instalación

1. Instalar dependencias:

```bash
npm install
```

2. Crear variables de entorno:

```bash
cp .env.example .env
```

3. Cargar datos iniciales:

```bash
npm run seed:nadine
npm run seed:demo
```

4. Levantar entorno local:

```bash
npm run dev
```

## Scripts

- npm run dev: inicia nodemon + ts-node
- npm run build: compila TypeScript a dist
- npm run start: ejecuta build compilado
- npm run seed:nadine: crea/actualiza admin Nadine
- npm run seed:demo: carga productos demo

## Branding y logo

- El logo se carga desde src/public/assets/logo.png.
- Si ese archivo no existe, la UI usa fallback en src/public/assets/logo.svg.
- El favicon usa la misma ruta.

## Flujo de compra manual (resumen)

1. Usuario agrega productos al carrito desde Home/Catálogo.
2. En Checkout se genera la orden vía /api/orders.
3. Backend crea la orden en estado pending_payment.
4. Bot de WhatsApp envía instrucciones al cliente con:
   - ID de pedido
   - detalle
   - total
   - alias bancario
5. Bot notifica a la administradora que hay orden pendiente.
6. Admin aprueba desde /admin.
7. Bot confirma al cliente que el pago fue validado y el pedido está en preparación.

## Documentación extendida

- docs/README-ARCHITECTURE.md
- docs/README-API.md
- docs/README-OPERATIONS.md
- docs/README-WHATSAPP.md

## Seguridad aplicada

- Passwords hasheadas con bcrypt.
- JWT firmado con secreto de entorno.
- Cookies HTTP-only para sesión web.
- Ruta /admin protegida por autenticación + rol + identidad (Nadine).
- Usuarios no verificados no pueden comprar.

## Próximos pasos sugeridos

- Añadir upload de comprobantes y conciliación automática básica.
- Agregar auditoría de acciones admin.
- Integrar tests E2E de checkout y aprobación de pago.
