# Operación y Backoffice

## Alta de administrador

Ejecutar:

```bash
npm run seed:nadine
```

Credenciales iniciales:

- email: nadine@mrrouben.com
- password: Nadine1234!

## Cargar catálogo demo

```bash
npm run seed:demo
```

## Gestión diaria desde /admin

1. Agregar nuevos productos.
2. Actualizar stock de productos existentes.
3. Eliminar productos sin reposición.
4. Aprobar pagos pendientes.

## Novedades por email

Se envían solo a usuarios:

- con isEmailVerified=true
- con marketingOptIn=true

Eventos que disparan email:

- alta de producto nuevo
- reposición (stock pasa de 0 a mayor a 0)

## Recomendaciones operativas

- Cambiar contraseña inicial de Nadine.
- Mantener respaldo periódico de MongoDB.
- Revisar logs de correo y WhatsApp diariamente.
