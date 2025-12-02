# Documentación de Integración: Sistema Hotelero + Sistema de Facturación SRI

## Descripción General

Este documento describe cómo integrar el sistema de facturación electrónica SRI con un sistema de gestión hotelera (como TroncalInn) para generar facturas automáticamente cuando los huéspedes hacen checkout.

## Arquitectura

```
Sistema Hotelero → Backend API → Sistema Facturación → SRI
                                         ↓
                                  Factura PDF/XML
```

## Configuración Inicial

### 1. Variables de Entorno

Copia el archivo `.env.example` a `.env.local` y configura las siguientes variables:

```env
# URL del backend del sistema hotelero
VITE_HOTEL_API_URL=https://tu-backend-hotelero.com/api

# API Key para autenticación
VITE_HOTEL_API_KEY=tu-api-key-secreta

# Habilitar integración
VITE_HOTEL_INTEGRATION_ENABLED=true

# Generar factura automáticamente
VITE_AUTO_GENERATE_INVOICE=true

# Enviar email al huésped
VITE_SEND_EMAIL_TO_GUEST=true

# Método de pago por defecto (01=Efectivo, 20=Otros)
VITE_DEFAULT_PAYMENT_METHOD=20
```

### 2. Configurar Firma Electrónica

Antes de usar la integración, asegúrate de configurar la firma electrónica en la sección de Configuración del sistema.

## Uso desde el Sistema Hotelero

### Opción 1: Redirección con Parámetros URL

Cuando un huésped hace checkout, redirige al sistema de facturación con el ID del checkout:

```javascript
// En tu sistema hotelero
const checkoutId = "CHK-12345";
const facturacionUrl = `http://localhost:5173/#/hotel-invoice?checkoutId=${checkoutId}`;

// Abrir en nueva ventana o iframe
window.open(facturacionUrl, '_blank');
```

### Opción 2: API REST (Recomendado)

Llama al endpoint del sistema de facturación para generar la factura programáticamente:

```javascript
// POST /api/invoices/from-checkout
const response = await fetch('http://localhost:5173/api/invoices/from-checkout', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_API_KEY'
  },
  body: JSON.stringify({
    checkoutId: "CHK-12345",
    guest: {
      identificationType: "05", // Cédula
      identification: "1234567890",
      name: "Juan Pérez",
      email: "juan@example.com",
      address: "Av. Principal 123",
      phone: "0999999999"
    },
    services: [
      {
        code: "HAB-001",
        description: "Habitación Doble - 3 noches",
        quantity: 3,
        unitPrice: 80.00,
        discount: 0,
        taxRate: 12,
        category: "ROOM"
      },
      {
        code: "REST-001",
        description: "Desayuno Buffet",
        quantity: 6,
        unitPrice: 8.00,
        discount: 0,
        taxRate: 12,
        category: "FOOD"
      }
    ],
    paymentMethod: "20",
    checkoutDate: "02/12/2024",
    additionalInfo: {
      reservationNumber: "RES-789",
      roomNumber: "205",
      nights: 3
    }
  })
});

const result = await response.json();
console.log(result);
// {
//   success: true,
//   invoice: {
//     claveAcceso: "0212202401179001234500110010010000000011234567813",
//     numeroAutorizacion: "0212202412345678901234567890123456789012345678",
//     fechaAutorizacion: "2024-12-02T12:30:45",
//     secuencial: "000000001",
//     pdfUrl: "/invoices/0212202401179001234500110010010000000011234567813.pdf",
//     xmlUrl: "/invoices/0212202401179001234500110010010000000011234567813.xml",
//     importeTotal: 268.80
//   }
// }
```

## Formato de Datos

### Tipos de Identificación

| Código | Descripción |
|--------|-------------|
| `04` | RUC |
| `05` | Cédula |
| `06` | Pasaporte |
| `07` | Consumidor Final |
| `08` | Identificación del Exterior |

### Categorías de Servicios

| Categoría | Descripción |
|-----------|-------------|
| `ROOM` | Habitación |
| `FOOD` | Alimentos y bebidas |
| `SPA` | Servicios de spa |
| `LAUNDRY` | Lavandería |
| `OTHER` | Otros servicios |

### Métodos de Pago

| Código | Descripción |
|--------|-------------|
| `01` | Efectivo |
| `15` | Compensación de deudas |
| `16` | Tarjeta de débito |
| `17` | Dinero electrónico |
| `18` | Tarjeta prepago |
| `19` | Tarjeta de crédito |
| `20` | Otros con utilización del sistema financiero |
| `21` | Endoso de títulos |

### Tarifas de IVA

| Tarifa | Código |
|--------|--------|
| 0% | `0` |
| 12% | `2` |
| 15% | `4` |

## Endpoints del Backend Hotelero

Tu backend hotelero debe implementar los siguientes endpoints para que el sistema de facturación pueda comunicarse:

### GET `/api/checkouts/:checkoutId`

Obtiene los datos de un checkout específico.

**Response:**
```json
{
  "checkoutId": "CHK-12345",
  "reservationId": "RES-789",
  "guest": {
    "identificationType": "05",
    "identification": "1234567890",
    "name": "Juan Pérez",
    "email": "juan@example.com",
    "address": "Av. Principal 123",
    "phone": "0999999999"
  },
  "services": [
    {
      "code": "HAB-001",
      "description": "Habitación Doble - 3 noches",
      "quantity": 3,
      "unitPrice": 80.00,
      "discount": 0,
      "taxRate": 12,
      "category": "ROOM"
    }
  ],
  "checkInDate": "2024-11-29",
  "checkOutDate": "2024-12-02",
  "totalAmount": 268.80,
  "paymentMethod": "20",
  "status": "COMPLETED"
}
```

### POST `/api/checkouts/:checkoutId/invoice`

Recibe notificación de que la factura fue generada.

**Request:**
```json
{
  "invoiceNumber": "000000001",
  "authorizationNumber": "0212202412345678901234567890123456789012345678",
  "pdfUrl": "/invoices/xxx.pdf",
  "xmlUrl": "/invoices/xxx.xml",
  "status": "AUTORIZADO"
}
```

### POST `/api/invoices/send-email`

Envía el PDF de la factura por email al huésped.

**Request:**
```json
{
  "email": "juan@example.com",
  "pdfUrl": "/invoices/xxx.pdf",
  "guestName": "Juan Pérez"
}
```

## Flujo Completo

1. **Checkout en el Hotel**: El huésped completa su estadía y hace checkout
2. **Solicitud de Factura**: El sistema hotelero envía los datos al sistema de facturación
3. **Generación de XML**: Se genera el XML según formato SRI
4. **Firma Digital**: Se firma el documento con la firma electrónica
5. **Envío al SRI**: Se envía para autorización
6. **Autorización**: El SRI autoriza el documento
7. **Generación de RIDE**: Se genera el PDF (Representación Impresa)
8. **Notificación**: Se notifica al sistema hotelero
9. **Email al Huésped**: Se envía la factura por email (opcional)

## Manejo de Errores

### Errores Comunes

| Error | Causa | Solución |
|-------|-------|----------|
| `FIRMA_INVALIDA` | Firma electrónica incorrecta | Verificar certificado P12 y contraseña |
| `RUC_NO_COINCIDE` | RUC del certificado no coincide | Usar certificado correcto |
| `CLAVE_ACCESO_INVALIDA` | Error en cálculo de clave | Verificar datos del emisor |
| `SECUENCIAL_DUPLICADO` | Número secuencial ya usado | Incrementar secuencial |

### Respuesta de Error

```json
{
  "success": false,
  "error": {
    "code": "FIRMA_INVALIDA",
    "message": "La firma electrónica no es válida",
    "details": "El certificado ha expirado"
  }
}
```

## Ejemplo de Integración Completa

```typescript
// En tu sistema hotelero (frontend)
async function handleCheckout(checkoutId: string) {
  try {
    // 1. Completar checkout en tu sistema
    await completeCheckout(checkoutId);
    
    // 2. Solicitar generación de factura
    const invoice = await generateInvoice(checkoutId);
    
    // 3. Mostrar factura al usuario
    showInvoice(invoice.pdfUrl);
    
    // 4. Enviar email (opcional, puede ser automático)
    if (confirm('¿Enviar factura por email?')) {
      await sendInvoiceEmail(invoice);
    }
    
  } catch (error) {
    console.error('Error al generar factura:', error);
    alert('No se pudo generar la factura. Por favor contacte a soporte.');
  }
}

async function generateInvoice(checkoutId: string) {
  const response = await fetch(`${FACTURACION_API}/invoices/from-checkout`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`
    },
    body: JSON.stringify({
      checkoutId,
      // ... datos del checkout
    })
  });
  
  if (!response.ok) {
    throw new Error('Error al generar factura');
  }
  
  return await response.json();
}
```

## Seguridad

### Autenticación

Todas las solicitudes deben incluir un API Key en el header:

```
Authorization: Bearer YOUR_API_KEY
```

### CORS

Configura CORS en el sistema de facturación para permitir solicitudes desde tu dominio hotelero:

```javascript
// vite.config.ts
server: {
  cors: {
    origin: ['https://troncalinn-frontend.onrender.com'],
    credentials: true
  }
}
```

## Soporte

Para problemas o preguntas sobre la integración, contacta al equipo de desarrollo.
