import { HotelCheckout, InvoiceRequest, HotelInvoiceResponse } from '../types';

// Configuración de API del sistema hotelero TroncalInn
const HOTEL_API_URL = import.meta.env.VITE_HOTEL_API_URL || 'https://troncalinn-backend.onrender.com/api';
const HOTEL_API_KEY = import.meta.env.VITE_HOTEL_API_KEY || '';

/**
 * Servicio para comunicación con el backend del sistema hotelero
 */
export const hotelService = {
  /**
   * Obtiene los datos de un checkout específico
   * @param checkoutId ID del checkout en el sistema hotelero
   * @returns Datos del checkout incluyendo huésped y servicios consumidos
   */
  async getCheckoutData(checkoutId: string): Promise<HotelCheckout> {
    try {
      const response = await fetch(`${HOTEL_API_URL}/checkouts/${checkoutId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${HOTEL_API_KEY}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Error al obtener datos del checkout: ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error en getCheckoutData:', error);
      throw error;
    }
  },

  /**
   * Genera una factura desde los datos de un checkout
   * @param invoiceRequest Datos para generar la factura
   * @returns Respuesta con la factura generada y autorizada
   */
  async generateInvoiceFromCheckout(invoiceRequest: InvoiceRequest): Promise<HotelInvoiceResponse> {
    try {
      const response = await fetch(`${HOTEL_API_URL}/invoices/from-checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${HOTEL_API_KEY}`,
        },
        body: JSON.stringify(invoiceRequest),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al generar factura');
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error en generateInvoiceFromCheckout:', error);
      throw error;
    }
  },

  /**
   * Notifica al sistema hotelero que una factura fue generada exitosamente
   * @param checkoutId ID del checkout
   * @param invoiceData Datos de la factura generada
   */
  async notifyInvoiceGenerated(
    checkoutId: string,
    invoiceData: {
      invoiceNumber: string;
      authorizationNumber: string;
      pdfUrl?: string;
      xmlUrl?: string;
      status: 'AUTORIZADO' | 'RECHAZADO';
      errorMessage?: string;
    }
  ): Promise<void> {
    try {
      const response = await fetch(`${HOTEL_API_URL}/checkouts/${checkoutId}/invoice`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${HOTEL_API_KEY}`,
        },
        body: JSON.stringify(invoiceData),
      });

      if (!response.ok) {
        console.error('Error al notificar factura al hotel:', response.statusText);
      }
    } catch (error) {
      console.error('Error en notifyInvoiceGenerated:', error);
      // No lanzamos el error para no interrumpir el flujo principal
    }
  },

  /**
   * Obtiene la configuración del hotel (datos del emisor)
   * @returns Configuración del hotel para facturación
   */
  async getHotelSettings(): Promise<any> {
    try {
      const response = await fetch(`${HOTEL_API_URL}/settings/invoicing`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${HOTEL_API_KEY}`,
        },
      });

      if (!response.ok) {
        throw new Error('Error al obtener configuración del hotel');
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error en getHotelSettings:', error);
      throw error;
    }
  },

  /**
   * Envía el PDF de la factura por email al huésped
   * @param email Email del huésped
   * @param pdfUrl URL del PDF de la factura
   * @param guestName Nombre del huésped
   */
  async sendInvoiceEmail(email: string, pdfUrl: string, guestName: string): Promise<void> {
    try {
      const response = await fetch(`${HOTEL_API_URL}/invoices/send-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${HOTEL_API_KEY}`,
        },
        body: JSON.stringify({
          email,
          pdfUrl,
          guestName,
        }),
      });

      if (!response.ok) {
        console.error('Error al enviar email:', response.statusText);
      }
    } catch (error) {
      console.error('Error en sendInvoiceEmail:', error);
    }
  },
};
