// src/admin/layout/AdminLayout.jsx
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { useAuth } from '../auth/AuthContext';
import {
  ClipboardList,
  Settings,
  LogOut,
  Users,
  Pizza,
  LayoutDashboard,
} from 'lucide-react';

export default function AdminLayout() {
  const { userProfile } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('❌ Error al cerrar sesión:', error);
      }
    } catch (err) {
      console.error('💥 Error inesperado al cerrar sesión:', err);
    } finally {
      navigate('/login', { replace: true });
    }
  };

  const linkClasses = ({ isActive }) =>
    `flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition
    ${
      isActive
        ? 'bg-orange-100 text-orange-800 dark:bg-orange-500/15 dark:text-orange-100'
        : 'text-slate-700 hover:text-slate-900 hover:bg-slate-200/50 dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-800/60'
    }`;

  return (
    <div className="h-screen flex bg-slate-100 text-slate-900 dark:bg-slate-950 dark:text-slate-100 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 flex-shrink-0 
        bg-white border-r border-slate-200 
        dark:bg-slate-950 dark:border-slate-800 
        flex flex-col shadow-sm dark:shadow-none"
      >
        <div className="px-4 pt-4 pb-3 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-orange-500 to-amber-400 flex items-center justify-center">
              <Pizza className="w-5 h-5 text-slate-950" />
            </div>

            <div>
              <h2 className="font-semibold text-base leading-tight text-slate-900 dark:text-slate-100">
                ZaHub Admin
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {userProfile
                  ? `${userProfile.nombre} · ${userProfile.rol}`
                  : 'Administrador'}
              </p>
            </div>
          </div>

          <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-500 italic">
            El algoritmo del antojo perfecto 🍕
          </p>
        </div>

        {/* navegación */}
        <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
          <NavLink to="/admin/dashboard" className={linkClasses} end>
            <LayoutDashboard className="w-4 h-4" />
            <span>Dashboard</span>
          </NavLink>

          <NavLink to="/admin/pedidos" className={linkClasses}>
            <ClipboardList className="w-4 h-4" />
            <span>Pedidos</span>
          </NavLink>

          <NavLink to="/admin/usuarios" className={linkClasses}>
            <Users className="w-4 h-4" />
            <span>Usuarios</span>
          </NavLink>

          <NavLink to="/admin/ingredientes" className={linkClasses}>
            <ClipboardList className="w-4 h-4" />
            <span>Ingredientes</span>
          </NavLink>

          <NavLink to="/admin/pizzas" className={linkClasses}>
            <Pizza className="w-4 h-4" />
            <span>Pizzas</span>
          </NavLink>
        </nav>

        {/* zona inferior fija */}
        <div className="p-3 border-t border-slate-200 dark:border-slate-800">
          <NavLink to="/admin/configuracion" className={linkClasses}>
            <Settings className="w-4 h-4" />
            <span>Configuración</span>
          </NavLink>

          <button
            onClick={handleLogout}
            className="mt-3 flex items-center justify-center gap-2 
              bg-slate-200 hover:bg-slate-300 text-xs text-slate-700 
              dark:bg-slate-900 dark:hover:bg-slate-800 dark:text-slate-200 
              py-2 rounded-lg transition w-full border 
              border-slate-300 dark:border-slate-700/70"
          >
            <LogOut className="w-4 h-4" />
            <span>Cerrar sesión</span>
          </button>
        </div>
      </aside>

      {/* Contenido principal */}
      <main className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-950">
        <div className="max-w-6xl mx-auto px-6 py-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}