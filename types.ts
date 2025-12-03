export enum DocumentType {
  FACTURA = '01',
  NOTA_CREDITO = '04',
  NOTA_DEBITO = '05',
  GUIA_REMISION = '06',
  RETENCION = '07'
}

export enum IdentificationType {
  RUC = '04',
  CEDULA = '05',
  PASAPORTE = '06',
  CONSUMIDOR_FINAL = '07',
  EXTERIOR = '08'
}

export enum ReceiptStatus {
  RECIBIDA = 'RECIBIDA',
  DEVUELTA = 'DEVUELTA'
}

export interface Issuer {
  ruc: string;
  razonSocial: string;
  nombreComercial: string;
  dirMatriz: string;
  dirEstablecimiento: string;
  contribuyenteEspecial?: string;
  obligadoContabilidad: 'SI' | 'NO';
  codEstab: string; // 001
  codPtoEmi: string; // 001
  signatureFile?: File | null;
  signaturePassword?: string;
  env: '1' | '2'; // 1: Pruebas, 2: Producción
  hasBackendP12?: boolean; // Indicates if P12 file is stored in backend
}

export interface Customer {
  tipoIdentificacion: IdentificationType;
  identificacion: string;
  razonSocial: string;
  direccion: string;
  email: string;
  telefono?: string;
}

export interface InvoiceItem {
  id: string;
  codigoPrincipal: string;
  descripcion: string;
  cantidad: number;
  precioUnitario: number;
  descuento: number;
  impuestoCode: string; // 2 for IVA
  impuestoPorcentajeCode: string; // 2 for 12%, 0 for 0%
  impuestoTarifa: number;
}

export interface Invoice {
  id: string;
  fechaEmision: string; // DD/MM/YYYY
  secuencial: string; // 9 digits
  claveAcceso: string;
  customer: Customer;
  items: InvoiceItem[];
  subtotal12: number;
  subtotal0: number;
  subtotalNoObjeto: number;
  subtotalExento: number;
  subtotalSinImpuestos: number;
  totalDescuento: number;
  iva12: number;
  propina: number;
  importeTotal: number;
  formaPago: string; // 01 for cash, 20 for others
  estado: 'BORRADOR' | 'FIRMADO' | 'ENVIADO' | 'AUTORIZADO' | 'RECHAZADO';
}

export interface SriError {
  identificador: string;
  mensaje: string;
  tipo: string;
  informacionAdicional?: string;
}

export interface SriAuthorization {
  estado: string;
  numeroAutorizacion?: string;
  fechaAutorizacion?: string;
  ambiente?: string;
  comprobante?: string;
  mensajes: SriError[];
}

export interface SriResponse {
  estado: string;
  claveAccesoConsultada?: string;
  numeroComprobantes?: string;
  autorizaciones?: SriAuthorization[];
}

// ============================================
// TIPOS PARA INTEGRACIÓN CON SISTEMA HOTELERO
// ============================================

/**
 * Información del huésped del hotel
 */
export interface HotelGuest {
  identificationType: IdentificationType;
  identification: string;
  name: string;
  email: string;
  address: string;
  phone?: string;
}

/**
 * Servicio consumido en el hotel (habitación, restaurante, spa, etc.)
 */
export interface HotelService {
  code: string;
  description: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  taxRate: number; // 0, 12, 15, etc.
  category?: 'ROOM' | 'FOOD' | 'SPA' | 'LAUNDRY' | 'OTHER';
}

/**
 * Datos del checkout del hotel
 */
export interface HotelCheckout {
  checkoutId: string;
  reservationId: string;
  guest: HotelGuest;
  services: HotelService[];
  checkInDate: string;
  checkOutDate: string;
  totalAmount: number;
  paymentMethod: string; // '01' = efectivo, '20' = otros
  status: 'PENDING' | 'COMPLETED' | 'CANCELLED';
  notes?: string;
}

/**
 * Request para generar factura desde checkout hotelero
 */
export interface InvoiceRequest {
  checkoutId: string;
  guest: HotelGuest;
  services: HotelService[];
  paymentMethod: string;
  checkoutDate: string;
  additionalInfo?: {
    reservationNumber?: string;
    roomNumber?: string;
    nights?: number;
  };
}

/**
 * Respuesta de generación de factura para el hotel
 */
export interface HotelInvoiceResponse {
  success: boolean;
  invoice?: {
    claveAcceso: string;
    numeroAutorizacion: string;
    fechaAutorizacion: string;
    secuencial: string;
    pdfUrl?: string;
    xmlUrl?: string;
    importeTotal: number;
  };
  error?: {
    code: string;
    message: string;
    details?: string;
  };
}

/**
 * Configuración de integración con el hotel
 */
export interface HotelIntegrationConfig {
  enabled: boolean;
  apiUrl: string;
  apiKey: string;
  autoGenerateInvoice: boolean;
  sendEmailToGuest: boolean;
  defaultPaymentMethod: string;
}