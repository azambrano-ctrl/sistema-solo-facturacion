import { GoogleGenAI, Type } from "@google/genai";
import { InvoiceItem, Customer, IdentificationType } from '../types';

/**
 * parses natural language text into structured invoice data
 */
export const parseInvoiceRequest = async (text: string): Promise<{ customer: Partial<Customer>, items: Partial<InvoiceItem>[] } | null> => {
  if (!process.env.API_KEY) {
    console.error("API_KEY not found");
    return null;
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const prompt = `
    You are an expert accountant for the Ecuadorian SRI system.
    Extract invoice details from the following text: "${text}".
    
    Return a JSON with:
    - customer: { razonSocial, identificacion (if found), email, direccion }
    - items: array of { descripcion, cantidad, precioUnitario }
    
    If identification is missing, leave empty.
    Assume standard 15% IVA unless specified.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            customer: {
              type: Type.OBJECT,
              properties: {
                razonSocial: { type: Type.STRING },
                identificacion: { type: Type.STRING },
                email: { type: Type.STRING },
                direccion: { type: Type.STRING },
              }
            },
            items: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  descripcion: { type: Type.STRING },
                  cantidad: { type: Type.NUMBER },
                  precioUnitario: { type: Type.NUMBER },
                }
              }
            }
          }
        }
      }
    });

    if (response.text) {
        const data = JSON.parse(response.text);
        
        // Post-process to ensure type safety/defaults
        const processedCustomer: Partial<Customer> = {
            ...data.customer,
            tipoIdentificacion: data.customer.identificacion?.length === 13 ? IdentificationType.RUC : IdentificationType.CEDULA
        };

        const processedItems: Partial<InvoiceItem>[] = data.items.map((item: any) => ({
            codigoPrincipal: 'GEN-' + Math.floor(Math.random() * 1000),
            descripcion: item.descripcion,
            cantidad: item.cantidad,
            precioUnitario: item.precioUnitario,
            descuento: 0,
            impuestoCode: '2',
            impuestoPorcentajeCode: '4', // Code 4 is 15%
            impuestoTarifa: 15
        }));

        return { customer: processedCustomer, items: processedItems };
    }
    return null;

  } catch (error) {
    console.error("Error parsing invoice with Gemini:", error);
    return null;
  }
};