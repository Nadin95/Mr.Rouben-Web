# 🚀 Checklist: Activar Verificación de Email y JWT en Render

## ✅ PASO 1: Agregar variables de entorno en Render Dashboard

Ve a: **Render Dashboard → Tu Servicio (MR.Rouben-Web) → Environment**

Necesitas agregar/actualizar EXACTAMENTE estas variables:

### **Email con Resend** (ya tienes RESEND_API_KEY)
```
RESEND_API_KEY = [Tu API Key de Resend - YA TIENES]
EMAIL_FROM = no-reply@mrrouben.com
APP_BASE_URL = https://tu-dominio-en-render.onrender.com
```

> ⚠️ **IMPORTANTE**: Cambiar `APP_BASE_URL` con tu dominio REAL de Render
> Busca en tu panel: "Settings → Domains"

### **JWT con Issuer y Audience** (NUEVAS)
```
JWT_ISSUER = mr-rouben-api
JWT_AUDIENCE = mr-rouben-clients
```

### **Resumen de variables finales:**

| Variable | Valor | Estado |
|----------|-------|--------|
| `MONGO_URI` | (mongodb+srv://...) | ✅ Ya existe |
| `JWT_SECRET` | (tu secret) | ✅ Ya existe |
| `RESEND_API_KEY` | (tu key) | ✅ Ya existe |
| `NODE_ENV` | production | ✅ Probablemente existe |
| `EMAIL_FROM` | no-reply@mrrouben.com | ➕ **AGREGAR** |
| `APP_BASE_URL` | https://xxx.onrender.com | ➕ **AGREGAR** |
| `JWT_ISSUER` | mr-rouben-api | ➕ **AGREGAR** |
| `JWT_AUDIENCE` | mr-rouben-clients | ➕ **AGREGAR** |

---

## ✅ PASO 2: Deploy con nuevas variables

1. **Opción A (Automático):**
   - Simplemente haz `git push` a tu rama
   - Render detectará cambios y redesplegará

2. **Opción B (Manual):**
   - Ve a **Render Dashboard → Deployments**
   - Haz click en el último deployment
   - Click en **"Redeploy latest commit"**

Espera a que termine (5-10 minutos).

---

## ✅ PASO 3: Verificar la configuración

Una vez desplegado, prueba en tu terminal:

```bash
# SSH a tu servidor Render (si lo necesitas):
# O simplemente curl a tu endpoint de test

curl https://tu-app.onrender.com/api/health
```

Deberías ver que está respondiendo.

---

## ✅ PASO 4: Probar registro y email

### Test en tu máquina local (ANTES de subir a Render):

```bash
cd "/home/Andres/Documentos/Proyecto Mr.Rouben"

# Instalar deps
npm install

# Crear .env local con valores de test
cat > .env << 'EOF'
MONGO_URI=mongodb+srv://...tu_mongo...
JWT_SECRET=tu_jwt_secret
RESEND_API_KEY=tu_resend_key
APP_BASE_URL=http://localhost:3000
EMAIL_FROM=no-reply@mrrouben.com
JWT_ISSUER=mr-rouben-api
JWT_AUDIENCE=mr-rouben-clients
NODE_ENV=development
EOF

# Correr test de integraciones
npx ts-node src/scripts/testIntegrations.ts
```

**Deberías ver:**
```
✓ MongoDB connected and responsive
✓ Resend test email sent to nadine@mrrouben.com
✓ JWT token signed: ...
✓ JWT verified successfully
```

---

## ✅ PASO 5: Probar en RENDER (en la nube)

Una vez desplegado, prueba el registro:

### **Opción A: Con Postman/curl**

```bash
curl -X POST https://tu-app.onrender.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser123",
    "email": "tu-email-real@gmail.com",
    "password": "TestPass123!",
    "phone": "1234567890",
    "countryCode": "54",
    "marketingOptIn": true
  }'
```

### **Opción B: Por la web**

1. Ve a `https://tu-app.onrender.com`
2. Haz click en **"Crear cuenta"**
3. Completa el formulario
4. **Chequea tu email** - deberías recibir el email de verificación de Resend

---

## 🔍 Si algo falla:

### **❌ No recibo email de verificación:**

1. Chequea `RESEND_API_KEY` está correcta en Render
2. Verifica `APP_BASE_URL` apunte a tu dominio (sin typos)
3. Mira los **Logs de Render** (Render Dashboard → Logs)
4. Busca errores como:
   - `Resend API key invalid`
   - `Failed to send email`

**Solución:**
```
Render Dashboard → Environment → Editar RESEND_API_KEY
(Copiar exactamente desde https://resend.com/api-keys)
```

### **❌ Login no funciona / JWT inválido:**

Probablemente `JWT_ISSUER` o `JWT_AUDIENCE` no están configuradas correctamente.

**Solución:**
```
Render Dashboard → Environment
Agregar o verificar:
  JWT_ISSUER = mr-rouben-api
  JWT_AUDIENCE = mr-rouben-clients
```

### **❌ MongoDB no persiste datos:**

Si creaste un usuario pero no aparece:

```bash
# Test local
npx ts-node src/scripts/testIntegrations.ts
```

Si falla MongoDB test, revisar `MONGO_URI`.

---

## 📋 Checklist final ANTES de publicar:

- [ ] Agregué `EMAIL_FROM` en Render
- [ ] Agregué `APP_BASE_URL` con mi dominio en Render
- [ ] Agregué `JWT_ISSUER` en Render
- [ ] Agregué `JWT_AUDIENCE` en Render
- [ ] Hice deploy / redeploy en Render
- [ ] Esperé 5-10 minutos
- [ ] Probé registro en la web
- [ ] Recibí email de verificación
- [ ] Puedo hacer login con JWT

---

## 🎯 Resultado esperado:

Una vez completado:

✅ **Usuarios pueden registrarse**
✅ **Reciben email de verificación en su inbox**
✅ **Email contiene link para verificar**
✅ **JWT tokens se crean correctamente**
✅ **Datos persisten en MongoDB**
✅ **Sesiones funcionan con cookies HTTP-only**

---

## 📞 Si necesitas help:

Revisa los logs en Render:
```
Render Dashboard → Logs → Filter por: error, Resend, JWT, MongoDB
```

O ejecuta localmente:
```bash
npx ts-node src/scripts/testIntegrations.ts
```

¡Listo! 🚀
