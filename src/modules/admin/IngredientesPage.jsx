// src/modules/admin/IngredientesPage.jsx
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../supabaseClient';
import {
  Leaf,
  PlusCircle,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Search,
  Filter,
  ChevronDown,
  Tag,
  XCircle,
  RotateCw,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';

const ITEMS_PER_PAGE = 10;
const PRECIO_FILTERS = ['TODOS', 'CON_EXTRA', 'SIN_EXTRA'];
const ESTADOS_INGREDIENTE = ['TODOS', 'ACTIVOS', 'INACTIVOS'];

export default function IngredientesPage() {
  const [ingredientes, setIngredientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  // filtros / búsqueda
  const [busqueda, setBusqueda] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState('TODAS');
  const [filtroPrecio, setFiltroPrecio] = useState('TODOS');
  const [filtroEstado, setFiltroEstado] = useState('TODOS');

  // paginación
  const [currentPage, setCurrentPage] = useState(1);

  // modales
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingIngrediente, setEditingIngrediente] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [ingredienteAEliminar, setIngredienteAEliminar] = useState(null);

  // estado del formulario (usado por el modal)
  const [formNombre, setFormNombre] = useState('');
  const [formCategoria, setFormCategoria] = useState('');
  const [formPrecioExtra, setFormPrecioExtra] = useState('');

  const fetchIngredientes = async () => {
    setLoading(true);
    setErrorMsg('');

    const { data, error } = await supabase
      .from('ingredientes')
      .select('*')
      .order('nombre', { ascending: true });

    if (error) {
      console.error('Error cargando ingredientes:', error);
      setErrorMsg('No se pudieron cargar los ingredientes.');
      setIngredientes([]);
    } else {
      setIngredientes(data || []);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchIngredientes();
  }, []);

  // categorías únicas para el filtro
  const categoriasDisponibles = useMemo(() => {
    const set = new Set();
    ingredientes.forEach((ing) => {
      if (ing.categoria) set.add(ing.categoria);
    });
    return Array.from(set);
  }, [ingredientes]);

  // búsqueda + filtros
  const ingredientesFiltrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();

    return ingredientes.filter((ing) => {
      const nombre = ing.nombre?.toLowerCase() ?? '';
      const matchBusqueda = !q || nombre.includes(q);

      const categoria = ing.categoria ?? '';
      const matchCategoria =
        filtroCategoria === 'TODAS' ? true : categoria === filtroCategoria;

      const precio = Number(ing.precio_extra ?? 0);
      let matchPrecio = true;
      if (filtroPrecio === 'CON_EXTRA') matchPrecio = precio > 0;
      else if (filtroPrecio === 'SIN_EXTRA') matchPrecio = precio === 0;

      const activo = ing.activo ?? true; // si viene null/undefined lo tratamos como activo
      let matchEstado = true;
      if (filtroEstado === 'ACTIVOS') matchEstado = !!activo;
      else if (filtroEstado === 'INACTIVOS') matchEstado = !activo;

      return matchBusqueda && matchCategoria && matchPrecio && matchEstado;
    });
  }, [ingredientes, busqueda, filtroCategoria, filtroPrecio, filtroEstado]);

  // reset página cuando cambie lista o filtros
  useEffect(() => {
    setCurrentPage(1);
  }, [ingredientes.length, busqueda, filtroCategoria, filtroPrecio, filtroEstado]);

  // paginación
  const totalIngredientes = ingredientesFiltrados.length;
  const totalPages = Math.max(1, Math.ceil(totalIngredientes / ITEMS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);

  const startIndex = (safePage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const ingredientesPagina = ingredientesFiltrados.slice(startIndex, endIndex);

  const handlePrev = () => setCurrentPage((p) => Math.max(1, p - 1));
  const handleNext = () => setCurrentPage((p) => Math.min(totalPages, p + 1));
  const handleGoto = (page) => setCurrentPage(page);

  // --- filtros ---
  const limpiarFiltros = () => {
    setBusqueda('');
    setFiltroCategoria('TODAS');
    setFiltroPrecio('TODOS');
    setFiltroEstado('TODOS');
  };

  const hayFiltrosActivos =
    busqueda.trim() !== '' ||
    filtroCategoria !== 'TODAS' ||
    filtroPrecio !== 'TODOS' ||
    filtroEstado !== 'TODOS';

  // --- toggle activo ---
  const toggleActivo = async (ingrediente) => {
    const nuevoEstado = !ingrediente.activo;

    // UI optimista
    setIngredientes((prev) =>
      prev.map((ing) =>
        ing.id === ingrediente.id ? { ...ing, activo: nuevoEstado } : ing
      )
    );

    const { error } = await supabase
      .from('ingredientes')
      .update({ activo: nuevoEstado })
      .eq('id', ingrediente.id);

    if (error) {
      console.error('Error cambiando estado de ingrediente:', error);
      alert('No se pudo cambiar el estado. Se revertirá.');
      fetchIngredientes();
    }
  };

  // --- modales: crear / editar ---
  const abrirModalCrear = () => {
    setEditingIngrediente(null);
    setFormNombre('');
    setFormCategoria('');
    setFormPrecioExtra('');
    setErrorMsg('');
    setShowFormModal(true);
  };

  const abrirModalEditar = (ingrediente) => {
    setEditingIngrediente(ingrediente);
    setFormNombre(ingrediente.nombre ?? '');
    setFormCategoria(ingrediente.categoria ?? '');
    setFormPrecioExtra(String(ingrediente.precio_extra ?? 0));
    setErrorMsg('');
    setShowFormModal(true);
  };

  const cerrarFormModal = () => {
    setShowFormModal(false);
    setEditingIngrediente(null);
  };

  const handleSubmitForm = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!formNombre.trim()) {
      setErrorMsg('El nombre es obligatorio.');
      return;
    }

    const precio = formPrecioExtra ? Number(formPrecioExtra) : 0;

    try {
      if (editingIngrediente) {
        const { error } = await supabase
          .from('ingredientes')
          .update({
            nombre: formNombre.trim(),
            categoria: formCategoria.trim() || null,
            precio_extra: precio,
          })
          .eq('id', editingIngrediente.id);

        if (error) throw error;
      } else {
        const { error } = await supabase.from('ingredientes').insert({
          nombre: formNombre.trim(),
          categoria: formCategoria.trim() || null,
          precio_extra: precio,
          activo: true,
        });

        if (error) throw error;
      }

      cerrarFormModal();
      fetchIngredientes();
    } catch (err) {
      console.error('Error guardando ingrediente:', err);
      setErrorMsg('No se pudo guardar el ingrediente.');
    }
  };

  // --- eliminar ---
  const abrirDeleteModal = (ingrediente) => {
    setIngredienteAEliminar(ingrediente);
    setShowDeleteModal(true);
  };

  const cerrarDeleteModal = () => {
    setShowDeleteModal(false);
    setIngredienteAEliminar(null);
  };

  const handleDelete = async () => {
    if (!ingredienteAEliminar) return;

    try {
      const { error } = await supabase
        .from('ingredientes')
        .delete()
        .eq('id', ingredienteAEliminar.id);

      if (error) throw error;

      cerrarDeleteModal();
      fetchIngredientes();
    } catch (err) {
      console.error('Error eliminando ingrediente:', err);
      alert('No se pudo eliminar el ingrediente.');
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-md bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 flex items-center justify-center">
          <Leaf className="w-4 h-4" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              Ingredientes
            </h1>
            <span className="inline-flex items-center px-2 py-[2px] rounded-full bg-emerald-500/10 text-[11px] text-emerald-500 dark:text-emerald-300 border border-emerald-500/40">
              Stock de toppings
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Administra los ingredientes disponibles para las pizzas.
          </p>
        </div>
      </div>

      {/* Barra de búsqueda / filtros / acciones */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-4 flex flex-wrap gap-4 items-end shadow-sm">
        {/* Buscar */}
        <div className="flex-1 min-w-[220px]">
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
            Buscar ingrediente
          </label>
          <div className="relative">
            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500">
              <Search className="w-4 h-4" />
            </span>
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Nombre del ingrediente..."
              className="w-full pl-8 pr-3 py-2 border border-slate-300 dark:border-slate-700 rounded-md text-sm bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-900/5 dark:focus:ring-slate-300/10"
            />
          </div>
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap gap-3 items-end">
          {/* Categoría */}
          <div className="w-40">
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
              Categoría
            </label>
            <div className="relative">
              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500">
                <Tag className="w-3 h-3" />
              </span>
              <select
                value={filtroCategoria}
                onChange={(e) => setFiltroCategoria(e.target.value)}
                className="w-full appearance-none pl-7 pr-7 py-2 border border-slate-300 dark:border-slate-700 rounded-md text-xs bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-900/5 dark:focus:ring-slate-300/10"
              >
                <option value="TODAS">Todas las categorías</option>
                {categoriasDisponibles.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3 h-3 text-slate-500 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Precio extra */}
          <div className="w-40">
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
              Precio extra
            </label>
            <div className="relative">
              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500">
                <Filter className="w-3 h-3" />
              </span>
              <select
                value={filtroPrecio}
                onChange={(e) => setFiltroPrecio(e.target.value)}
                className="w-full appearance-none pl-7 pr-7 py-2 border border-slate-300 dark:border-slate-700 rounded-md text-xs bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-900/5 dark:focus:ring-slate-300/10"
              >
                {PRECIO_FILTERS.map((fp) => (
                  <option key={fp} value={fp}>
                    {fp === 'TODOS'
                      ? 'Todos'
                      : fp === 'CON_EXTRA'
                      ? 'Con precio extra'
                      : 'Sin precio extra'}
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
                {ESTADOS_INGREDIENTE.map((estado) => (
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

          {/* Botones icon-only */}
          <div className="flex items-center gap-2 ml-1">
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

            <button
              type="button"
              onClick={fetchIngredientes}
              className="inline-flex items-center justify-center h-8 w-8 rounded-md border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 transition"
              title="Recargar lista"
              aria-label="Recargar lista"
            >
              <RotateCw className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={abrirModalCrear}
              className="inline-flex items-center justify-center h-8 w-8 rounded-md bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600 text-white transition"
              title="Añadir ingrediente"
              aria-label="Añadir ingrediente"
            >
              <PlusCircle className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Estados de carga / error */}
      {loading && (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Cargando ingredientes...
        </p>
      )}

      {!loading && errorMsg && (
        <p className="text-sm text-red-500">{errorMsg}</p>
      )}

      {!loading && !errorMsg && totalIngredientes === 0 && (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          No se encontraron ingredientes para los filtros actuales.
        </p>
      )}

      {/* Listado + paginación */}
      {!loading && !errorMsg && totalIngredientes > 0 && (
        <>
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm overflow-hidden">
            <table className="w-full text-sm text-slate-800 dark:text-slate-100">
              <thead className="bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200">
                <tr>
                  <th className="text-left px-4 py-2 border-b border-slate-200 dark:border-slate-700">
                    Nombre
                  </th>
                  <th className="text-left px-4 py-2 border-b border-slate-200 dark:border-slate-700">
                    Categoría
                  </th>
                  <th className="text-right px-4 py-2 border-b border-slate-200 dark:border-slate-700">
                    Precio extra
                  </th>
                  <th className="text-center px-4 py-2 border-b border-slate-200 dark:border-slate-700">
                    Estado
                  </th>
                  <th className="text-right px-4 py-2 border-b border-slate-200 dark:border-slate-700">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody>
                {ingredientesPagina.map((ing) => (
                  <tr
                    key={ing.id}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                  >
                    <td className="px-4 py-2 border-b border-slate-200 dark:border-slate-800">
                      {ing.nombre}
                    </td>
                    <td className="px-4 py-2 border-b border-slate-200 dark:border-slate-800">
                      {ing.categoria || (
                        <span className="text-slate-400 dark:text-slate-500">
                          —
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2 border-b border-slate-200 dark:border-slate-800 text-right">
                      ${ing.precio_extra ?? 0}
                    </td>
                    <td className="px-4 py-2 border-b border-slate-200 dark:border-slate-800 text-center">
                      <button
                        type="button"
                        onClick={() => toggleActivo(ing)}
                        className="inline-flex items-center gap-1 text-xs text-slate-700 dark:text-slate-200"
                      >
                        {ing.activo ?? true ? (
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
                    <td className="px-4 py-2 border-b border-slate-200 dark:border-slate-800 text-right">
                      <div className="inline-flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => abrirModalEditar(ing)}
                          className="inline-flex items-center justify-center h-8 w-8 rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 transition"
                          title="Editar ingrediente"
                          aria-label="Editar ingrediente"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => abrirDeleteModal(ing)}
                          className="inline-flex items-center justify-center h-8 w-8 rounded-md bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 transition"
                          title="Eliminar ingrediente"
                          aria-label="Eliminar ingrediente"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="mt-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3 text-xs text-slate-600 dark:text-slate-400">
              <p>
                Mostrando{' '}
                <span className="font-medium text-slate-900 dark:text-slate-100">
                  {startIndex + 1}–{Math.min(endIndex, totalIngredientes)}
                </span>{' '}
                de{' '}
                <span className="font-medium text-slate-900 dark:text-slate-100">
                  {totalIngredientes}
                </span>{' '}
                ingredientes
              </p>

              <div className="flex items-center gap-2 justify-end">
                <button
                  type="button"
                  onClick={handlePrev}
                  disabled={safePage === 1}
                  className={`inline-flex items-center gap-1 px-2 py-1 rounded-md border text-[11px] transition ${
                    safePage === 1
                      ? 'border-slate-200 text-slate-300 dark:border-slate-700 dark:text-slate-600 cursor-not-allowed'
                      : 'border-slate-300 text-slate-700 hover:border-orange-500 hover:text-orange-500 dark:border-slate-600 dark:text-slate-200 dark:hover:border-orange-500 dark:hover:text-orange-300'
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
                            : 'border-slate-300 text-slate-700 hover:border-orange-500 hover:text-orange-500 dark:border-slate-700 dark:text-slate-300 dark:hover:border-orange-500 dark:hover:text-orange-300'
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
                      ? 'border-slate-200 text-slate-300 dark:border-slate-700 dark:text-slate-600 cursor-not-allowed'
                      : 'border-slate-300 text-slate-700 hover:border-orange-500 hover:text-orange-500 dark:border-slate-600 dark:text-slate-200 dark:hover:border-orange-500 dark:hover:text-orange-300'
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

      {/* Modal crear/editar */}
      {showFormModal && (
        <IngredienteFormModal
          isEditing={!!editingIngrediente}
          nombre={formNombre}
          setNombre={setFormNombre}
          categoria={formCategoria}
          setCategoria={setFormCategoria}
          precioExtra={formPrecioExtra}
          setPrecioExtra={setFormPrecioExtra}
          onClose={cerrarFormModal}
          onSubmit={handleSubmitForm}
          errorMsg={errorMsg}
        />
      )}

      {/* Modal eliminar */}
      {showDeleteModal && (
        <ConfirmDeleteModal
          ingrediente={ingredienteAEliminar}
          onClose={cerrarDeleteModal}
          onConfirm={handleDelete}
        />
      )}
    </div>
  );
}

/**
 * Modal para crear / editar ingrediente
 */
function IngredienteFormModal({
  isEditing,
  nombre,
  setNombre,
  categoria,
  setCategoria,
  precioExtra,
  setPrecioExtra,
  onClose,
  onSubmit,
  errorMsg,
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-lg w-full max-w-md p-5 border border-slate-200 dark:border-slate-700">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3">
          {isEditing ? 'Editar ingrediente' : 'Añadir ingrediente'}
        </h2>

        <form onSubmit={onSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
              Nombre
            </label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="w-full border border-slate-300 dark:border-slate-700 rounded-md px-3 py-2 text-sm bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-900/5 dark:focus:ring-slate-300/10"
              placeholder="Queso Mozzarella"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
              Categoría
            </label>
            <input
              type="text"
              value={categoria}
              onChange={(e) => setCategoria(e.target.value)}
              className="w-full border border-slate-300 dark:border-slate-700 rounded-md px-3 py-2 text-sm bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-900/5 dark:focus:ring-slate-300/10"
              placeholder="QUESO / CARNE / VEGETAL"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
              Precio extra
            </label>
            <input
              type="number"
              min="0"
              value={precioExtra}
              onChange={(e) => setPrecioExtra(e.target.value)}
              className="w-full border border-slate-300 dark:border-slate-700 rounded-md px-3 py-2 text-sm bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-900/5 dark:focus:ring-slate-300/10"
              placeholder="0"
            />
          </div>

          {errorMsg && <p className="text-xs text-red-500">{errorMsg}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs rounded-md border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-3 py-1.5 text-xs rounded-md bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600 text-white transition inline-flex items-center gap-1"
            >
              <PlusCircle className="w-3 h-3" />
              <span>{isEditing ? 'Guardar cambios' : 'Crear ingrediente'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/**
 * Modal de confirmación de eliminación
 */
function ConfirmDeleteModal({ ingrediente, onClose, onConfirm }) {
  if (!ingrediente) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-lg w-full max-w-sm p-5 border border-slate-200 dark:border-slate-700">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-2">
          Eliminar ingrediente
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
          ¿Seguro que quieres eliminar{' '}
          <span className="font-semibold">{ingrediente.nombre}</span>? Esta
          acción no se puede deshacer.
        </p>

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-xs rounded-md border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-3 py-1.5 text-xs rounded-md bg-red-600 hover:bg-red-700 text-white inline-flex items-center gap-1 transition"
          >
            <Trash2 className="w-3 h-3" />
            <span>Eliminar</span>
          </button>
        </div>
      </div>
    </div>
  );
}