# 🚀 Guía de Despliegue en Render

## Pasos para Desplegar el Sistema de Facturación SRI

### 1. Preparar Repositorio en GitHub

El código ya está en: `https://github.com/azambrano-ctrl/sistema-solo-facturacion.git`

### 2. Crear Servicio en Render

1. Ve a: https://dashboard.render.com
2. Clic en **"New +"** → **"Web Service"**
3. Conecta tu cuenta de GitHub si no lo has hecho
4. Selecciona el repositorio: `sistema-solo-facturacion`

### 3. Configurar el Servicio

**Configuración Básica:**
- **Name:** `sri-facturacion` (o el nombre que prefieras)
- **Region:** Oregon (US West) - o el más cercano
- **Branch:** `main`
- **Root Directory:** (dejar vacío)
- **Environment:** `Node`
- **Build Command:** `npm install && npm run build`
- **Start Command:** `npm start`

**Plan:**
- Selecciona **"Free"** (para empezar)

### 4. Variables de Entorno

Agrega las siguientes variables de entorno:

| Key | Value |
|-----|-------|
| `NODE_ENV` | `production` |
| `VITE_GEMINI_API_KEY` | Tu API Key de Google Gemini |

**Para obtener tu API Key de Gemini:**
1. Ve a: https://aistudio.google.com/app/apikey
2. Crea una nueva API Key
3. Cópiala y pégala en Render

### 5. Desplegar

1. Clic en **"Create Web Service"**
2. Render comenzará a construir y desplegar automáticamente
3. Espera 5-10 minutos para que complete el despliegue

### 6. Acceder a tu Aplicación

Una vez desplegado, Render te dará una URL como:
```
https://sri-facturacion.onrender.com
```

### 7. Configurar Certificado Digital

Una vez que accedas a la aplicación:

1. Ve a **Settings** (Configuración)
2. Sube tu certificado `.p12`
3. Ingresa la contraseña
4. Configura:
   - Ambiente: 1 (Pruebas) o 2 (Producción)
   - Establecimiento: 001
   - Punto de Emisión: 001

### 8. Configurar Datos del Emisor

En Settings, completa:
- RUC
- Razón Social
- Nombre Comercial
- Dirección
- Teléfono
- Email

## ✅ Verificación

Para verificar que todo funciona:

1. Accede a la URL de tu aplicación
2. Ve a "Nueva Factura"
3. Completa los datos de prueba
4. Genera una factura
5. Verifica que se firme y envíe al SRI correctamente

## 🔄 Actualizaciones Automáticas

Cada vez que hagas `git push` al repositorio, Render desplegará automáticamente los cambios.

## 🐛 Solución de Problemas

### Build Failed
- Verifica que los comandos de build sean correctos
- Revisa los logs en Render Dashboard

### Application Error
- Verifica que el comando start sea correcto
- Asegúrate de que el puerto sea `$PORT` (variable de Render)

### Variables de Entorno
- Asegúrate de que `VITE_GEMINI_API_KEY` esté configurada
- Las variables deben tener el prefijo `VITE_` para ser accesibles en el frontend

## 📞 Soporte

Si tienes problemas:
1. Revisa los logs en Render Dashboard
2. Verifica la documentación de Render: https://render.com/docs
3. Consulta los logs del navegador (F12 → Console)
