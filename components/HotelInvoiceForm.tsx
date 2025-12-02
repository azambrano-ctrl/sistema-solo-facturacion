import React, { useState, useEffect } from 'react';
import { Loader2, CheckCircle, XCircle, Hotel, User, CreditCard } from 'lucide-react';
import { hotelService } from '../services/hotelService';
import { sriService } from '../services/sriService';
import { HotelCheckout, Issuer, Invoice, InvoiceItem, Customer, IdentificationType } from '../types';
import { generateAccessKey, formatDate } from '../utils/invoiceUtils';

interface HotelInvoiceFormProps {
    issuer: Issuer;
    checkoutId?: string;
    onNotify: (message: string, type: 'success' | 'error') => void;
}

export const HotelInvoiceForm: React.FC<HotelInvoiceFormProps> = ({ issuer, checkoutId, onNotify }) => {
    const [loading, setLoading] = useState(false);
    const [checkout, setCheckout] = useState<HotelCheckout | null>(null);
    const [invoice, setInvoice] = useState<Invoice | null>(null);
    const [status, setStatus] = useState<'idle' | 'loading' | 'generating' | 'signing' | 'sending' | 'success' | 'error'>('idle');
    const [errorMessage, setErrorMessage] = useState('');

    useEffect(() => {
        if (checkoutId) {
            loadCheckoutData(checkoutId);
        }
    }, [checkoutId]);

    const loadCheckoutData = async (id: string) => {
        try {
            setLoading(true);
            setStatus('loading');
            const data = await hotelService.getCheckoutData(id);
            setCheckout(data);
            setStatus('idle');
        } catch (error: any) {
            setStatus('error');
            setErrorMessage(error.message || 'Error al cargar datos del checkout');
            onNotify('Error al cargar datos del checkout', 'error');
        } finally {
            setLoading(false);
        }
    };

    const generateInvoice = async () => {
        if (!checkout) {
            onNotify('No hay datos de checkout disponibles', 'error');
            return;
        }

        if (!issuer.signatureFile || !issuer.signaturePassword) {
            onNotify('Debe configurar la firma electrónica primero', 'error');
            return;
        }

        try {
            setStatus('generating');

            // Convertir datos del checkout a formato de factura
            const customer: Customer = {
                tipoIdentificacion: checkout.guest.identificationType,
                identificacion: checkout.guest.identification,
                razonSocial: checkout.guest.name,
                direccion: checkout.guest.address,
                email: checkout.guest.email,
                telefono: checkout.guest.phone,
            };

            // Convertir servicios del hotel a items de factura
            const items: InvoiceItem[] = checkout.services.map((service, index) => {
                const impuestoPorcentajeCode = service.taxRate === 12 ? '2' : service.taxRate === 15 ? '4' : '0';

                return {
                    id: `item-${index + 1}`,
                    codigoPrincipal: service.code,
                    descripcion: service.description,
                    cantidad: service.quantity,
                    precioUnitario: service.unitPrice,
                    descuento: service.discount,
                    impuestoCode: '2', // IVA
                    impuestoPorcentajeCode,
                    impuestoTarifa: service.taxRate,
                };
            });

            // Calcular totales
            let subtotal12 = 0;
            let subtotal0 = 0;
            let totalDescuento = 0;

            items.forEach(item => {
                const subtotal = item.cantidad * item.precioUnitario - item.descuento;
                totalDescuento += item.descuento;

                if (item.impuestoTarifa === 12 || item.impuestoTarifa === 15) {
                    subtotal12 += subtotal;
                } else {
                    subtotal0 += subtotal;
                }
            });

            const subtotalSinImpuestos = subtotal12 + subtotal0;
            const iva12 = subtotal12 * 0.12;
            const importeTotal = subtotalSinImpuestos + iva12;

            // Generar secuencial (aquí deberías obtenerlo de tu base de datos)
            const secuencial = '000000001'; // TODO: Implementar lógica de secuencial

            const fechaEmision = formatDate(new Date(checkout.checkOutDate));
            const claveAcceso = generateAccessKey({
                fecha: fechaEmision,
                tipoComprobante: '01',
                ruc: issuer.ruc,
                ambiente: issuer.env,
                serie: `${issuer.codEstab}${issuer.codPtoEmi}`,
                secuencial,
                codigoNumerico: '12345678',
                tipoEmision: '1',
            });

            const newInvoice: Invoice = {
                id: crypto.randomUUID(),
                fechaEmision,
                secuencial,
                claveAcceso,
                customer,
                items,
                subtotal12,
                subtotal0,
                subtotalNoObjeto: 0,
                subtotalExento: 0,
                subtotalSinImpuestos,
                totalDescuento,
                iva12,
                propina: 0,
                importeTotal,
                formaPago: checkout.paymentMethod,
                estado: 'BORRADOR',
            };

            setInvoice(newInvoice);

            // Firmar y enviar al SRI
            await signAndSendInvoice(newInvoice);

        } catch (error: any) {
            setStatus('error');
            setErrorMessage(error.message || 'Error al generar factura');
            onNotify('Error al generar factura', 'error');

            // Notificar al hotel sobre el error
            if (checkout) {
                await hotelService.notifyInvoiceGenerated(checkout.checkoutId, {
                    invoiceNumber: '',
                    authorizationNumber: '',
                    status: 'RECHAZADO',
                    errorMessage: error.message,
                });
            }
        }
    };

    const signAndSendInvoice = async (invoiceData: Invoice) => {
        try {
            setStatus('signing');

            // Aquí iría la lógica de firma y envío al SRI
            // Por ahora simularemos el proceso

            setStatus('sending');

            // Simular envío al SRI (deberías usar sriService aquí)
            await new Promise(resolve => setTimeout(resolve, 2000));

            // Simular respuesta exitosa
            const authorizationNumber = `${Date.now()}`;
            const fechaAutorizacion = new Date().toISOString();

            setStatus('success');
            onNotify('Factura generada y autorizada exitosamente', 'success');

            // Notificar al sistema hotelero
            if (checkout) {
                await hotelService.notifyInvoiceGenerated(checkout.checkoutId, {
                    invoiceNumber: invoiceData.secuencial,
                    authorizationNumber,
                    status: 'AUTORIZADO',
                    pdfUrl: `/invoices/${invoiceData.claveAcceso}.pdf`,
                    xmlUrl: `/invoices/${invoiceData.claveAcceso}.xml`,
                });

                // Enviar email al huésped si está configurado
                const sendEmail = import.meta.env.VITE_SEND_EMAIL_TO_GUEST === 'true';
                if (sendEmail && checkout.guest.email) {
                    await hotelService.sendInvoiceEmail(
                        checkout.guest.email,
                        `/invoices/${invoiceData.claveAcceso}.pdf`,
                        checkout.guest.name
                    );
                }
            }

        } catch (error: any) {
            setStatus('error');
            setErrorMessage(error.message || 'Error al firmar/enviar factura');
            throw error;
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-12">
                <Loader2 className="w-8 h-8 animate-spin text-sri-blue" />
                <span className="ml-3 text-gray-600">Cargando datos del checkout...</span>
            </div>
        );
    }

    if (!checkout && !checkoutId) {
        return (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
                <p className="text-yellow-800">No se proporcionó ID de checkout</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-gradient-to-r from-sri-blue to-blue-600 text-white rounded-xl p-6">
                <div className="flex items-center gap-3">
                    <Hotel className="w-8 h-8" />
                    <div>
                        <h2 className="text-2xl font-bold">Factura desde Checkout Hotelero</h2>
                        <p className="text-blue-100 text-sm">Checkout ID: {checkout?.checkoutId}</p>
                    </div>
                </div>
            </div>

            {/* Información del Huésped */}
            {checkout && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center gap-2 mb-4">
                        <User className="w-5 h-5 text-gray-600" />
                        <h3 className="font-bold text-gray-900">Información del Huésped</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="text-sm text-gray-500">Nombre</label>
                            <p className="font-medium text-gray-900">{checkout.guest.name}</p>
                        </div>
                        <div>
                            <label className="text-sm text-gray-500">Identificación</label>
                            <p className="font-medium text-gray-900">{checkout.guest.identification}</p>
                        </div>
                        <div>
                            <label className="text-sm text-gray-500">Email</label>
                            <p className="font-medium text-gray-900">{checkout.guest.email}</p>
                        </div>
                        <div>
                            <label className="text-sm text-gray-500">Teléfono</label>
                            <p className="font-medium text-gray-900">{checkout.guest.phone || 'N/A'}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Servicios Consumidos */}
            {checkout && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <h3 className="font-bold text-gray-900 mb-4">Servicios Consumidos</h3>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">Descripción</th>
                                    <th className="px-4 py-2 text-right text-sm font-medium text-gray-600">Cantidad</th>
                                    <th className="px-4 py-2 text-right text-sm font-medium text-gray-600">P. Unit.</th>
                                    <th className="px-4 py-2 text-right text-sm font-medium text-gray-600">Descuento</th>
                                    <th className="px-4 py-2 text-right text-sm font-medium text-gray-600">IVA</th>
                                    <th className="px-4 py-2 text-right text-sm font-medium text-gray-600">Total</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {checkout.services.map((service, index) => {
                                    const subtotal = service.quantity * service.unitPrice - service.discount;
                                    return (
                                        <tr key={index}>
                                            <td className="px-4 py-3 text-sm text-gray-900">{service.description}</td>
                                            <td className="px-4 py-3 text-sm text-gray-900 text-right">{service.quantity}</td>
                                            <td className="px-4 py-3 text-sm text-gray-900 text-right">${service.unitPrice.toFixed(2)}</td>
                                            <td className="px-4 py-3 text-sm text-gray-900 text-right">${service.discount.toFixed(2)}</td>
                                            <td className="px-4 py-3 text-sm text-gray-900 text-right">{service.taxRate}%</td>
                                            <td className="px-4 py-3 text-sm font-medium text-gray-900 text-right">${subtotal.toFixed(2)}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                            <tfoot className="bg-gray-50">
                                <tr>
                                    <td colSpan={5} className="px-4 py-3 text-right font-bold text-gray-900">Total:</td>
                                    <td className="px-4 py-3 text-right font-bold text-gray-900">${checkout.totalAmount.toFixed(2)}</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>
            )}

            {/* Estado de Generación */}
            {status !== 'idle' && (
                <div className={`rounded-xl p-6 ${status === 'success' ? 'bg-green-50 border border-green-200' :
                        status === 'error' ? 'bg-red-50 border border-red-200' :
                            'bg-blue-50 border border-blue-200'
                    }`}>
                    <div className="flex items-center gap-3">
                        {status === 'success' && <CheckCircle className="w-6 h-6 text-green-600" />}
                        {status === 'error' && <XCircle className="w-6 h-6 text-red-600" />}
                        {!['success', 'error', 'idle'].includes(status) && <Loader2 className="w-6 h-6 animate-spin text-blue-600" />}

                        <div className="flex-1">
                            <p className={`font-medium ${status === 'success' ? 'text-green-900' :
                                    status === 'error' ? 'text-red-900' :
                                        'text-blue-900'
                                }`}>
                                {status === 'loading' && 'Cargando datos del checkout...'}
                                {status === 'generating' && 'Generando factura electrónica...'}
                                {status === 'signing' && 'Firmando documento digitalmente...'}
                                {status === 'sending' && 'Enviando al SRI para autorización...'}
                                {status === 'success' && '¡Factura generada y autorizada exitosamente!'}
                                {status === 'error' && 'Error al procesar la factura'}
                            </p>
                            {status === 'error' && errorMessage && (
                                <p className="text-sm text-red-700 mt-1">{errorMessage}</p>
                            )}
                            {status === 'success' && invoice && (
                                <p className="text-sm text-green-700 mt-1">
                                    Clave de acceso: {invoice.claveAcceso}
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Botón de Acción */}
            {checkout && status === 'idle' && (
                <button
                    onClick={generateInvoice}
                    className="w-full bg-sri-blue hover:bg-blue-700 text-white font-bold py-4 px-6 rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                    <CreditCard className="w-5 h-5" />
                    Generar Factura Electrónica
                </button>
            )}
        </div>
    );
};
