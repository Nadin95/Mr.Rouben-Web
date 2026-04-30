# API Reference

## Auth

- POST /api/auth/register
  - body: username, email, password, phone, marketingOptIn?
- POST /api/auth/login
  - body: email, password
- POST /api/auth/logout
- GET /api/auth/verify-email?token=...
- POST /api/auth/resend-verification
  - body: email

## Productos

- GET /api/products
- GET /api/products?category=Tabaco|Vapers|Parafernalia
- GET /api/products/featured
- POST /api/products (admin)
- DELETE /api/products/:productId (admin)

## Foro

- GET /api/forum
- POST /api/forum (auth)
- POST /api/forum/:postId/comments (auth)

## Órdenes

- POST /api/orders (auth)
  - body:
    - customerPhone
    - items: [{ productId, quantity }]

Respuesta esperada:

- 201 con order y message
- 401 si no autenticado
- 403 si email no verificado
- 409 si stock insuficiente

## Admin

- GET /admin (vista protegida)
- PATCH /admin/inventory/:productId
- PATCH /admin/payments/:orderId/validate
- POST /admin/catalog/add
- POST /admin/catalog/:productId/delete
- POST /admin/inventory/:productId
- POST /admin/payments/:orderId/approve
