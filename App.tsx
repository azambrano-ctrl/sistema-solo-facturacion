import React, { useState } from 'react';
import { MemoryRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, FileText, Settings, Menu, X } from 'lucide-react';
import { InvoiceForm } from './components/InvoiceForm';
import { SettingsForm } from './components/SettingsForm';
import { Toast } from './components/Toast';
import { Issuer } from './types';

// Helper component for Nav Links to handle active state styles
const NavLink = ({ to, icon: Icon, label, isOpen }: { to: string; icon: any; label: string; isOpen: boolean }) => {
  const location = useLocation();
  const isActive = location.pathname === to;

  return (
    <Link
      to={to}
      className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${isActive
        ? 'bg-blue-50 text-sri-blue font-medium'
        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
        }`}
    >
      <Icon size={20} />
      {isOpen && <span>{label}</span>}
    </Link>
  );
};



function App() {
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);

  // Issuer Data State
  const [issuer, setIssuer] = useState<Issuer>({
    ruc: '1790012345001',
    razonSocial: 'EMPRESA EJEMPLO S.A.',
    nombreComercial: 'MI EMPRESA',
    dirMatriz: 'Av. Amazonas y Naciones Unidas',
    dirEstablecimiento: 'Av. Amazonas y Naciones Unidas',
    obligadoContabilidad: 'SI',
    codEstab: '001',
    codPtoEmi: '001',
    signatureFile: null,
    signaturePassword: '',
    env: '1' // Default to Pruebas
  });

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
  };

  // Cargar configuración desde el backend al iniciar
  React.useEffect(() => {
    const loadConfigFromBackend = async () => {
      try {
        const backendUrl = import.meta.env.VITE_BACKEND_URL || 'https://troncalinn-backend.onrender.com';
        const response = await fetch(`${backendUrl}/api/sri-settings`);

        if (response.ok) {
          const data = await response.json();
          if (data.success && data.settings) {
            const settings = data.settings;

            // Actualizar el estado del issuer con los datos del backend
            setIssuer({
              ruc: settings.ruc || '',
              razonSocial: settings.razonSocial || '',
              nombreComercial: settings.nombreComercial || '',
              dirMatriz: settings.dirMatriz || '',
              dirEstablecimiento: settings.dirEstablecimiento || '',
              obligadoContabilidad: settings.obligadoContabilidad || 'SI',
              codEstab: settings.estab || '001',
              codPtoEmi: settings.ptoEmi || '001',
              signatureFile: null, // El archivo no se puede reconstruir desde Base64
              signaturePassword: settings.firmaPassword || '',
              env: settings.ambiente || '1'
            });

            console.log('✅ Configuración cargada desde el backend');
          }
        } else {
          console.log('ℹ️ No hay configuración guardada en el backend, usando valores por defecto');
        }
      } catch (error) {
        console.error('❌ Error al cargar configuración del backend:', error);
        console.log('ℹ️ Usando configuración por defecto');
      }
    };

    loadConfigFromBackend();
  }, []);

  return (
    <MemoryRouter>
      <div className="min-h-screen bg-gray-50 flex font-sans">

        {/* Notification Toast */}
        {toast && (
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
          />
        )}

        {/* Sidebar - Light Theme */}
        <aside className={`${isSidebarOpen ? 'w-64' : 'w-20'} bg-white border-r border-gray-200 transition-all duration-300 flex-shrink-0 flex flex-col`}>
          <div className="h-16 flex items-center justify-between px-4 border-b border-gray-100">
            {isSidebarOpen && (
              <div className="flex items-center gap-2 text-sri-blue font-bold text-lg">
                <div className="w-8 h-8 bg-sri-blue text-white rounded flex items-center justify-center text-xs">SRI</div>
                <span>Factura</span>
              </div>
            )}
            <button onClick={() => setSidebarOpen(!isSidebarOpen)} className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-md transition-colors">
              {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>

          <nav className="mt-6 px-3 space-y-1">
            <NavLink to="/" icon={LayoutDashboard} label="Dashboard" isOpen={isSidebarOpen} />
            <NavLink to="/invoice" icon={FileText} label="Nueva Factura" isOpen={isSidebarOpen} />
            <NavLink to="/settings" icon={Settings} label="Configuración" isOpen={isSidebarOpen} />
          </nav>

          {isSidebarOpen && (
            <div className="mt-auto p-4 border-t border-gray-100">
              <div className="text-xs text-gray-400 text-center">
                v1.0.0 - Facturación Electrónica
              </div>
            </div>
          )}
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-auto bg-gray-50/50">
          <header className="h-16 bg-white shadow-sm border-b border-gray-200 flex items-center px-6 justify-between sticky top-0 z-10">
            <h1 className="text-lg font-semibold text-gray-800">Sistema de Facturación</h1>
            <div className="flex items-center gap-4">
              <div className="px-3 py-1 bg-gray-100 rounded-full text-xs font-medium text-gray-600 border border-gray-200">
                {issuer.env === '1' ? 'Ambiente: PRUEBAS' : 'Ambiente: PRODUCCIÓN'}
              </div>
              <div className="text-sm text-right hidden sm:block leading-tight">
                <div className="font-semibold text-gray-900">{issuer.razonSocial}</div>
                <div className="text-gray-500 text-xs">RUC: {issuer.ruc}</div>
              </div>
              <div className="w-10 h-10 bg-gradient-to-br from-sri-blue to-blue-600 rounded-full flex items-center justify-center text-white font-bold shadow-sm ring-2 ring-white">
                {issuer.nombreComercial.substring(0, 2).toUpperCase()}
              </div>
            </div>
          </header>

          <div className="p-6 max-w-7xl mx-auto">
            <Routes>
              <Route path="/" element={
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <div className="text-gray-500 text-sm font-medium">Facturas Emitidas (Mes)</div>
                    <div className="text-3xl font-bold mt-2 text-gray-900">0</div>
                  </div>
                  <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <div className="text-gray-500 text-sm font-medium">Monto Total</div>
                    <div className="text-3xl font-bold mt-2 text-gray-900">$0.00</div>
                  </div>
                  <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <div className="text-gray-500 text-sm font-medium">Pendientes Autorización</div>
                    <div className="text-3xl font-bold mt-2 text-sri-red">0</div>
                  </div>

                  <div className="md:col-span-3 bg-white p-6 rounded-xl shadow-sm border border-gray-200 mt-2">
                    <h2 className="text-lg font-bold text-gray-900 mb-4">Acciones Rápidas</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Link to="/invoice" className="group block p-4 border border-gray-200 rounded-lg hover:border-sri-blue hover:bg-blue-50 transition-all">
                        <h3 className="font-bold text-sri-blue flex items-center gap-2 group-hover:translate-x-1 transition-transform">
                          <FileText className="w-5 h-5" /> Nueva Factura
                        </h3>
                        <p className="text-sm text-gray-600 mt-2">Generar, firmar y enviar un nuevo comprobante electrónico.</p>
                      </Link>
                      <Link to="/settings" className="group block p-4 border border-gray-200 rounded-lg hover:border-gray-400 hover:bg-gray-50 transition-all">
                        <h3 className="font-bold text-gray-800 flex items-center gap-2 group-hover:translate-x-1 transition-transform">
                          <Settings className="w-5 h-5" /> Configurar Firma
                        </h3>
                        <p className="text-sm text-gray-600 mt-2">
                          {issuer.signatureFile
                            ? <span className="text-green-600 font-medium">✓ Firma cargada: {issuer.signatureFile.name}</span>
                            : <span className="text-sri-red font-medium">⚠ Firma electrónica pendiente.</span>
                          }
                        </p>
                      </Link>
                    </div>
                  </div>
                </div>
              } />
              <Route path="/invoice" element={<InvoiceForm issuer={issuer} onNotify={showToast} />} />
              <Route path="/settings" element={<SettingsForm issuer={issuer} onUpdate={setIssuer} onNotify={showToast} />} />
            </Routes>
          </div>
        </main>
      </div>
    </MemoryRouter>
  );
}

export default App;