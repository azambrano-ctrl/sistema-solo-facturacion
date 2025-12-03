
import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Wand2, Save, FileCode, CheckCircle, AlertCircle, Send, Loader2, FileDown } from 'lucide-react';
import { Invoice, InvoiceItem, Customer, IdentificationType, Issuer, SriResponse, ReceiptStatus } from '../types';
import { generateAccessKey, buildFacturaXML } from '../utils/sriLogic';
import { parseInvoiceRequest } from '../services/geminiService';
import { sendReceipt, authorizeReceipt } from '../services/sriService';
import { generateRidePdf } from '../utils/pdfGenerator';

interface Props {
  issuer: Issuer;
  onNotify: (message: string, type: 'success' | 'error') => void;
}

// Safe ID generator that works in all contexts (including insecure http/blob)
const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
};

export const InvoiceForm: React.FC<Props> = ({ issuer, onNotify }) => {
  const [loadingAi, setLoadingAi] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [generatedXml, setGeneratedXml] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'generating' | 'success' | 'error'>('idle');
  const [sriResponse, setSriResponse] = useState<SriResponse | null>(null);
  const [currentInvoice, setCurrentInvoice] = useState<Invoice | null>(null);

  // Initial State
  const [customer, setCustomer] = useState<Customer>({
    tipoIdentificacion: IdentificationType.CEDULA,
    identificacion: '',
    razonSocial: '',
    direccion: '',
    email: '',
    telefono: ''
  });

  const [items, setItems] = useState<InvoiceItem[]>([
    {
      id: '1',
      codigoPrincipal: '',
      descripcion: '',
      cantidad: 1,
      precioUnitario: 0,
      descuento: 0,
      impuestoCode: '2',
      impuestoPorcentajeCode: '4', // 4 = 15%
      impuestoTarifa: 15 // 15%
    }
  ]);

  // Calculations
  const subtotal = items.reduce((acc, item) => acc + (item.cantidad * item.precioUnitario), 0);
  const totalDiscount = items.reduce((acc, item) => acc + item.descuento, 0);
  const baseImponible = subtotal - totalDiscount;
  const totalIva = items.reduce((acc, item) => {
    const base = (item.cantidad * item.precioUnitario) - item.descuento;
    return acc + (base * (item.impuestoTarifa / 100));
  }, 0);
  const total = baseImponible + totalIva;

  const [paymentMethod, setPaymentMethod] = useState('20'); // Default 20 (Otros con utilización del sistema financiero)

  const handleAiGeneration = async () => {
    if (!aiPrompt.trim()) return;
    setLoadingAi(true);
    try {
      const result = await parseInvoiceRequest(aiPrompt);
      if (result) {
        if (result.customer.razonSocial) setCustomer(prev => ({ ...prev, ...result.customer }));
        if (result.items.length > 0) {
          const newItems = result.items.map((item, idx) => ({
            id: generateId() + idx,
            codigoPrincipal: item.codigoPrincipal || 'GEN',
            descripcion: item.descripcion || 'Item',
            cantidad: item.cantidad || 1,
            precioUnitario: item.precioUnitario || 0,
            descuento: 0,
            impuestoCode: '2',
            impuestoPorcentajeCode: '4', // Default to 15%
            impuestoTarifa: 15
          }));
          setItems(newItems);
          onNotify('Factura autocompletada con IA', 'success');
        }
      }
    } catch (e) {
      console.error(e);
      onNotify('Error al procesar con IA', 'error');
    } finally {
      setLoadingAi(false);
    }
  };

  const generateInvoice = () => {
    setStatus('generating');
    const today = new Date();
    // 8 digit random numeric code
    const numericCode = Math.floor(10000000 + Math.random() * 90000000).toString();
    // Should be sequential from DB in real app, using random for demo
    const nextSeq = Math.floor(1 + Math.random() * 999999999).toString().padStart(9, '0');

    const accessKey = generateAccessKey(
      today,
      '01', // Factura
      issuer.ruc,
      issuer.env, // Dynamic environment from issuer settings
      issuer.codEstab,
      issuer.codPtoEmi,
      nextSeq,
      numericCode,
      '1' // Emision normal
    );

    const invoiceData: Invoice = {
      id: generateId(),
      fechaEmision: today.toLocaleDateString('es-EC'),
      secuencial: nextSeq,
      claveAcceso: accessKey,
      customer,
      items,
      subtotal12: baseImponible, // Simplification: assuming all items are 15%
      subtotal0: 0,
      subtotalNoObjeto: 0,
      subtotalExento: 0,
      subtotalSinImpuestos: baseImponible,
      totalDescuento: totalDiscount,
      iva12: totalIva,
      propina: 0,
      importeTotal: total,
      formaPago: paymentMethod,
      estado: 'BORRADOR'
    };

    const xml = buildFacturaXML(invoiceData, issuer);
    setGeneratedXml(xml);
    setCurrentInvoice(invoiceData); // Save for PDF generation
    setStatus('success');
    onNotify('XML generado y firmado exitosamente', 'success');
  };

  const handleSendToSri = async () => {
    if (!generatedXml) return;

    setIsSending(true);
    setSriResponse(null);

    try {
      // 1. Send Receipt
      const receiptResponse = await sendReceipt(generatedXml, issuer.env);

      if (receiptResponse.estado === ReceiptStatus.RECIBIDA) {
        // 2. If received, check authorization (usually needs a delay in real prod, but direct here for demo)
        // Extract access key from XML (simple regex for demo)
        const accessKeyMatch = generatedXml.match(/<claveAcceso>(.*?)<\/claveAcceso>/);
        if (accessKeyMatch) {
          const accessKey = accessKeyMatch[1];
          const authResponse = await authorizeReceipt(accessKey, issuer.env);
          setSriResponse(authResponse);
          if (authResponse.estado === 'AUTORIZADO') {
            onNotify('Comprobante AUTORIZADO por el SRI', 'success');

            // 3. Guardar automáticamente en el backend
            try {
              const backendUrl = import.meta.env.VITE_BACKEND_URL || 'https://troncalinn-backend.onrender.com';
              const authorization = authResponse.autorizaciones?.[0];

              await fetch(`${backendUrl}/api/facturacion/invoices`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  invoiceNumber: currentInvoice?.secuencial || '',
                  secuencial: currentInvoice?.secuencial || '',
                  claveAcceso: accessKey,
                  numeroAutorizacion: authorization?.numeroAutorizacion || '',
                  fechaAutorizacion: authorization?.fechaAutorizacion || new Date().toISOString(),
                  total: currentInvoice?.importeTotal || 0,
                  clientName: customer.razonSocial,
                  clientEmail: customer.email,
                  formaPago: paymentMethod,
                  ambiente: issuer.env,
                  tipoEmision: '1',
                  estado: 'AUTORIZADO',
                  xmlContent: generatedXml,
                  xmlFirmado: generatedXml,
                  items: items,
                  sriMensaje: 'AUTORIZADO',
                }),
              });

              console.log('✅ Factura guardada automáticamente en el backend');
            } catch (backendError) {
              console.error('❌ Error al guardar en backend:', backendError);
              // No mostramos error al usuario, la factura ya está autorizada
            }
          } else {
            onNotify(`SRI: ${authResponse.estado}`, 'error');
          }
        }
      } else {
        // Handle reception error
        setSriResponse({
          claveAccesoConsultada: '',
          numeroComprobantes: '1',
          autorizaciones: [],
          estado: receiptResponse.estado // RECIBIDA or DEVUELTA
        });
        onNotify(`SRI: Comprobante ${receiptResponse.estado}`, 'error');
      }
    } catch (error) {
      console.error(error);
      onNotify('Error de comunicación con el SRI', 'error');
    } finally {
      setIsSending(false);
    }
  };

  const handleDownloadPdf = () => {
    if (currentInvoice) {
      generateRidePdf(currentInvoice, issuer);
      onNotify('PDF descargado correctamente', 'success');
    }
  };

  const addItem = () => {
    setItems([...items, {
      id: generateId(),
      codigoPrincipal: '',
      descripcion: '',
      cantidad: 1,
      precioUnitario: 0,
      descuento: 0,
      impuestoCode: '2',
      impuestoPorcentajeCode: '4', // 15%
      impuestoTarifa: 15
    }]);
  };

  const removeItem = (id: string) => {
    if (items.length > 1) {
      setItems(items.filter(i => i.id !== id));
    }
  };

  const updateItem = (id: string, field: keyof InvoiceItem, value: any) => {
    setItems(items.map(item => {
      if (item.id === id) {
        return { ...item, [field]: value };
      }
      return item;
    }));
  };

  // Common input class with light background enforced
  const inputClass = "mt-1 block w-full rounded-md border-gray-300 bg-gray-50 text-gray-900 shadow-sm focus:border-sri-blue focus:ring-sri-blue sm:text-sm border p-2 placeholder-gray-400";
  const selectClass = "mt-1 block w-full rounded-md border-gray-300 bg-gray-50 text-gray-900 shadow-sm focus:border-sri-blue focus:ring-sri-blue sm:text-sm border p-2";

  return (
    <div className="space-y-6">

      {/* AI Assistant */}
      <div className="bg-gradient-to-r from-indigo-50 to-blue-50 p-4 rounded-lg border border-indigo-100 shadow-sm">
        <h3 className="text-sm font-semibold text-indigo-800 flex items-center gap-2 mb-2">
          <Wand2 className="w-4 h-4" />
          Asistente IA Gemini
        </h3>
        <div className="flex gap-2">
          <input
            type="text"
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
            placeholder="Ej: Facturar a Juan Perez 2 laptops por $500 cada una..."
            className="flex-1 text-sm border-indigo-200 rounded-md focus:ring-indigo-500 focus:border-indigo-500 px-3 py-2 bg-white text-gray-900 placeholder-gray-400"
          />
          <button
            onClick={handleAiGeneration}
            disabled={loadingAi}
            className="bg-indigo-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-sm"
          >
            {loadingAi ? 'Procesando...' : 'Autocompletar'}
          </button>
        </div>
      </div>

      <div className="bg-white shadow-sm border border-gray-200 rounded-xl p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4 border-b border-gray-100 pb-2">Datos del Cliente</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Identificación</label>
            <div className="flex gap-2">
              <select
                value={customer.tipoIdentificacion}
                onChange={(e) => setCustomer({ ...customer, tipoIdentificacion: e.target.value as IdentificationType })}
                className="mt-1 block w-32 rounded-md border-gray-300 shadow-sm focus:border-sri-blue focus:ring-sri-blue sm:text-sm border p-2 bg-gray-50 text-gray-900"
              >
                <option value="05">Cedula</option>
                <option value="04">RUC</option>
                <option value="07">Consumidor F.</option>
              </select>
              <input
                type="text"
                value={customer.identificacion}
                onChange={(e) => setCustomer({ ...customer, identificacion: e.target.value })}
                className="mt-1 block flex-1 rounded-md border-gray-300 shadow-sm focus:border-sri-blue focus:ring-sri-blue sm:text-sm border p-2 bg-gray-50 text-gray-900 placeholder-gray-400"
                placeholder="Número de documento"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Razón Social / Nombres</label>
            <input
              type="text"
              value={customer.razonSocial}
              onChange={(e) => setCustomer({ ...customer, razonSocial: e.target.value })}
              className={inputClass}
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700">Dirección</label>
            <input
              type="text"
              value={customer.direccion}
              onChange={(e) => setCustomer({ ...customer, direccion: e.target.value })}
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Email</label>
            <input
              type="email"
              value={customer.email}
              onChange={(e) => setCustomer({ ...customer, email: e.target.value })}
              className={inputClass}
            />
          </div>
        </div>
      </div>

      <div className="bg-white shadow-sm border border-gray-200 rounded-xl p-6">
        <div className="flex justify-between items-center mb-4 border-b border-gray-100 pb-2">
          <h2 className="text-lg font-bold text-gray-900">Detalles de Factura</h2>
          <button onClick={addItem} className="text-sm text-sri-blue hover:text-blue-700 flex items-center gap-1 font-medium bg-blue-50 px-3 py-1 rounded-full transition-colors">
            <Plus className="w-4 h-4" /> Agregar Item
          </button>
        </div>

        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Código</th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-1/3">Descripción</th>
                <th className="px-3 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Cant.</th>
                <th className="px-3 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Precio Unit.</th>
                <th className="px-3 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Total</th>
                <th className="px-3 py-3"></th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {items.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-3 py-2">
                    <input
                      type="text"
                      value={item.codigoPrincipal}
                      onChange={(e) => updateItem(item.id, 'codigoPrincipal', e.target.value)}
                      className="w-full text-sm border-gray-300 rounded border p-1.5 focus:ring-1 focus:ring-sri-blue focus:border-sri-blue bg-gray-50 text-gray-900 placeholder-gray-400"
                      placeholder="COD-001"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="text"
                      value={item.descripcion}
                      onChange={(e) => updateItem(item.id, 'descripcion', e.target.value)}
                      className="w-full text-sm border-gray-300 rounded border p-1.5 focus:ring-1 focus:ring-sri-blue focus:border-sri-blue bg-gray-50 text-gray-900 placeholder-gray-400"
                      placeholder="Descripción del producto"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      min="1"
                      value={item.cantidad}
                      onChange={(e) => updateItem(item.id, 'cantidad', parseFloat(e.target.value))}
                      className="w-full text-sm border-gray-300 rounded border p-1.5 text-right focus:ring-1 focus:ring-sri-blue focus:border-sri-blue bg-gray-50 text-gray-900"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.precioUnitario}
                      onChange={(e) => updateItem(item.id, 'precioUnitario', parseFloat(e.target.value))}
                      className="w-full text-sm border-gray-300 rounded border p-1.5 text-right focus:ring-1 focus:ring-sri-blue focus:border-sri-blue bg-gray-50 text-gray-900"
                    />
                  </td>
                  <td className="px-3 py-2 text-right text-sm font-medium text-gray-900">
                    ${(item.cantidad * item.precioUnitario).toFixed(2)}
                  </td>
                  <td className="px-3 py-2 text-center">
                    <button onClick={() => removeItem(item.id)} className="text-gray-400 hover:text-red-600 transition-colors p-1">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-6 flex flex-col md:flex-row justify-between items-start gap-4">
          <div className="w-full md:w-1/2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Forma de Pago</label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className={selectClass}
            >
              <option value="01">01 - Sin utilización del sistema financiero</option>
              <option value="15">15 - Compensación de deudas</option>
              <option value="16">16 - Tarjeta de débito</option>
              <option value="17">17 - Dinero electrónico</option>
              <option value="18">18 - Tarjeta de prepago</option>
              <option value="19">19 - Tarjeta de crédito</option>
              <option value="20">20 - Otros con utilización del sistema financiero</option>
              <option value="21">21 - Endoso de títulos</option>
            </select>
          </div>

          <div className="w-full md:w-72 space-y-3 bg-gray-50 p-4 rounded-lg border border-gray-100">
            <div className="flex justify-between text-sm text-gray-600">
              <span>Subtotal</span>
              <span className="font-medium text-gray-900">${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm text-gray-600">
              <span>Descuento</span>
              <span className="font-medium text-gray-900">${totalDiscount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm text-gray-600">
              <span>IVA (15%)</span>
              <span className="font-medium text-gray-900">${totalIva.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-xl font-bold text-gray-900 border-t border-gray-200 pt-3">
              <span>TOTAL</span>
              <span>${total.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <button
          onClick={generateInvoice}
          disabled={status === 'generating'}
          className="flex items-center gap-2 bg-sri-blue text-white px-6 py-3 rounded-lg shadow-sm hover:bg-blue-800 transition-colors font-medium disabled:opacity-50"
        >
          <Save className="w-5 h-5" />
          Generar XML y Firmar
        </button>
      </div>

      {/* Generated XML & SRI Status Area */}
      {generatedXml && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* Control Panel for SRI Actions */}
          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${sriResponse?.estado === 'AUTORIZADO' ? 'bg-green-500' : sriResponse?.estado === 'DEVUELTA' ? 'bg-red-500' : 'bg-yellow-500'}`}></div>
              <span className="font-medium text-gray-700">
                Estado SRI: {sriResponse?.estado || 'PENDIENTE ENVIO'}
              </span>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleDownloadPdf}
                className="flex items-center gap-2 bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
              >
                <FileDown className="w-4 h-4" />
                Descargar RIDE (PDF)
              </button>
              <button
                onClick={handleSendToSri}
                disabled={isSending || sriResponse?.estado === 'AUTORIZADO'}
                className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {isSending ? 'Enviando...' : 'Enviar al SRI'}
              </button>
            </div>
          </div>

          {/* Authorization Messages (Errors/Success) */}
          {sriResponse && sriResponse.autorizaciones && sriResponse.autorizaciones.length > 0 && (
            <div className={`rounded-xl p-4 border ${sriResponse.estado === 'AUTORIZADO' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
              <h4 className={`font-bold ${sriResponse.estado === 'AUTORIZADO' ? 'text-green-800' : 'text-red-800'} mb-2`}>
                {sriResponse.estado === 'AUTORIZADO' ? '¡Autorización Exitosa!' : 'Errores de Autorización'}
              </h4>
              {sriResponse.autorizaciones.map((auth, idx) => (
                <div key={idx}>
                  {auth.mensajes?.map((msg, mIdx) => (
                    <div key={mIdx} className="text-sm mb-1">
                      <span className="font-semibold">{msg.mensaje}</span>: {msg.informacionAdicional}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}

          {/* XML Viewer */}
          <div className="bg-white border border-green-200 rounded-xl p-6 shadow-sm">
            <div className="flex items-center gap-2 text-green-700 font-bold text-lg mb-2">
              <CheckCircle className="w-6 h-6" />
              XML Generado (v2.1.0)
            </div>
            <p className="text-sm text-gray-600 mb-4">
              El archivo XML ha sido generado siguiendo el esquema XSD v2.1.0 del SRI.
            </p>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 overflow-x-auto shadow-inner max-h-96">
              <pre className="text-xs text-gray-700 font-mono whitespace-pre-wrap break-all">
                {generatedXml}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
