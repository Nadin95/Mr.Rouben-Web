# Módulo WhatsApp (whatsapp-web.js)

## Objetivo

Automatizar pagos manuales en rubro de alto riesgo sin pasarelas externas.

## Servicio

Archivo: src/services/whatsapp.service.ts

Responsabilidades:

- Inicializar cliente WhatsApp.
- Mostrar QR de autenticación en terminal.
- Enviar:
  - instrucciones de pago al cliente
  - alerta de nueva venta a administradora
  - confirmación de pago aprobado al cliente

## Variables requeridas

- WHATSAPP_ENABLED=true|false
- WHATSAPP_ADMIN_PHONE=54911...
- BANK_TRANSFER_ALIAS=...

Si WHATSAPP_ENABLED=false, el servicio queda desactivado sin romper el flujo.

## Mensajes implementados

1. Al crear orden (pending_payment):
   - incluye ID de pedido
   - detalle de compra
   - total
   - alias de transferencia
   - instrucción de enviar comprobante
2. Alerta a administradora por pedido nuevo.
3. Confirmación final al aprobar pago desde admin.

## Flujo técnico

- Endpoint /api/orders crea orden y dispara servicio WhatsApp.
- Acción admin /admin/payments/:orderId/approve cambia estado y dispara confirmación final.

## Consideraciones

- Debe haber sesión activa del cliente de WhatsApp en el host.
- En producción conviene ejecutar esta instancia con supervisor de procesos.
- Se recomienda trazabilidad por ID de pedido en cada mensaje.
