// src/modules/admin/UsuariosPage.jsx
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../supabaseClient';
import {
  Users,
  Search,
  ToggleLeft,
  ToggleRight,
  Shield,
  ChevronLeft,
  ChevronRight,
  Filter,
  ChevronDown,
  XCircle,
  RotateCw,
} from 'lucide-react';

const ROLES = ['ADMIN', 'CAJERO', 'COCINA', 'REPARTIDOR', 'CLIENTE'];
const ESTADOS_USUARIO = ['TODOS', 'ACTIVOS', 'INACTIVOS'];
const ITEMS_PER_PAGE = 10;

export default function UsuariosPage() {
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [filtroRol, setFiltroRol] = useState('TODOS');
  const [filtroEstado, setFiltroEstado] = useState('TODOS');
  const [currentPage, setCurrentPage] = useState(1);

  const fetchUsuarios = async () => {
    setLoading(true);
    setErrorMsg('');

    const { data, error } = await supabase
      .from('usuarios_app')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error cargando usuarios:', error);
      setErrorMsg('No se pudieron cargar los usuarios.');
      setUsuarios([]);
    } else {
      setUsuarios(data || []);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchUsuarios();
  }, []);

  // búsqueda + filtros de rol / estado
  const usuariosFiltrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();

    return usuarios.filter((u) => {
      const nombre = u.nombre?.toLowerCase() ?? '';
      const email = u.email?.toLowerCase() ?? '';
      const matchBusqueda = !q || nombre.includes(q) || email.includes(q);

      const rolUsuario = u.rol || 'CLIENTE';
      const matchRol = filtroRol === 'TODOS' ? true : rolUsuario === filtroRol;

      let matchEstado = true;
      if (filtroEstado === 'ACTIVOS') matchEstado = !!u.activo;
      else if (filtroEstado === 'INACTIVOS') matchEstado = !u.activo;

      return matchBusqueda && matchRol && matchEstado;
    });
  }, [busqueda, usuarios, filtroRol, filtroEstado]);

  // reset página cuando cambia búsqueda, lista o filtros
  useEffect(() => {
    setCurrentPage(1);
  }, [busqueda, usuarios.length, filtroRol, filtroEstado]);

  const toggleActivo = async (usuario) => {
    const nuevoEstado = !usuario.activo;

    setUsuarios((prev) =>
      prev.map((u) =>
        u.id === usuario.id ? { ...u, activo: nuevoEstado } : u
      )
    );

    const { error } = await supabase
      .from('usuarios_app')
      .update({ activo: nuevoEstado })
      .eq('id', usuario.id);

    if (error) {
      console.error('Error cambiando estado de usuario:', error);
      alert('No se pudo cambiar el estado. Se revertirá.');
      fetchUsuarios();
    }
  };

  const cambiarRol = async (usuario, nuevoRol) => {
    setUsuarios((prev) =>
      prev.map((u) =>
        u.id === usuario.id ? { ...u, rol: nuevoRol } : u
      )
    );

    const { error } = await supabase
      .from('usuarios_app')
      .update({ rol: nuevoRol })
      .eq('id', usuario.id);

    if (error) {
      console.error('Error cambiando rol de usuario:', error);
      alert('No se pudo cambiar el rol. Se revertirá.');
      fetchUsuarios();
    }
  };

  // ==== paginación ====
  const totalUsuarios = usuariosFiltrados.length;
  const totalPages = Math.max(1, Math.ceil(totalUsuarios / ITEMS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);

  const startIndex = (safePage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const usuariosPagina = usuariosFiltrados.slice(startIndex, endIndex);

  const handlePrev = () => {
    setCurrentPage((p) => Math.max(1, p - 1));
  };

  const handleNext = () => {
    setCurrentPage((p) => Math.min(totalPages, p + 1));
  };

  const handleGoto = (page) => {
    setCurrentPage(page);
  };

  const limpiarFiltros = () => {
    setBusqueda('');
    setFiltroRol('TODOS');
    setFiltroEstado('TODOS');
  };

  const hayFiltrosActivos =
    busqueda.trim() !== '' || filtroRol !== 'TODOS' || filtroEstado !== 'TODOS';

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-md bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 flex items-center justify-center">
          <Users className="w-4 h-4" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              Usuarios
            </h1>
            <span className="inline-flex items-center px-2 py-[2px] rounded-full bg-slate-700/10 dark:bg-slate-700/40 text-[11px] text-slate-600 dark:text-slate-200 border border-slate-500/40">
              Equipo y clientes
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Administra los usuarios de ZaHub y sus roles.
          </p>
        </div>
      </div>

      {/* Barra de búsqueda y filtros */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-4 flex flex-wrap gap-4 items-end shadow-sm">
        {/* Buscar */}
        <div className="flex-1 min-w-[220px]">
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
            Buscar usuario
          </label>
          <div className="relative">
            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500">
              <Search className="w-4 h-4" />
            </span>
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Nombre o correo..."
              className="w-full pl-8 pr-3 py-2 border border-slate-300 dark:border-slate-700 rounded-md text-sm bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-900/5 dark:focus:ring-slate-300/10"
            />
          </div>
        </div>

        {/* Filtros por rol / estado */}
        <div className="flex flex-wrap gap-3 items-end">
          {/* Rol */}
          <div className="w-40">
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
              Rol
            </label>
            <div className="relative">
              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500">
                <Filter className="w-3 h-3" />
              </span>
              <select
                value={filtroRol}
                onChange={(e) => setFiltroRol(e.target.value)}
                className="w-full appearance-none pl-7 pr-7 py-2 border border-slate-300 dark:border-slate-700 rounded-md text-xs bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-900/5 dark:focus:ring-slate-300/10"
              >
                <option value="TODOS">Todos los roles</option>
                {ROLES.map((rol) => (
                  <option key={rol} value={rol}>
                    {rol}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3 h-3 text-slate-500 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Estado */}
          <div className="w-40">
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
              Estado
            </label>
            <div className="relative">
              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500">
                <ToggleRight className="w-3 h-3" />
              </span>
              <select
                value={filtroEstado}
                onChange={(e) => setFiltroEstado(e.target.value)}
                className="w-full appearance-none pl-7 pr-7 py-2 border border-slate-300 dark:border-slate-700 rounded-md text-xs bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-900/5 dark:focus:ring-slate-300/10"
              >
                {ESTADOS_USUARIO.map((estado) => (
                  <option key={estado} value={estado}>
                    {estado === 'TODOS'
                      ? 'Todos'
                      : estado === 'ACTIVOS'
                      ? 'Activos'
                      : 'Inactivos'}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3 h-3 text-slate-500 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Botones acción (solo iconos) */}
          <div className="flex items-center gap-2 ml-1">
            {/* Limpiar filtros: solo si hay filtros activos */}
            {hayFiltrosActivos && (
              <button
                type="button"
                onClick={limpiarFiltros}
                className="inline-flex items-center justify-center h-8 w-8 rounded-md border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-100 transition"
                title="Limpiar filtros"
                aria-label="Limpiar filtros"
              >
                <XCircle className="w-4 h-4" />
              </button>
            )}

            {/* Recargar lista: siempre visible */}
            <button
              type="button"
              onClick={fetchUsuarios}
              className="inline-flex items-center justify-center h-8 w-8 rounded-md border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 transition"
              title="Recargar lista"
              aria-label="Recargar lista"
            >
              <RotateCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Estados de carga / error */}
      {loading && (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Cargando usuarios...
        </p>
      )}

      {!loading && errorMsg && (
        <p className="text-sm text-red-500">{errorMsg}</p>
      )}

      {!loading && !errorMsg && totalUsuarios === 0 && (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          No se encontraron usuarios para la búsqueda actual.
        </p>
      )}

      {/* Tabla de usuarios + paginación */}
      {!loading && !errorMsg && totalUsuarios > 0 && (
        <>
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm overflow-hidden">
            <table className="w-full text-sm text-slate-800 dark:text-slate-100">
              <thead className="bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200">
                <tr>
                  <th className="text-left px-4 py-2 border-b border-slate-200 dark:border-slate-700">
                    Nombre
                  </th>
                  <th className="text-left px-4 py-2 border-b border-slate-200 dark:border-slate-700">
                    Correo
                  </th>
                  <th className="text-left px-4 py-2 border-b border-slate-200 dark:border-slate-700">
                    Teléfono
                  </th>
                  <th className="text-center px-4 py-2 border-b border-slate-200 dark:border-slate-700">
                    Rol
                  </th>
                  <th className="text-center px-4 py-2 border-b border-slate-200 dark:border-slate-700">
                    Estado
                  </th>
                  <th className="text-right px-4 py-2 border-b border-slate-200 dark:border-slate-700">
                    Creado
                  </th>
                </tr>
              </thead>
              <tbody>
                {usuariosPagina.map((u) => (
                  <tr
                    key={u.id}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                  >
                    <td className="px-4 py-2 border-b border-slate-200 dark:border-slate-800">
                      {u.nombre || 'Sin nombre'}
                    </td>
                    <td className="px-4 py-2 border-b border-slate-200 dark:border-slate-800">
                      <span className="text-xs">{u.email || '—'}</span>
                    </td>
                    <td className="px-4 py-2 border-b border-slate-200 dark:border-slate-800">
                      <span className="text-xs">
                        {u.telefono || 'Sin teléfono'}
                      </span>
                    </td>

                    {/* Rol */}
                    <td className="px-4 py-2 border-b border-slate-200 dark:border-slate-800 text-center">
                      <div className="inline-flex items-center gap-1">
                        <Shield className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                        <select
                          value={u.rol || 'CLIENTE'}
                          onChange={(e) => cambiarRol(u, e.target.value)}
                          className="border border-slate-300 dark:border-slate-700 rounded-md px-2 py-1 text-[11px] bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 focus:outline-none"
                        >
                          {ROLES.map((rol) => (
                            <option key={rol} value={rol}>
                              {rol}
                            </option>
                          ))}
                        </select>
                      </div>
                    </td>

                    {/* Activo / Inactivo */}
                    <td className="px-4 py-2 border-b border-slate-200 dark:border-slate-800 text-center">
                      <button
                        type="button"
                        onClick={() => toggleActivo(u)}
                        className="inline-flex items-center gap-1 text-xs text-slate-700 dark:text-slate-200"
                      >
                        {u.activo ? (
                          <>
                            <ToggleRight className="w-4 h-4 text-emerald-500" />
                            <span>Activo</span>
                          </>
                        ) : (
                          <>
                            <ToggleLeft className="w-4 h-4 text-slate-400" />
                            <span>Inactivo</span>
                          </>
                        )}
                      </button>
                    </td>

                    {/* Fecha creación */}
                    <td className="px-4 py-2 border-b border-slate-200 dark:border-slate-800 text-right">
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {u.created_at
                          ? new Date(u.created_at).toLocaleDateString()
                          : '—'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="mt-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3 text-xs text-slate-400">
              <p>
                Mostrando{' '}
                <span className="text-slate-700 dark:text-slate-200">
                  {startIndex + 1}–
                  {Math.min(endIndex, totalUsuarios)}
                </span>{' '}
                de{' '}
                <span className="text-slate-700 dark:text-slate-200">
                  {totalUsuarios}
                </span>{' '}
                usuarios
              </p>

              <div className="flex items-center gap-2 justify-end">
                <button
                  type="button"
                  onClick={handlePrev}
                  disabled={safePage === 1}
                  className={`inline-flex items-center gap-1 px-2 py-1 rounded-md border text-[11px] transition ${
                    safePage === 1
                      ? 'border-slate-300 dark:border-slate-700 text-slate-400 dark:text-slate-600 cursor-not-allowed'
                      : 'border-slate-400 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:border-orange-500 hover:text-orange-300'
                  }`}
                >
                  <ChevronLeft className="w-3 h-3" />
                  <span>Anterior</span>
                </button>

                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                    (page) => (
                      <button
                        key={page}
                        type="button"
                        onClick={() => handleGoto(page)}
                        className={`w-7 h-7 rounded-full text-[11px] flex items-center justify-center border transition ${
                          page === safePage
                            ? 'bg-orange-500 border-orange-500 text-white shadow-[0_0_0_1px_rgba(248,250,252,0.2)]'
                            : 'border-slate-400 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-orange-500 hover:text-orange-300'
                        }`}
                      >
                        {page}
                      </button>
                    )
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleNext}
                  disabled={safePage === totalPages}
                  className={`inline-flex items-center gap-1 px-2 py-1 rounded-md border text-[11px] transition ${
                    safePage === totalPages
                      ? 'border-slate-300 dark:border-slate-700 text-slate-400 dark:text-slate-600 cursor-not-allowed'
                      : 'border-slate-400 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:border-orange-500 hover:text-orange-300'
                  }`}
                >
                  <span>Siguiente</span>
                  <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
