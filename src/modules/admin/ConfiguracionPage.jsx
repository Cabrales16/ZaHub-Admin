// src/admin/pages/ConfiguracionPage.jsx
import { useState } from 'react';
import { useTheme } from '../../context/ThemeContext';
import {
  Moon,
  Sun,
  Settings,
  Bell,
  ShieldCheck,
  UserCog,
  Languages,
} from 'lucide-react';
import { useAuth } from '../auth/AuthContext';

export default function ConfiguracionPage() {
  const { theme, setTheme } = useTheme();
  const isDark = theme === 'dark';
  const { userProfile } = useAuth();

  // Estados locales demo (a futuro los puedes persistir en BD o Supabase)
  const [emailPedidos, setEmailPedidos] = useState(true);
  const [emailNovedades, setEmailNovedades] = useState(false);
  const [pushEstado, setPushEstado] = useState(true);
  const [twoFactor, setTwoFactor] = useState(false);
  const [language, setLanguage] = useState('es');

  const handleThemeToggle = () => {
    setTheme(isDark ? 'light' : 'dark');
  };

  return (
    <div className="space-y-5">
      {/* Header estilo igual a otros componentes */}
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-md bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 flex items-center justify-center">
          <Settings className="w-4 h-4" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              Configuración
            </h1>
            <span className="inline-flex items-center px-2 py-[2px] rounded-full bg-slate-700/10 dark:bg-slate-700/40 text-[11px] text-slate-600 dark:text-slate-200 border border-slate-500/40">
              Preferencias del panel
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Personaliza la apariencia, notificaciones y ajustes de tu cuenta en
            ZaHub Admin.
          </p>
        </div>
      </div>

      {/* === Sección: Apariencia === */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-slate-100 dark:bg-slate-800">
            <Moon className="w-3 h-3 text-slate-500 dark:text-slate-300" />
          </span>
          Apariencia
        </h2>

        <div className="grid gap-4 md:grid-cols-2">
          {/* Modo oscuro / claro */}
          <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 flex flex-col gap-3">
            <ToggleRow
              checked={isDark}
              onChange={handleThemeToggle}
              title="Modo oscuro"
              description="Activa el modo oscuro para trabajar cómodo en ambientes con poca luz."
              icon={isDark ? Moon : Sun}
              iconClassName={
                isDark ? 'text-slate-200' : 'text-yellow-500 dark:text-yellow-400'
              }
            />
            <p className="text-[11px] text-slate-400 dark:text-slate-500">
              Tu preferencia se aplica a todo el panel de administración.
            </p>
          </div>

          {/* Idioma de la interfaz (demo) */}
          <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 flex flex-col gap-3">
            <div className="flex items-start gap-3">
              <div className="h-8 w-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                <Languages className="w-4 h-4 text-slate-500 dark:text-slate-300" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                  Idioma de la interfaz
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
                  Elige el idioma principal para los textos del panel.
                </p>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="w-full md:w-auto border border-slate-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-950 text-xs px-3 py-2 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-900/5 dark:focus:ring-slate-300/10"
                >
                  <option value="es">Español (predeterminado)</option>
                  <option value="en" disabled>
                    Inglés (próximamente)
                  </option>
                </select>
              </div>
            </div>
            <p className="text-[11px] text-slate-400 dark:text-slate-500">
              Otros idiomas estarán disponibles en futuras versiones.
            </p>
          </div>
        </div>
      </section>

      {/* === Sección: Notificaciones === */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-slate-100 dark:bg-slate-800">
            <Bell className="w-3 h-3 text-slate-500 dark:text-slate-300" />
          </span>
          Notificaciones
        </h2>

        <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 space-y-3">
          <ToggleRow
            checked={emailPedidos}
            onChange={() => setEmailPedidos((v) => !v)}
            title="Alertas por correo de nuevos pedidos"
            description="Recibe un correo cuando se cree un nuevo pedido en ZaHub."
          />

          <ToggleRow
            checked={pushEstado}
            onChange={() => setPushEstado((v) => !v)}
            title="Avisos del estado de pedidos"
            description="Muestra notificaciones en el panel cuando cambie el estado de un pedido."
          />

          <ToggleRow
            checked={emailNovedades}
            onChange={() => setEmailNovedades((v) => !v)}
            title="Boletín de novedades del sistema"
            description="Recibe un correo ocasional con mejoras, nuevas funciones y avisos importantes."
          />

          <p className="text-[11px] text-slate-400 dark:text-slate-500">
            Estos ajustes son locales por ahora. Puedes conectarlos a tu backend
            cuando definas la lógica de notificaciones.
          </p>
        </div>
      </section>

      {/* === Sección: Cuenta y seguridad === */}
      <section className="space-y-3 pb-4">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-slate-100 dark:bg-slate-800">
            <ShieldCheck className="w-3 h-3 text-slate-500 dark:text-slate-300" />
          </span>
          Cuenta y seguridad
        </h2>

        <div className="grid gap-4 md:grid-cols-2">
          {/* Info de cuenta */}
          <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 space-y-2">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                <UserCog className="w-4 h-4 text-slate-500 dark:text-slate-300" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                  Información de la cuenta
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Datos básicos del administrador actual.
                </p>
              </div>
            </div>

            <dl className="mt-3 space-y-1 text-xs">
              <div className="flex justify-between gap-3">
                <dt className="text-slate-500 dark:text-slate-400">Nombre</dt>
                <dd className="text-slate-900 dark:text-slate-100 font-medium">
                  {userProfile?.nombre ?? '—'}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-slate-500 dark:text-slate-400">Correo</dt>
                <dd className="text-slate-900 dark:text-slate-100 truncate max-w-[220px] text-right">
                  {userProfile?.email ?? '—'}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-slate-500 dark:text-slate-400">Rol</dt>
                <dd className="text-slate-900 dark:text-slate-100">
                  {userProfile?.rol ?? 'ADMIN'}
                </dd>
              </div>
            </dl>

            <button
              type="button"
              className="mt-3 inline-flex items-center justify-center rounded-md border border-slate-300 dark:border-slate-700 px-3 py-1.5 text-[11px] text-slate-700 dark:text-slate-200 hover:border-orange-500 hover:text-orange-400 transition"
            >
              Gestionar perfil (próximamente)
            </button>
          </div>

          {/* Seguridad */}
          <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 flex flex-col gap-3">
            <ToggleRow
              checked={twoFactor}
              onChange={() => setTwoFactor((v) => !v)}
              title="Autenticación en dos pasos"
              description="Añade una capa extra de seguridad usando un código adicional al iniciar sesión."
            />

            <div className="mt-2 space-y-1 text-[11px] text-slate-400 dark:text-slate-500">
              <p>
                Recomendado para cuentas con permisos de administrador o acceso
                a datos sensibles.
              </p>
              <p>
                Cuando implementes la lógica real, aquí podrías abrir un modal
                para configurar 2FA (códigos por app o correo).
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

/**
 * Fila reutilizable de configuración con toggle
 */
function ToggleRow({
  checked,
  onChange,
  title,
  description,
  icon: Icon,
  iconClassName = 'text-slate-700 dark:text-slate-200',
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="flex items-start gap-3">
        {Icon && (
          <div className="h-8 w-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
            <Icon className={`w-4 h-4 ${iconClassName}`} />
          </div>
        )}
        <div>
          <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
            {title}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {description}
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={onChange}
        className={
          'relative inline-flex h-6 w-11 items-center rounded-full transition shrink-0 ' +
          (checked ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600')
        }
      >
        <span
          className={
            'inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition ' +
            (checked ? 'translate-x-5' : 'translate-x-1')
          }
        />
      </button>
    </div>
  );
}