import React, { useRef } from 'react';
import { Save, Upload, Key, Building2, MapPin, Hash, Globe } from 'lucide-react';
import { Issuer } from '../types';

interface Props {
  issuer: Issuer;
  onUpdate: (issuer: Issuer) => void;
  onNotify: (message: string, type: 'success' | 'error') => void;
}

export const SettingsForm: React.FC<Props> = ({ issuer, onUpdate, onNotify }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleChange = (field: keyof Issuer, value: string) => {
    onUpdate({ ...issuer, [field]: value });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onUpdate({ ...issuer, signatureFile: e.target.files[0] });
      onNotify('Archivo de firma cargado correctamente', 'success');
    }
  };

  const handleSave = async () => {
    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'https://troncalinn-backend.onrender.com';

      // Convertir archivo .p12 a Base64 si existe
      let firmaP12Base64 = null;
      if (issuer.signatureFile) {
        const reader = new FileReader();
        firmaP12Base64 = await new Promise<string>((resolve, reject) => {
          reader.onload = () => {
            const base64 = (reader.result as string).split(',')[1];
            resolve(base64);
          };
          reader.onerror = reject;
          reader.readAsDataURL(issuer.signatureFile);
        });
      }

      // Enviar configuración al backend
      const response = await fetch(`${backendUrl}/api/sri-settings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          razonSocial: issuer.razonSocial,
          nombreComercial: issuer.nombreComercial,
          ruc: issuer.ruc,
          dirMatriz: issuer.dirMatriz,
          dirEstablecimiento: issuer.dirEstablecimiento,
          obligadoContabilidad: issuer.obligadoContabilidad,
          ambiente: issuer.env,
          estab: issuer.codEstab,
          ptoEmi: issuer.codPtoEmi,
          firmaP12: firmaP12Base64,
          firmaPassword: issuer.signaturePassword,
        }),
      });

      if (!response.ok) {
        throw new Error('Error al guardar configuración en el backend');
      }

      const result = await response.json();
      console.log('✅ Configuración guardada en backend:', result);

      // También guardar localmente para uso inmediato (sin el archivo File)
      const issuerToSave = {
        ruc: issuer.ruc,
        razonSocial: issuer.razonSocial,
        nombreComercial: issuer.nombreComercial,
        dirMatriz: issuer.dirMatriz,
        dirEstablecimiento: issuer.dirEstablecimiento,
        obligadoContabilidad: issuer.obligadoContabilidad,
        codEstab: issuer.codEstab,
        codPtoEmi: issuer.codPtoEmi,
        signaturePassword: issuer.signaturePassword,
        env: issuer.env,
        signatureFile: null, // No guardar el File object
        hasBackendP12: firmaP12Base64 ? true : issuer.hasBackendP12 // Marcar que hay P12 en backend
      };
      localStorage.setItem('issuer', JSON.stringify(issuerToSave));

      // Actualizar el estado del issuer para reflejar que hay P12 en backend
      onUpdate(issuerToSave);

      onNotify('Configuración guardada correctamente en el servidor', 'success');
    } catch (error) {
      console.error('❌ Error al guardar configuración:', error);
      onNotify('Error al guardar configuración. Guardado solo localmente.', 'error');

      // Fallback: guardar solo localmente (sin el archivo File)
      const issuerToSave = {
        ruc: issuer.ruc,
        razonSocial: issuer.razonSocial,
        nombreComercial: issuer.nombreComercial,
        dirMatriz: issuer.dirMatriz,
        dirEstablecimiento: issuer.dirEstablecimiento,
        obligadoContabilidad: issuer.obligadoContabilidad,
        codEstab: issuer.codEstab,
        codPtoEmi: issuer.codPtoEmi,
        signaturePassword: issuer.signaturePassword,
        env: issuer.env,
        signatureFile: null,
        hasBackendP12: false // No hay P12 en backend si falló el guardado
      };
      localStorage.setItem('issuer', JSON.stringify(issuerToSave));
    }
  };

  // Shared input class for consistency - Soft gray background, dark text
  const inputClass = "mt-1 block w-full rounded-md border-gray-300 bg-gray-50 text-gray-900 shadow-sm focus:border-sri-blue focus:ring-sri-blue sm:text-sm border p-2 placeholder-gray-400";

  return (
    <div className="space-y-6">
      <div className="bg-white shadow rounded-lg p-6 border-l-4 border-sri-blue">
        <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
          <Key className="w-6 h-6 text-sri-blue" />
          Firma Electrónica
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
            <label className="block text-sm font-medium text-gray-700 mb-2">Archivo de Firma (.p12 o .pfx)</label>
            <div className="flex items-center gap-3">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-100 transition-colors text-sm font-medium shadow-sm"
              >
                <Upload className="w-4 h-4" />
                {issuer.signatureFile ? 'Cambiar archivo' : 'Seleccionar archivo'}
              </button>
              <span className="text-sm text-gray-600 truncate max-w-xs">
                {issuer.signatureFile
                  ? issuer.signatureFile.name
                  : issuer.hasBackendP12
                    ? '✓ Archivo disponible en el servidor'
                    : 'Ningún archivo seleccionado'
                }
              </span>
            </div>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".p12,.pfx"
              className="hidden"
            />
            <p className="text-xs text-gray-500 mt-2">
              Tu firma se procesa localmente en el navegador.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña de la Firma</label>
            <input
              type="password"
              value={issuer.signaturePassword || ''}
              onChange={(e) => handleChange('signaturePassword', e.target.value)}
              className={inputClass}
              placeholder="••••••••"
            />
          </div>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
          <Building2 className="w-6 h-6 text-gray-700" />
          Datos del Emisor
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700">RUC</label>
            <input
              type="text"
              value={issuer.ruc}
              onChange={(e) => handleChange('ruc', e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Razón Social</label>
            <input
              type="text"
              value={issuer.razonSocial}
              onChange={(e) => handleChange('razonSocial', e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Nombre Comercial</label>
            <input
              type="text"
              value={issuer.nombreComercial}
              onChange={(e) => handleChange('nombreComercial', e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Obligado a llevar contabilidad</label>
            <select
              value={issuer.obligadoContabilidad}
              onChange={(e) => handleChange('obligadoContabilidad', e.target.value)}
              className={inputClass}
            >
              <option value="SI">SI</option>
              <option value="NO">NO</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700">Dirección Matriz</label>
            <div className="flex gap-2 items-center">
              <MapPin className="w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={issuer.dirMatriz}
                onChange={(e) => handleChange('dirMatriz', e.target.value)}
                className={inputClass}
              />
            </div>
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700">Dirección Establecimiento</label>
            <div className="flex gap-2 items-center">
              <MapPin className="w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={issuer.dirEstablecimiento}
                onChange={(e) => handleChange('dirEstablecimiento', e.target.value)}
                className={inputClass}
              />
            </div>
          </div>
        </div>

        <div className="mt-6 border-t pt-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Hash className="w-4 h-4" />
            Configuración de Emisión
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 flex items-center gap-2">
                <Globe className="w-3 h-3" /> Ambiente
              </label>
              <select
                value={issuer.env}
                onChange={(e) => handleChange('env', e.target.value)}
                className={inputClass}
              >
                <option value="1">PRUEBAS</option>
                <option value="2">PRODUCCIÓN</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Cod. Establecimiento</label>
              <input
                type="text"
                value={issuer.codEstab}
                onChange={(e) => handleChange('codEstab', e.target.value)}
                className={inputClass}
                maxLength={3}
                placeholder="001"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Cod. Punto Emisión</label>
              <input
                type="text"
                value={issuer.codPtoEmi}
                onChange={(e) => handleChange('codPtoEmi', e.target.value)}
                className={inputClass}
                maxLength={3}
                placeholder="001"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleSave}
          className="flex items-center gap-2 bg-sri-blue text-white px-6 py-3 rounded-lg shadow hover:bg-blue-800 transition-colors"
        >
          <Save className="w-5 h-5" />
          Guardar Configuración
        </button>
      </div>
    </div>
  );
};