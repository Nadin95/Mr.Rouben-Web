# Arquitectura Técnica

## Patrón

La aplicación usa MVC server-side:

- Models: esquemas Mongoose.
- Controllers: lógica de negocio.
- Routes: orquestación HTTP.
- Views: plantillas EJS.
- Services: integraciones externas (JWT, email, WhatsApp).
- Middlewares: auth de usuario y autorización admin.

## Componentes principales

- Auth
  - Registro/login
  - Verificación de email
  - Sesión por cookie + soporte bearer token
- Catálogo
  - Listado por categorías
  - Estado isAvailable y stock
- Admin
  - CRUD operativo de catálogo
  - Aprobación de pagos manuales
- Pedidos
  - Creación de orden con snapshot de items
  - Estado inicial pending_payment
- Notificaciones
  - Email para verificación y novedades
  - WhatsApp para pagos manuales

## Modelo de datos clave

- User
  - username, email, phone, password, role
  - isEmailVerified, emailVerificationToken, marketingOptIn
- Product
  - name, description, category, price, stock, isAvailable, isFeatured
- Order
  - user, customerPhone, items, total, status, validatedByAdmin
- ForumPost
  - contenido y comentarios por usuario autenticado

## Estados de orden usados

- pending_payment
- approved
- paid
- shipped
- cancelled
- whatsapp_pending_validation (compatibilidad)
