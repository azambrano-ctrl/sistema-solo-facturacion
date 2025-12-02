import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { Invoice, Issuer } from "../types";

export const generateRidePdf = (invoice: Invoice, issuer: Issuer) => {
  const doc = new jsPDF();
  
  // Helper for formatting currency
  const formatCurrency = (value: number) => {
    return `$ ${value.toFixed(2)}`;
  };

  // --- Header Section (Logo & Issuer Info) ---
  // Left Column: Logo & Address
  doc.setFontSize(18);
  doc.setTextColor(200, 0, 0); // SRI Red-ish placeholder
  
  // Placeholder for Logo
  doc.setDrawColor(200);
  doc.setFillColor(245, 245, 245);
  doc.roundedRect(10, 10, 85, 30, 3, 3, 'F');
  doc.setFontSize(14);
  doc.setTextColor(100);
  doc.text("LOGO", 52, 28, { align: 'center' });
  
  doc.setTextColor(0);
  
  // Issuer Details
  const leftColX = 10;
  let currentY = 50;
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text(issuer.razonSocial, leftColX, currentY);
  currentY += 6;
  
  doc.setFontSize(9);
  doc.text(issuer.nombreComercial, leftColX, currentY);
  currentY += 6;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  
  // Address handling with split text
  const dirMatrizLines = doc.splitTextToSize(`Dirección Matriz: ${issuer.dirMatriz}`, 85);
  doc.text(dirMatrizLines, leftColX, currentY);
  currentY += (dirMatrizLines.length * 4);

  const dirSucursalLines = doc.splitTextToSize(`Dirección Sucursal: ${issuer.dirEstablecimiento}`, 85);
  doc.text(dirSucursalLines, leftColX, currentY);
  currentY += (dirSucursalLines.length * 4);
  
  doc.text(`Contribuyente Especial Nro: ${issuer.contribuyenteEspecial || 'N/A'}`, leftColX, currentY);
  currentY += 5;
  doc.text(`OBLIGADO A LLEVAR CONTABILIDAD: ${issuer.obligadoContabilidad}`, leftColX, currentY);

  // --- Right Column (RUC & Authorization) ---
  const rightColX = 105;
  const rightColY = 10;
  const rightColWidth = 95;
  const rightColHeight = 85;

  doc.setDrawColor(0);
  doc.setLineWidth(0.1);
  doc.roundedRect(rightColX, rightColY, rightColWidth, rightColHeight, 3, 3);

  let rightInnerY = rightColY + 10;
  const textX = rightColX + 5;
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text(`R.U.C.: ${issuer.ruc}`, textX, rightInnerY);
  rightInnerY += 8;
  
  doc.setFontSize(14);
  doc.text("FACTURA", textX, rightInnerY);
  rightInnerY += 8;
  
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`No. ${issuer.codEstab}-${issuer.codPtoEmi}-${invoice.secuencial}`, textX, rightInnerY);
  rightInnerY += 8;
  
  doc.text("NÚMERO DE AUTORIZACIÓN", textX, rightInnerY);
  rightInnerY += 6;
  doc.setFontSize(8);
  doc.text(invoice.claveAcceso, textX, rightInnerY); 
  rightInnerY += 8;
  
  doc.setFontSize(9);
  doc.text("FECHA Y HORA DE AUTORIZACIÓN", textX, rightInnerY);
  rightInnerY += 5;
  const authDate = new Date().toLocaleString('es-EC'); 
  doc.text(authDate, textX, rightInnerY);
  rightInnerY += 7;
  
  doc.text(`AMBIENTE: ${issuer.env === '1' ? 'PRUEBAS' : 'PRODUCCIÓN'}`, textX, rightInnerY);
  rightInnerY += 6;
  
  doc.text("EMISIÓN: NORMAL", textX, rightInnerY);
  rightInnerY += 8;
  
  doc.text("CLAVE DE ACCESO", textX, rightInnerY);
  rightInnerY += 5;
  doc.setFont("courier", "normal");
  doc.setFontSize(8);
  doc.text(invoice.claveAcceso, textX, rightInnerY);
  
  // Barcode placeholder line
  doc.setLineWidth(0.5);
  doc.line(textX, rightInnerY + 3, rightColX + 90, rightInnerY + 3);


  // --- Customer Info ---
  const customerY = 105;
  doc.setDrawColor(0);
  doc.setLineWidth(0.1);
  doc.line(10, customerY - 5, 200, customerY - 5);
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  
  doc.text(`Razón Social / Nombres y Apellidos: ${invoice.customer.razonSocial}`, 10, customerY);
  doc.text(`Identificación: ${invoice.customer.identificacion}`, 145, customerY);
  
  doc.text(`Fecha Emisión: ${invoice.fechaEmision}`, 10, customerY + 6);
  doc.text(`Guía Remisión:`, 145, customerY + 6);

  // --- Items Table ---
  const tableY = customerY + 10;
  
  const tableRows = invoice.items.map(item => {
    const totalItem = (item.cantidad * item.precioUnitario) - item.descuento;
    return [
      item.codigoPrincipal,
      item.cantidad.toFixed(2),
      item.descripcion,
      item.precioUnitario.toFixed(6),
      item.descuento.toFixed(2),
      totalItem.toFixed(2)
    ];
  });

  autoTable(doc, {
    head: [["Cod. Principal", "Cant", "Descripción", "Precio Unitario", "Descuento", "Precio Total"]],
    body: tableRows,
    startY: tableY,
    theme: 'plain',
    styles: { fontSize: 8, cellPadding: 1, lineColor: 200, lineWidth: 0.1 },
    headStyles: { fillColor: [255, 255, 255], textColor: 0, fontStyle: 'bold', halign: 'center', lineWidth: 0.1, lineColor: 0 },
    columnStyles: {
        0: { cellWidth: 25 },
        1: { cellWidth: 15, halign: 'right' },
        3: { cellWidth: 25, halign: 'right' },
        4: { cellWidth: 20, halign: 'right' },
        5: { cellWidth: 25, halign: 'right' }
    },
    margin: { left: 10, right: 10 }
  });

  // --- Bottom Section: Additional Info & Totals ---
  
  // @ts-ignore
  let finalY = doc.lastAutoTable.finalY + 5;

  // --- Totals Table (Right Side) ---
  // We use autoTable here too for perfect alignment and borders
  const totalsBody = [
      ["SUBTOTAL 15%", formatCurrency(invoice.subtotal12)],
      ["SUBTOTAL 0%", formatCurrency(invoice.subtotal0)],
      ["SUBTOTAL No objeto de IVA", formatCurrency(invoice.subtotalNoObjeto)],
      ["SUBTOTAL Exento de IVA", formatCurrency(invoice.subtotalExento)],
      ["SUBTOTAL SIN IMPUESTOS", formatCurrency(invoice.subtotalSinImpuestos)],
      ["TOTAL Descuento", formatCurrency(invoice.totalDescuento)],
      ["ICE", formatCurrency(0)],
      ["IVA 15%", formatCurrency(invoice.iva12)],
      ["PROPINA", formatCurrency(invoice.propina)],
      ["VALOR TOTAL", formatCurrency(invoice.importeTotal)]
  ];

  autoTable(doc, {
      body: totalsBody,
      startY: finalY,
      theme: 'plain',
      // Only draw on the right side
      margin: { left: 135 }, 
      styles: { fontSize: 8, cellPadding: 1, lineColor: 200, lineWidth: 0.1 },
      columnStyles: {
          0: { fontStyle: 'bold', cellWidth: 45 },
          1: { halign: 'right', cellWidth: 20 }
      }
  });

  // @ts-ignore
  const totalsFinalY = doc.lastAutoTable.finalY;

  // --- Additional Info (Left Side) ---
  // Draw a box for additional info
  const infoBoxWidth = 115;
  // Estimate height based on totals table or minimum
  const infoBoxHeight = Math.max(totalsFinalY - finalY, 40);
  
  doc.setDrawColor(0);
  doc.rect(10, finalY, infoBoxWidth, infoBoxHeight);
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("Información Adicional", 15, finalY + 5);
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  
  let infoY = finalY + 12;
  
  const addInfoRow = (label: string, value: string) => {
      doc.text(label, 15, infoY);
      const splitVal = doc.splitTextToSize(value, 70);
      doc.text(splitVal, 45, infoY);
      infoY += (splitVal.length * 4) + 2;
  };

  addInfoRow("Dirección:", invoice.customer.direccion);
  addInfoRow("Email:", invoice.customer.email);
  if (invoice.customer.telefono) {
      addInfoRow("Teléfono:", invoice.customer.telefono);
  }

  // --- Payment Methods ---
  // Position below the lowest of the two previous blocks
  const paymentsY = Math.max(totalsFinalY, infoY) + 10;
  
  doc.setFont("helvetica", "bold");
  doc.text("Forma de Pago", 10, paymentsY);
  
  const paymentMap: Record<string, string> = {
      '01': 'SIN UTILIZACION DEL SISTEMA FINANCIERO',
      '15': 'COMPENSACIÓN DE DEUDAS',
      '16': 'TARJETA DE DÉBITO',
      '17': 'DINERO ELECTRÓNICO',
      '18': 'TARJETA PREPAGO',
      '19': 'TARJETA DE CRÉDITO',
      '20': 'OTROS CON UTILIZACION DEL SISTEMA FINANCIERO',
      '21': 'ENDOSO DE TÍTULOS'
  };
  
  const paymentData = [
      [paymentMap[invoice.formaPago] || 'OTROS', formatCurrency(invoice.importeTotal)]
  ];

  autoTable(doc, {
      head: [["Forma de Pago", "Valor"]],
      body: paymentData,
      startY: paymentsY + 2,
      theme: 'plain',
      styles: { fontSize: 8, lineColor: 200, lineWidth: 0.1 },
      headStyles: { fillColor: [255, 255, 255], textColor: 0, fontStyle: 'bold', lineWidth: 0.1, lineColor: 0 },
      columnStyles: {
          0: { cellWidth: 130 },
          1: { cellWidth: 60, halign: 'right' }
      },
      margin: { left: 10 }
  });

  // Save the PDF
  doc.save(`RIDE-${invoice.secuencial}.pdf`);
};