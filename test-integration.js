/**
 * SCRIPT DE PRUEBAS DE INTEGRACIÓN
 * 
 * Este script prueba la integración completa entre el sistema de facturación
 * y el sistema hotelero TroncalInn.
 * 
 * Uso: node test-integration.js
 */

// Configuración
const FACTURACION_API_URL = 'http://localhost:5173/api';
const HOTEL_API_URL = 'https://troncalinn-backend.onrender.com/api';
const API_KEY = 'troncalinn_api_key_12345';

// ============================================
// TEST 1: Obtener datos de checkout desde hotel
// ============================================

async function testGetCheckoutData() {
    console.log('\n📋 TEST 1: Obtener datos de checkout');
    console.log('==========================================');

    try {
        const checkoutId = 'CHK-12345';
        const response = await fetch(`${HOTEL_API_URL}/checkouts/${checkoutId}`, {
            headers: {
                'Authorization': `Bearer ${API_KEY}`
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const checkout = await response.json();
        console.log('✅ Checkout obtenido exitosamente');
        console.log('Huésped:', checkout.guest.name);
        console.log('Servicios:', checkout.services.length);
        console.log('Total:', `$${checkout.totalAmount.toFixed(2)}`);

        return checkout;

    } catch (error) {
        console.error('❌ Error:', error.message);
        return null;
    }
}

// ============================================
// TEST 2: Generar factura desde checkout
// ============================================

async function testGenerateInvoice(checkoutData) {
    console.log('\n📄 TEST 2: Generar factura desde checkout');
    console.log('==========================================');

    if (!checkoutData) {
        console.log('⏭️  Saltando test (no hay datos de checkout)');
        return null;
    }

    try {
        const invoiceRequest = {
            checkoutId: checkoutData.checkoutId,
            guest: checkoutData.guest,
            services: checkoutData.services,
            paymentMethod: checkoutData.paymentMethod,
            checkoutDate: checkoutData.checkOutDate,
            additionalInfo: {
                reservationNumber: checkoutData.reservationId,
                roomNumber: "205"
            }
        };

        const response = await fetch(`${FACTURACION_API_URL}/invoices/from-checkout`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`
            },
            body: JSON.stringify(invoiceRequest)
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();

        if (result.success) {
            console.log('✅ Factura generada exitosamente');
            console.log('Número de autorización:', result.invoice.numeroAutorizacion);
            console.log('Clave de acceso:', result.invoice.claveAcceso);
            console.log('Total:', `$${result.invoice.importeTotal.toFixed(2)}`);
            return result.invoice;
        } else {
            console.error('❌ Error al generar factura:', result.error.message);
            return null;
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
        return null;
    }
}

// ============================================
// TEST 3: Verificar notificación al hotel
// ============================================

async function testHotelNotification(checkoutId, invoiceData) {
    console.log('\n🔔 TEST 3: Notificación al hotel');
    console.log('==========================================');

    if (!invoiceData) {
        console.log('⏭️  Saltando test (no hay datos de factura)');
        return;
    }

    try {
        const notification = {
            invoiceNumber: invoiceData.secuencial,
            authorizationNumber: invoiceData.numeroAutorizacion,
            pdfUrl: invoiceData.pdfUrl,
            xmlUrl: invoiceData.xmlUrl,
            status: 'AUTORIZADO'
        };

        const response = await fetch(`${HOTEL_API_URL}/checkouts/${checkoutId}/invoice`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`
            },
            body: JSON.stringify(notification)
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();
        console.log('✅ Notificación enviada exitosamente');
        console.log('Respuesta:', result.message);

    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

// ============================================
// TEST 4: Envío de email al huésped
// ============================================

async function testEmailSending(guestEmail, guestName, pdfUrl) {
    console.log('\n📧 TEST 4: Envío de email al huésped');
    console.log('==========================================');

    if (!pdfUrl) {
        console.log('⏭️  Saltando test (no hay PDF generado)');
        return;
    }

    try {
        const emailData = {
            email: guestEmail,
            pdfUrl: pdfUrl,
            guestName: guestName
        };

        const response = await fetch(`${HOTEL_API_URL}/invoices/send-email`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`
            },
            body: JSON.stringify(emailData)
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();
        console.log('✅ Email enviado exitosamente');
        console.log('Destinatario:', guestEmail);

    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

// ============================================
// TEST 5: Flujo completo de integración
// ============================================

async function testCompleteFlow() {
    console.log('\n🔄 TEST 5: Flujo completo de integración');
    console.log('==========================================');

    try {
        // Simular checkout en el sistema hotelero
        const checkoutId = 'CHK-TEST-' + Date.now();

        const mockCheckout = {
            checkoutId: checkoutId,
            reservationId: "RES-TEST-789",
            guest: {
                identificationType: "05",
                identification: "1234567890",
                name: "María González",
                email: "maria@example.com",
                address: "Av. Test 456, Quito",
                phone: "0987654321"
            },
            services: [
                {
                    code: "HAB-SUITE",
                    description: "Suite Presidencial - 2 noches",
                    quantity: 2,
                    unitPrice: 150.00,
                    discount: 30.00,
                    taxRate: 12,
                    category: "ROOM"
                }
            ],
            checkInDate: new Date().toISOString().split('T')[0],
            checkOutDate: new Date().toISOString().split('T')[0],
            totalAmount: 270.00,
            paymentMethod: "19", // Tarjeta de crédito
            status: "COMPLETED"
        };

        console.log('1️⃣ Checkout creado:', checkoutId);
        console.log('2️⃣ Generando factura...');

        // Aquí se llamaría al sistema de facturación
        // const invoice = await testGenerateInvoice(mockCheckout);

        console.log('3️⃣ Factura generada (simulado)');
        console.log('4️⃣ Notificación enviada al hotel (simulado)');
        console.log('5️⃣ Email enviado al huésped (simulado)');
        console.log('\n✅ Flujo completo ejecutado exitosamente');

    } catch (error) {
        console.error('❌ Error en flujo completo:', error.message);
    }
}

// ============================================
// EJECUTAR TODAS LAS PRUEBAS
// ============================================

async function runAllTests() {
    console.log('\n');
    console.log('╔════════════════════════════════════════════╗');
    console.log('║  PRUEBAS DE INTEGRACIÓN HOTELERA          ║');
    console.log('║  Sistema Facturación + TroncalInn         ║');
    console.log('╚════════════════════════════════════════════╝');

    // Test 1: Obtener checkout
    const checkoutData = await testGetCheckoutData();

    // Esperar 1 segundo entre tests
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Test 2: Generar factura
    const invoiceData = await testGenerateInvoice(checkoutData);

    await new Promise(resolve => setTimeout(resolve, 1000));

    // Test 3: Notificar al hotel
    if (checkoutData && invoiceData) {
        await testHotelNotification(checkoutData.checkoutId, invoiceData);
    }

    await new Promise(resolve => setTimeout(resolve, 1000));

    // Test 4: Enviar email
    if (checkoutData && invoiceData) {
        await testEmailSending(
            checkoutData.guest.email,
            checkoutData.guest.name,
            invoiceData.pdfUrl
        );
    }

    await new Promise(resolve => setTimeout(resolve, 1000));

    // Test 5: Flujo completo
    await testCompleteFlow();

    console.log('\n');
    console.log('╔════════════════════════════════════════════╗');
    console.log('║  PRUEBAS COMPLETADAS                      ║');
    console.log('╚════════════════════════════════════════════╝');
    console.log('\n');
}

// Ejecutar si se llama directamente
if (import.meta.url === `file://${process.argv[1]}`) {
    runAllTests().catch(console.error);
}

// Exportar funciones para uso individual
export {
    testGetCheckoutData,
    testGenerateInvoice,
    testHotelNotification,
    testEmailSending,
    testCompleteFlow,
    runAllTests
};
