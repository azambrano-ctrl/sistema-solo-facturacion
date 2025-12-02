/**
 * ENDPOINTS PARA BACKEND DE TRONCALINN
 * 
 * Estos endpoints deben implementarse en el backend del sistema hotelero
 * para permitir la integración con el sistema de facturación.
 * 
 * Ejemplos para Node.js/Express
 */

import express from 'express';
const router = express.Router();

// ============================================
// ENDPOINT 1: Obtener datos de un checkout
// ============================================

/**
 * GET /api/checkouts/:checkoutId
 * 
 * Retorna los datos completos de un checkout incluyendo
 * información del huésped y servicios consumidos
 */
router.get('/checkouts/:checkoutId', async (req, res) => {
    try {
        const { checkoutId } = req.params;

        // TODO: Obtener datos reales de tu base de datos
        // Ejemplo de consulta:
        // const checkout = await Checkout.findById(checkoutId)
        //   .populate('guest')
        //   .populate('services');

        // Datos de ejemplo - reemplazar con consulta real
        const checkout = {
            checkoutId: checkoutId,
            reservationId: "RES-789",
            guest: {
                identificationType: "05", // Cédula
                identification: "1234567890",
                name: "Juan Pérez",
                email: "juan@example.com",
                address: "Av. Principal 123, Quito",
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
                },
                {
                    code: "SPA-001",
                    description: "Masaje Relajante",
                    quantity: 1,
                    unitPrice: 45.00,
                    discount: 5.00,
                    taxRate: 12,
                    category: "SPA"
                }
            ],
            checkInDate: "2024-11-29",
            checkOutDate: "2024-12-02",
            totalAmount: 323.00,
            paymentMethod: "20", // Tarjeta de crédito
            status: "COMPLETED",
            notes: "Cliente VIP"
        };

        res.json(checkout);

    } catch (error) {
        console.error('Error al obtener checkout:', error);
        res.status(500).json({
            error: 'Error al obtener datos del checkout',
            message: error.message
        });
    }
});

// ============================================
// ENDPOINT 2: Recibir notificación de factura generada
// ============================================

/**
 * POST /api/checkouts/:checkoutId/invoice
 * 
 * Recibe notificación de que una factura fue generada
 * para un checkout específico
 */
router.post('/checkouts/:checkoutId/invoice', async (req, res) => {
    try {
        const { checkoutId } = req.params;
        const {
            invoiceNumber,
            authorizationNumber,
            pdfUrl,
            xmlUrl,
            status,
            errorMessage
        } = req.body;

        // TODO: Guardar información de factura en tu base de datos
        // Ejemplo:
        // await Checkout.findByIdAndUpdate(checkoutId, {
        //   invoice: {
        //     number: invoiceNumber,
        //     authorization: authorizationNumber,
        //     pdfUrl,
        //     xmlUrl,
        //     status,
        //     generatedAt: new Date()
        //   }
        // });

        console.log(`Factura generada para checkout ${checkoutId}:`, {
            invoiceNumber,
            authorizationNumber,
            status
        });

        // Si la factura fue autorizada, actualizar estado del checkout
        if (status === 'AUTORIZADO') {
            // TODO: Actualizar estado en base de datos
            // await Checkout.findByIdAndUpdate(checkoutId, {
            //   invoiceStatus: 'GENERATED',
            //   invoiceNumber,
            //   invoiceAuthNumber: authorizationNumber
            // });
        }

        res.json({
            success: true,
            message: 'Notificación de factura recibida correctamente'
        });

    } catch (error) {
        console.error('Error al procesar notificación de factura:', error);
        res.status(500).json({
            error: 'Error al procesar notificación',
            message: error.message
        });
    }
});

// ============================================
// ENDPOINT 3: Enviar factura por email
// ============================================

/**
 * POST /api/invoices/send-email
 * 
 * Envía la factura por email al huésped
 */
router.post('/invoices/send-email', async (req, res) => {
    try {
        const { email, pdfUrl, guestName } = req.body;

        // TODO: Implementar envío de email usando tu servicio preferido
        // Ejemplos: SendGrid, AWS SES, Nodemailer, etc.

        // Ejemplo con Nodemailer:
        // const transporter = nodemailer.createTransport({
        //   host: process.env.SMTP_HOST,
        //   port: process.env.SMTP_PORT,
        //   auth: {
        //     user: process.env.SMTP_USER,
        //     pass: process.env.SMTP_PASS
        //   }
        // });

        // await transporter.sendMail({
        //   from: '"TroncalInn" <noreply@troncalinn.com>',
        //   to: email,
        //   subject: 'Su Factura Electrónica - TroncalInn',
        //   html: `
        //     <h2>Estimado/a ${guestName},</h2>
        //     <p>Gracias por su estadía en TroncalInn.</p>
        //     <p>Adjunto encontrará su factura electrónica.</p>
        //     <p>Puede descargarla desde: <a href="${pdfUrl}">Descargar Factura</a></p>
        //     <br>
        //     <p>Esperamos verle pronto.</p>
        //     <p>Equipo TroncalInn</p>
        //   `,
        //   attachments: [
        //     {
        //       filename: 'factura.pdf',
        //       path: pdfUrl
        //     }
        //   ]
        // });

        console.log(`Email enviado a ${email} para ${guestName}`);

        res.json({
            success: true,
            message: 'Email enviado correctamente'
        });

    } catch (error) {
        console.error('Error al enviar email:', error);
        res.status(500).json({
            error: 'Error al enviar email',
            message: error.message
        });
    }
});

// ============================================
// ENDPOINT 4 (OPCIONAL): Obtener configuración de facturación
// ============================================

/**
 * GET /api/settings/invoicing
 * 
 * Retorna la configuración del hotel para facturación
 */
router.get('/settings/invoicing', async (req, res) => {
    try {
        // TODO: Obtener configuración de tu base de datos
        const settings = {
            ruc: "1790012345001",
            razonSocial: "TRONCALINN S.A.",
            nombreComercial: "TRONCALINN",
            dirMatriz: "Av. Principal 123, Quito",
            dirEstablecimiento: "Av. Principal 123, Quito",
            obligadoContabilidad: "SI",
            codEstab: "001",
            codPtoEmi: "001",
            env: "1" // 1=Pruebas, 2=Producción
        };

        res.json(settings);

    } catch (error) {
        console.error('Error al obtener configuración:', error);
        res.status(500).json({
            error: 'Error al obtener configuración',
            message: error.message
        });
    }
});

// ============================================
// MIDDLEWARE DE AUTENTICACIÓN
// ============================================

/**
 * Middleware para validar API Key
 * Agregar a las rutas que requieran autenticación
 */
function validateApiKey(req, res, next) {
    const apiKey = req.headers.authorization?.replace('Bearer ', '');

    // TODO: Validar contra tu base de datos o variable de entorno
    const validApiKey = process.env.FACTURACION_API_KEY;

    if (!apiKey || apiKey !== validApiKey) {
        return res.status(401).json({
            error: 'No autorizado',
            message: 'API Key inválida o no proporcionada'
        });
    }

    next();
}

// Aplicar middleware a las rutas
// router.use(validateApiKey);

export default router;
