
import { SriResponse, ReceiptStatus } from '../types';

// URLs for SRI Web Services (Testing Environment)
// Note: Direct calls from browser usually fail due to CORS. 
// This mock implementation simulates the SRI response cycle.

export const sendReceipt = async (xml: string, env: '1' | '2'): Promise<SriResponse> => {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  // For demo purposes, we assume the receipt is always received successfully.
  // In a real production app, this would fetch the SRI WSDL endpoint via a backend proxy.
  return {
    estado: ReceiptStatus.RECIBIDA
  };
};

export const authorizeReceipt = async (accessKey: string, env: '1' | '2'): Promise<SriResponse> => {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Simulate successful authorization
    return {
        estado: 'AUTORIZADO',
        claveAccesoConsultada: accessKey,
        numeroComprobantes: '1',
        autorizaciones: [
            {
                estado: 'AUTORIZADO',
                numeroAutorizacion: accessKey,
                fechaAutorizacion: new Date().toISOString(),
                ambiente: env === '1' ? 'PRUEBAS' : 'PRODUCCION',
                comprobante: 'XML_SIGNED_CONTENT',
                mensajes: []
            }
        ]
    };
};
