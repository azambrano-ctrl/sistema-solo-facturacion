import { Invoice, Issuer } from '../types';

/**
 * Calculates the Modulus 11 check digit required by SRI
 */
export const generateMod11 = (digits: string): number => {
  let sum = 0;
  let factor = 2;

  // Iterate from right to left
  for (let i = digits.length - 1; i >= 0; i--) {
    sum += parseInt(digits.charAt(i), 10) * factor;
    factor = factor === 7 ? 2 : factor + 1;
  }

  const remainder = sum % 11;
  const result = 11 - remainder;

  if (result === 11) return 0;
  if (result === 10) return 1;
  return result;
};

/**
 * Generates the 49-digit Access Key (Clave de Acceso)
 */
export const generateAccessKey = (
  date: Date,
  codDoc: string,
  ruc: string,
  environment: '1' | '2', // 1: Test, 2: Prod
  establishment: string,
  emissionPoint: string,
  sequential: string,
  numericCode: string, // 8 digits
  emissionType: '1' // 1: Normal
): string => {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  const dateStr = `${day}${month}${year}`;

  const keyWithoutCheck = `${dateStr}${codDoc}${ruc}${environment}${establishment}${emissionPoint}${sequential}${numericCode}${emissionType}`;
  
  const checkDigit = generateMod11(keyWithoutCheck);
  
  return `${keyWithoutCheck}${checkDigit}`;
};

/**
 * Builds the XML structure for an Invoice (Factura v2.1.0)
 */
export const buildFacturaXML = (invoice: Invoice, issuer: Issuer): string => {
  // Helper to format numbers to 2 decimals
  const n2 = (num: number) => num.toFixed(2);
  const n6 = (num: number) => num.toFixed(6);

  // SRI V2.1.0 Structure - Validated against Anexo 1 & 8 of Ficha Técnica v2.32
  // Key changes in 2.1.0: inclusion of <pagos> as mandatory
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<factura id="comprobante" version="2.1.0">
  <infoTributaria>
    <ambiente>${issuer.env}</ambiente>
    <tipoEmision>1</tipoEmision>
    <razonSocial>${issuer.razonSocial}</razonSocial>
    <nombreComercial>${issuer.nombreComercial}</nombreComercial>
    <ruc>${issuer.ruc}</ruc>
    <claveAcceso>${invoice.claveAcceso}</claveAcceso>
    <codDoc>01</codDoc>
    <estab>${issuer.codEstab}</estab>
    <ptoEmi>${issuer.codPtoEmi}</ptoEmi>
    <secuencial>${invoice.secuencial}</secuencial>
    <dirMatriz>${issuer.dirMatriz}</dirMatriz>
  </infoTributaria>
  <infoFactura>
    <fechaEmision>${invoice.fechaEmision}</fechaEmision>
    <dirEstablecimiento>${issuer.dirEstablecimiento}</dirEstablecimiento>
    <obligadoContabilidad>${issuer.obligadoContabilidad}</obligadoContabilidad>
    <tipoIdentificacionComprador>${invoice.customer.tipoIdentificacion}</tipoIdentificacionComprador>
    <razonSocialComprador>${invoice.customer.razonSocial}</razonSocialComprador>
    <identificacionComprador>${invoice.customer.identificacion}</identificacionComprador>
    <totalSinImpuestos>${n2(invoice.subtotalSinImpuestos)}</totalSinImpuestos>
    <totalDescuento>${n2(invoice.totalDescuento)}</totalDescuento>
    <totalConImpuestos>
      <totalImpuesto>
        <codigo>2</codigo>
        <codigoPorcentaje>4</codigoPorcentaje>
        <baseImponible>${n2(invoice.subtotal12)}</baseImponible>
        <valor>${n2(invoice.iva12)}</valor>
      </totalImpuesto>
    </totalConImpuestos>
    <propina>${n2(invoice.propina)}</propina>
    <importeTotal>${n2(invoice.importeTotal)}</importeTotal>
    <moneda>DOLAR</moneda>
    <pagos>
      <pago>
        <formaPago>${invoice.formaPago}</formaPago>
        <total>${n2(invoice.importeTotal)}</total>
      </pago>
    </pagos>
  </infoFactura>
  <detalles>
    ${invoice.items.map(item => `
    <detalle>
      <codigoPrincipal>${item.codigoPrincipal}</codigoPrincipal>
      <descripcion>${item.descripcion}</descripcion>
      <cantidad>${n6(item.cantidad)}</cantidad>
      <precioUnitario>${n6(item.precioUnitario)}</precioUnitario>
      <descuento>${n2(item.descuento)}</descuento>
      <precioTotalSinImpuesto>${n2((item.precioUnitario * item.cantidad) - item.descuento)}</precioTotalSinImpuesto>
      <impuestos>
        <impuesto>
          <codigo>2</codigo>
          <codigoPorcentaje>${item.impuestoPorcentajeCode}</codigoPorcentaje>
          <tarifa>${item.impuestoTarifa}</tarifa>
          <baseImponible>${n2((item.precioUnitario * item.cantidad) - item.descuento)}</baseImponible>
          <valor>${n2(((item.precioUnitario * item.cantidad) - item.descuento) * (item.impuestoTarifa / 100))}</valor>
        </impuesto>
      </impuestos>
    </detalle>`).join('')}
  </detalles>
  <infoAdicional>
    <campoAdicional nombre="Email">${invoice.customer.email}</campoAdicional>
    <campoAdicional nombre="Direccion">${invoice.customer.direccion}</campoAdicional>
  </infoAdicional>
</factura>`;

  return xml;
};