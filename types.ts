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