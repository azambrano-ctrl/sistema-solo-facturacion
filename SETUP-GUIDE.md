# Guía de Configuración e Implementación

## Paso 1: Configurar Variables de Entorno

### 1.1 Crear archivo .env.local

Como el archivo `.env.local` está protegido por `.gitignore` (correcto para seguridad), debes crearlo manualmente:

```bash
# En la raíz del proyecto de facturación
cp .env.example .env.local
```

### 1.2 Editar .env.local

Abre el archivo `.env.local` y configura las siguientes variables:

```env
# Ambiente SRI (1=Pruebas, 2=Producción)
VITE_SRI_ENVIRONMENT=1

# URL del backend de TroncalInn
VITE_HOTEL_API_URL=https://troncalinn-backend.onrender.com/api

# API Key para autenticación
# IMPORTANTE: Genera una API Key segura
VITE_HOTEL_API_KEY=tu_api_key_segura_aqui

# Habilitar integración
VITE_HOTEL_INTEGRATION_ENABLED=true

# Generar factura automáticamente
VITE_AUTO_GENERATE_INVOICE=true

# Enviar email al huésped
VITE_SEND_EMAIL_TO_GUEST=true

# Método de pago por defecto (20=Tarjeta)
VITE_DEFAULT_PAYMENT_METHOD=20
```

### 1.3 Generar API Key Segura

Puedes generar una API Key segura con este comando:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## Paso 2: Implementar Endpoints en Backend de TroncalInn

### 2.1 Archivos de Referencia

He creado un archivo de ejemplo con todos los endpoints necesarios:

📄 [backend-endpoints-example.js](file:///c:/Users/User/Downloads/sri-factura-fácil(2)/backend-endpoints-example.js)

### 2.2 Endpoints Requeridos

Debes implementar estos 3 endpoints en tu backend de TroncalInn:

#### 1. GET /api/checkouts/:checkoutId
Retorna los datos de un checkout específico

```javascript
router.get('/checkouts/:checkoutId', async (req, res) => {
  const checkout = await obtenerCheckout(req.params.checkoutId);
  res.json(checkout);
});
```

#### 2. POST /api/checkouts/:checkoutId/invoice
Recibe notificación de factura generada

```javascript
router.post('/checkouts/:checkoutId/invoice', async (req, res) => {
  await guardarFactura(req.params.checkoutId, req.body);
  res.json({ success: true });
});
```

#### 3. POST /api/invoices/send-email
Envía factura por email al huésped

```javascript
router.post('/invoices/send-email', async (req, res) => {
  await enviarEmail(req.body.email, req.body.pdfUrl);
  res.json({ success: true });
});
```

### 2.3 Autenticación

Agrega middleware de autenticación para validar la API Key:

```javascript
function validateApiKey(req, res, next) {
  const apiKey = req.headers.authorization?.replace('Bearer ', '');
  if (apiKey !== process.env.FACTURACION_API_KEY) {
    return res.status(401).json({ error: 'No autorizado' });
  }
  next();
}

router.use(validateApiKey);
```

---

## Paso 3: Configurar CORS

En tu backend de TroncalInn, permite solicitudes desde el sistema de facturación:

```javascript
// Express
const cors = require('cors');

app.use(cors({
  origin: [
    'http://localhost:5173',  // Desarrollo
    'https://tu-dominio-facturacion.com'  // Producción
  ],
  credentials: true
}));
```

---

## Paso 4: Probar la Integración

### 4.1 Ejecutar Sistema de Facturación

```bash
cd sri-factura-fácil(2)
npm run dev
```

El sistema estará en `http://localhost:5173`

### 4.2 Ejecutar Script de Pruebas

He creado un script de pruebas completo:

📄 [test-integration.js](file:///c:/Users/User/Downloads/sri-factura-fácil(2)/test-integration.js)

Para ejecutarlo:

```bash
node test-integration.js
```

### 4.3 Prueba Manual

1. **Desde el navegador:**
   ```
   http://localhost:5173/#/hotel-invoice?checkoutId=CHK-12345
   ```

2. **Desde tu sistema hotelero (JavaScript):**
   ```javascript
   const checkoutId = "CHK-12345";
   const url = `http://localhost:5173/#/hotel-invoice?checkoutId=${checkoutId}`;
   window.open(url, '_blank');
   ```

3. **Usando API REST:**
   ```bash
   curl -X POST http://localhost:5173/api/invoices/from-checkout \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer tu_api_key" \
     -d '{
       "checkoutId": "CHK-12345",
       "guest": {...},
       "services": [...]
     }'
   ```

---

## Paso 5: Verificar Funcionamiento

### Checklist de Verificación

- [ ] ✅ Variables de entorno configuradas
- [ ] ✅ Endpoints implementados en backend
- [ ] ✅ CORS configurado correctamente
- [ ] ✅ API Key configurada en ambos sistemas
- [ ] ✅ Sistema de facturación ejecutándose
- [ ] ✅ Backend de TroncalInn ejecutándose
- [ ] ✅ Prueba de obtener checkout exitosa
- [ ] ✅ Prueba de generar factura exitosa
- [ ] ✅ Notificación al hotel recibida
- [ ] ✅ Email enviado al huésped

### Logs a Revisar

1. **En el sistema de facturación (navegador):**
   - Abrir DevTools (F12)
   - Ver Console para logs
   - Ver Network para requests

2. **En el backend de TroncalInn:**
   - Revisar logs del servidor
   - Verificar requests recibidos
   - Confirmar datos guardados en BD

---

## Paso 6: Integrar en Flujo de Checkout

### En tu Sistema Hotelero (Frontend)

Cuando un huésped hace checkout, llama al sistema de facturación:

```javascript
async function handleCheckout(checkoutId) {
  try {
    // 1. Completar checkout en tu sistema
    await completarCheckout(checkoutId);
    
    // 2. Generar factura
    const factura = await generarFactura(checkoutId);
    
    // 3. Mostrar confirmación
    mostrarMensaje('Factura generada exitosamente');
    
    // 4. Opcional: Mostrar PDF
    window.open(factura.pdfUrl, '_blank');
    
  } catch (error) {
    console.error('Error:', error);
    mostrarError('No se pudo generar la factura');
  }
}

async function generarFactura(checkoutId) {
  const response = await fetch(
    `${FACTURACION_URL}/api/invoices/from-checkout`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      },
      body: JSON.stringify({
        checkoutId,
        // ... datos del checkout
      })
    }
  );
  
  return await response.json();
}
```

---

## Solución de Problemas

### Error: "No se puede conectar al backend"

**Causa:** URL incorrecta o backend no está ejecutándose

**Solución:**
1. Verificar que `VITE_HOTEL_API_URL` sea correcta
2. Confirmar que el backend esté ejecutándose
3. Revisar logs del backend

### Error: "API Key inválida"

**Causa:** API Key no coincide entre sistemas

**Solución:**
1. Verificar `VITE_HOTEL_API_KEY` en `.env.local`
2. Verificar `FACTURACION_API_KEY` en backend
3. Asegurarse de que sean idénticas

### Error: "CORS blocked"

**Causa:** CORS no configurado correctamente

**Solución:**
1. Agregar origen en configuración CORS del backend
2. Incluir `credentials: true` si usas cookies
3. Reiniciar el backend después de cambios

### Error: "Checkout no encontrado"

**Causa:** ID de checkout inválido o no existe

**Solución:**
1. Verificar que el checkout exista en la BD
2. Confirmar formato del ID
3. Revisar logs del backend

---

## Próximos Pasos

1. ✅ **Configurar .env.local** con tus credenciales reales
2. ✅ **Implementar endpoints** en backend de TroncalInn
3. ✅ **Ejecutar pruebas** con el script proporcionado
4. ✅ **Integrar en flujo** de checkout de tu sistema
5. ✅ **Probar en ambiente** de pruebas del SRI
6. ✅ **Validar facturas** en portal del SRI
7. ✅ **Desplegar a producción** cuando todo funcione

---

## Recursos

- 📄 [INTEGRATION.md](file:///c:/Users/User/Downloads/sri-factura-fácil(2)/INTEGRATION.md) - Documentación completa
- 📄 [backend-endpoints-example.js](file:///c:/Users/User/Downloads/sri-factura-fácil(2)/backend-endpoints-example.js) - Ejemplos de endpoints
- 📄 [test-integration.js](file:///c:/Users/User/Downloads/sri-factura-fácil(2)/test-integration.js) - Script de pruebas
- 📄 [README.md](file:///c:/Users/User/Downloads/sri-factura-fácil(2)/README.md) - Documentación general

---

## Soporte

Si tienes problemas durante la implementación:

1. Revisa los logs del navegador (F12 → Console)
2. Revisa los logs del backend
3. Ejecuta el script de pruebas para identificar el problema
4. Consulta la documentación de integración
