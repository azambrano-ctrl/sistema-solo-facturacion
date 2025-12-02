# Sistema de Facturación Electrónica SRI

Sistema de facturación electrónica integrado con el Servicio de Rentas Internas (SRI) de Ecuador, diseñado para integrarse con sistemas de gestión hotelera.

## Características

- ✅ Generación de facturas electrónicas según formato SRI
- ✅ Firma digital de documentos XML
- ✅ Envío y autorización automática con el SRI
- ✅ Generación de RIDE (PDF)
- ✅ Integración con sistemas hoteleros
- ✅ Soporte para ambientes de prueba y producción
- ✅ Interfaz moderna y fácil de usar

## Integración con Sistema Hotelero

Este sistema está diseñado para integrarse con sistemas de gestión hotelera como **TroncalInn**. Permite generar facturas automáticamente cuando los huéspedes hacen checkout.

### Características de Integración

- 🏨 Generación automática de facturas desde checkouts
- 📧 Envío automático de facturas por email a huéspedes
- 🔄 Sincronización bidireccional con el sistema hotelero
- 📊 Conversión automática de servicios hoteleros a items de factura
- ✉️ Notificaciones al sistema hotelero sobre estado de facturas

### Documentación de Integración

Para integrar este sistema con tu sistema hotelero, consulta la [Documentación de Integración](INTEGRATION.md).

## Instalación y Configuración

### Prerrequisitos

- Node.js 18 o superior
- npm o yarn

### 1. Instalar Dependencias

```bash
npm install
```

### 2. Configurar Variables de Entorno

Copia el archivo `.env.example` a `.env.local` y configura las variables:

```bash
cp .env.example .env.local
```

Edita `.env.local` con tus configuraciones:

```env
# Ambiente SRI (1=Pruebas, 2=Producción)
VITE_SRI_ENVIRONMENT=1

# Integración con Sistema Hotelero
VITE_HOTEL_API_URL=https://tu-backend-hotelero.com/api
VITE_HOTEL_API_KEY=tu-api-key
VITE_HOTEL_INTEGRATION_ENABLED=true
VITE_AUTO_GENERATE_INVOICE=true
VITE_SEND_EMAIL_TO_GUEST=true
```

### 3. Configurar Firma Electrónica

1. Accede a la sección **Configuración** en el sistema
2. Sube tu archivo de firma electrónica (.p12)
3. Ingresa la contraseña del certificado
4. Configura los datos del emisor (RUC, razón social, etc.)

### 4. Ejecutar el Sistema

```bash
npm run dev
```

El sistema estará disponible en `http://localhost:5173`

## Uso

### Facturación Manual

1. Accede a **Nueva Factura**
2. Ingresa los datos del cliente
3. Agrega los productos/servicios
4. Haz clic en **Generar Factura**

### Facturación desde Sistema Hotelero

El sistema puede recibir solicitudes de facturación desde tu sistema hotelero de dos formas:

#### Opción 1: URL con Parámetros

```
http://localhost:5173/#/hotel-invoice?checkoutId=CHK-12345
```

#### Opción 2: API REST

```javascript
POST /api/invoices/from-checkout
{
  "checkoutId": "CHK-12345",
  "guest": { ... },
  "services": [ ... ]
}
```

Ver [INTEGRATION.md](INTEGRATION.md) para detalles completos.

## Estructura del Proyecto

```
├── components/
│   ├── InvoiceForm.tsx          # Formulario de facturación manual
│   ├── HotelInvoiceForm.tsx     # Formulario para facturas desde hotel
│   ├── SettingsForm.tsx         # Configuración del sistema
│   └── Toast.tsx                # Notificaciones
├── services/
│   ├── sriService.ts            # Comunicación con SRI
│   ├── hotelService.ts          # Comunicación con sistema hotelero
│   └── geminiService.ts         # Servicios auxiliares
├── utils/
│   └── invoiceUtils.ts          # Utilidades para facturas
├── types.ts                     # Definiciones TypeScript
├── App.tsx                      # Componente principal
└── INTEGRATION.md               # Documentación de integración
```

## Tecnologías

- **React** + **TypeScript**: Framework y tipado
- **Vite**: Build tool
- **TailwindCSS**: Estilos
- **Lucide React**: Iconos
- **React Router**: Navegación
- **node-forge**: Firma digital
- **xml-crypto**: Firma XML

## Ambientes SRI

### Ambiente de Pruebas (1)
- URL Recepción: `https://celery.sri.gob.ec/comprobantes-electronicos-ws/RecepcionComprobantesOffline`
- URL Autorización: `https://celery.sri.gob.ec/comprobantes-electronicos-ws/AutorizacionComprobantesOffline`

### Ambiente de Producción (2)
- URL Recepción: `https://cel.sri.gob.ec/comprobantes-electronicos-ws/RecepcionComprobantesOffline`
- URL Autorización: `https://cel.sri.gob.ec/comprobantes-electronicos-ws/AutorizacionComprobantesOffline`

## Soporte

Para problemas o preguntas:
- Revisa la [Documentación de Integración](INTEGRATION.md)
- Consulta los logs del navegador (F12 → Console)
- Verifica la configuración de la firma electrónica

## Licencia

Propietario - Todos los derechos reservados
