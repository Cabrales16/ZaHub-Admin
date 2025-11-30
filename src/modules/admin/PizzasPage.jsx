// src/modules/admin/PizzasPage.jsx
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../supabaseClient';
import {
  Pizza,
  PlusCircle,
  ToggleLeft,
  ToggleRight,
  Pencil,
  ChevronLeft,
  ChevronRight,
  Search,
  Filter,
  ChevronDown,
  XCircle,
  RotateCw,
  Trash2,
  Tag,
} from 'lucide-react';

const TAMANOS = ['PERSONAL', 'MEDIANA', 'FAMILIAR'];
const ESTADOS_PIZZA = ['TODAS', 'ACTIVAS', 'INACTIVAS'];
const ITEMS_PER_PAGE = 10;

export default function PizzasPage() {
  const [pizzas, setPizzas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  // filtros / búsqueda
  const [busqueda, setBusqueda] = useState('');
  const [filtroTamano, setFiltroTamano] = useState('TODOS');
  const [filtroEstado, setFiltroEstado] = useState('TODAS');

  // paginación
  const [currentPage, setCurrentPage] = useState(1);

  // modales
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingPizza, setEditingPizza] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [pizzaAEliminar, setPizzaAEliminar] = useState(null);

  // estado del formulario (modal)
  const [formNombre, setFormNombre] = useState('');
  const [formDescripcion, setFormDescripcion] = useState('');
  const [formTamano, setFormTamano] = useState('MEDIANA');
  const [formPrecioBase, setFormPrecioBase] = useState('');
  const [formError, setFormError] = useState('');

  const fetchPizzas = async () => {
    setLoading(true);
    setErrorMsg('');

    const { data, error } = await supabase
      .from('pizzas_base')
      .select('*')
      .order('nombre', { ascending: true });

    if (error) {
      console.error('Error cargando pizzas:', error);
      setErrorMsg('No se pudieron cargar las pizzas.');
      setPizzas([]);
    } else {
      setPizzas(data || []);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchPizzas();
  }, []);

  // búsqueda + filtros
  const pizzasFiltradas = useMemo(() => {
    const q = busqueda.trim().toLowerCase();

    return pizzas.filter((pz) => {
      const nombre = pz.nombre?.toLowerCase() ?? '';
      const desc = pz.descripcion?.toLowerCase() ?? '';
      const matchBusqueda = !q || nombre.includes(q) || desc.includes(q);

      const t = pz.tamano ?? 'MEDIANA';
      const matchTamano =
        filtroTamano === 'TODOS' ? true : t === filtroTamano;

      let matchEstado = true;
      if (filtroEstado === 'ACTIVAS') matchEstado = !!pz.activa;
      else if (filtroEstado === 'INACTIVAS') matchEstado = !pz.activa;

      return matchBusqueda && matchTamano && matchEstado;
    });
  }, [pizzas, busqueda, filtroTamano, filtroEstado]);

  // reset página cuando cambie lista o filtros
  useEffect(() => {
    setCurrentPage(1);
  }, [pizzas.length, busqueda, filtroTamano, filtroEstado]);

  // paginación
  const totalPizzas = pizzasFiltradas.length;
  const totalPages = Math.max(1, Math.ceil(totalPizzas / ITEMS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);

  const startIndex = (safePage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const pizzasPagina = pizzasFiltradas.slice(startIndex, endIndex);

  const handlePrev = () => setCurrentPage((p) => Math.max(1, p - 1));
  const handleNext = () => setCurrentPage((p) => Math.min(totalPages, p + 1));
  const handleGoto = (page) => setCurrentPage(page);

  // --- filtros ---
  const limpiarFiltros = () => {
    setBusqueda('');
    setFiltroTamano('TODOS');
    setFiltroEstado('TODAS');
  };

  const hayFiltrosActivos =
    busqueda.trim() !== '' ||
    filtroTamano !== 'TODOS' ||
    filtroEstado !== 'TODAS';

  // --- toggle activa ---
  const toggleActiva = async (pizza) => {
    const nuevaActiva = !pizza.activa;

    setPizzas((prev) =>
      prev.map((p) =>
        p.id === pizza.id ? { ...p, activa: nuevaActiva } : p
      )
    );

    const { error } = await supabase
      .from('pizzas_base')
      .update({ activa: nuevaActiva })
      .eq('id', pizza.id);

    if (error) {
      console.error('Error cambiando estado de pizza:', error);
      alert('No se pudo cambiar el estado. Se revertirá.');
      fetchPizzas();
    }
  };

  // --- modales: crear / editar ---
  const abrirModalCrear = () => {
    setEditingPizza(null);
    setFormNombre('');
    setFormDescripcion('');
    setFormTamano('MEDIANA');
    setFormPrecioBase('');
    setFormError('');
    setShowFormModal(true);
  };

  const abrirModalEditar = (pizza) => {
    setEditingPizza(pizza);
    setFormNombre(pizza.nombre ?? '');
    setFormDescripcion(pizza.descripcion ?? '');
    setFormTamano(pizza.tamano ?? 'MEDIANA');
    setFormPrecioBase(String(pizza.precio_base ?? 0));
    setFormError('');
    setShowFormModal(true);
  };

  const cerrarFormModal = () => {
    setShowFormModal(false);
    setEditingPizza(null);
  };

  const handleSubmitForm = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!formNombre.trim()) {
      setFormError('El nombre es obligatorio.');
      return;
    }

    const precio = formPrecioBase ? Number(formPrecioBase) : 0;

    try {
      if (editingPizza) {
        const { error } = await supabase
          .from('pizzas_base')
          .update({
            nombre: formNombre.trim(),
            descripcion: formDescripcion.trim() || null,
            tamano: formTamano,
            precio_base: precio,
          })
          .eq('id', editingPizza.id);

        if (error) throw error;
      } else {
        const { error } = await supabase.from('pizzas_base').insert({
          nombre: formNombre.trim(),
          descripcion: formDescripcion.trim() || null,
          tamano: formTamano,
          precio_base: precio,
          activa: true,
        });

        if (error) throw error;
      }

      cerrarFormModal();
      fetchPizzas();
    } catch (err) {
      console.error('Error guardando pizza:', err);
      setFormError('No se pudo guardar la pizza.');
    }
  };

  // --- eliminar ---
  const abrirDeleteModal = (pizza) => {
    setPizzaAEliminar(pizza);
    setShowDeleteModal(true);
  };

  const cerrarDeleteModal = () => {
    setShowDeleteModal(false);
    setPizzaAEliminar(null);
  };

  const handleDelete = async () => {
    if (!pizzaAEliminar) return;

    try {
      const { error } = await supabase
        .from('pizzas_base')
        .delete()
        .eq('id', pizzaAEliminar.id);

      if (error) throw error;

      cerrarDeleteModal();
      fetchPizzas();
    } catch (err) {
      console.error('Error eliminando pizza:', err);
      alert('No se pudo eliminar la pizza.');
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-md bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 flex items-center justify-center">
          <Pizza className="w-4 h-4" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              Pizzas
            </h1>
            <span className="inline-flex items-center px-2 py-[2px] rounded-full bg-orange-500/10 text-[11px] text-orange-500 dark:text-orange-300 border border-orange-500/40">
              Menú base
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Gestiona el catálogo de pizzas base de ZaHub.
          </p>
        </div>
      </div>

      {/* Barra de búsqueda / filtros / acciones */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-4 flex flex-wrap gap-4 items-end shadow-sm">
        {/* Buscar */}
        <div className="flex-1 min-w-[220px]">
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
            Buscar pizza
          </label>
          <div className="relative">
            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500">
              <Search className="w-4 h-4" />
            </span>
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Nombre o descripción..."
              className="w-full pl-8 pr-3 py-2 border border-slate-300 dark:border-slate-700 rounded-md text-sm bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-900/5 dark:focus:ring-slate-300/10"
            />
          </div>
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap gap-3 items-end">
          {/* Tamaño */}
          <div className="w-40">
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
              Tamaño
            </label>
            <div className="relative">
              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500">
                <Tag className="w-3 h-3" />
              </span>
              <select
                value={filtroTamano}
                onChange={(e) => setFiltroTamano(e.target.value)}
                className="w-full appearance-none pl-7 pr-7 py-2 border border-slate-300 dark:border-slate-700 rounded-md text-xs bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-900/5 dark:focus:ring-slate-300/10"
              >
                <option value="TODOS">Todos los tamaños</option>
                {TAMANOS.map((t) => (
                  <option key={t} value={t}>
                    {t}
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
                {ESTADOS_PIZZA.map((e) => (
                  <option key={e} value={e}>
                    {e === 'TODAS'
                      ? 'Todas'
                      : e === 'ACTIVAS'
                      ? 'Activas'
                      : 'Inactivas'}
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
              onClick={fetchPizzas}
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
              title="Añadir pizza"
              aria-label="Añadir pizza"
            >
              <PlusCircle className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Estados de carga / error */}
      {loading && (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Cargando pizzas...
        </p>
      )}

      {!loading && errorMsg && (
        <p className="text-sm text-red-500">{errorMsg}</p>
      )}

      {!loading && !errorMsg && totalPizzas === 0 && (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          No se encontraron pizzas para los filtros actuales.
        </p>
      )}

      {/* Listado + paginación */}
      {!loading && !errorMsg && totalPizzas > 0 && (
        <>
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm overflow-hidden">
            <table className="w-full text-sm text-slate-800 dark:text-slate-100">
              <thead className="bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200">
                <tr>
                  <th className="text-left px-4 py-2 border-b border-slate-200 dark:border-slate-700">
                    Nombre
                  </th>
                  <th className="text-left px-4 py-2 border-b border-slate-200 dark:border-slate-700">
                    Tamaño
                  </th>
                  <th className="text-left px-4 py-2 border-b border-slate-200 dark:border-slate-700">
                    Descripción
                  </th>
                  <th className="text-right px-4 py-2 border-b border-slate-200 dark:border-slate-700">
                    Precio base
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
                {pizzasPagina.map((pz) => (
                  <tr
                    key={pz.id}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                  >
                    <td className="px-4 py-2 border-b border-slate-200 dark:border-slate-800">
                      {pz.nombre}
                    </td>
                    <td className="px-4 py-2 border-b border-slate-200 dark:border-slate-800">
                      {pz.tamano ?? '—'}
                    </td>
                    <td className="px-4 py-2 border-b border-slate-200 dark:border-slate-800">
                      <span className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2">
                        {pz.descripcion || 'Sin descripción'}
                      </span>
                    </td>
                    <td className="px-4 py-2 border-b border-slate-200 dark:border-slate-800 text-right">
                      ${pz.precio_base ?? 0}
                    </td>
                    <td className="px-4 py-2 border-b border-slate-200 dark:border-slate-800 text-center">
                      <button
                        type="button"
                        onClick={() => toggleActiva(pz)}
                        className="inline-flex items-center gap-1 text-xs text-slate-700 dark:text-slate-200"
                      >
                        {pz.activa ? (
                          <>
                            <ToggleRight className="w-4 h-4 text-emerald-500" />
                            <span>Activa</span>
                          </>
                        ) : (
                          <>
                            <ToggleLeft className="w-4 h-4 text-slate-400" />
                            <span>Inactiva</span>
                          </>
                        )}
                      </button>
                    </td>
                    <td className="px-4 py-2 border-b border-slate-200 dark:border-slate-800 text-right">
                      <div className="inline-flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => abrirModalEditar(pz)}
                          className="inline-flex items-center justify-center h-8 w-8 rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 transition"
                          title="Editar pizza"
                          aria-label="Editar pizza"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => abrirDeleteModal(pz)}
                          className="inline-flex items-center justify-center h-8 w-8 rounded-md bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 transition"
                          title="Eliminar pizza"
                          aria-label="Eliminar pizza"
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
            <div className="mt-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3 text-xs text-slate-400">
              <p>
                Mostrando{' '}
                <span className="text-slate-700 dark:text-slate-200">
                  {startIndex + 1}–
                  {Math.min(endIndex, totalPizzas)}
                </span>{' '}
                de{' '}
                <span className="text-slate-700 dark:text-slate-200">
                  {totalPizzas}
                </span>{' '}
                pizzas
              </p>

              <div className="flex items-center gap-2justify-end">
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

      {/* Modal crear/editar */}
      {showFormModal && (
        <PizzaFormModal
          isEditing={!!editingPizza}
          nombre={formNombre}
          setNombre={setFormNombre}
          descripcion={formDescripcion}
          setDescripcion={setFormDescripcion}
          tamano={formTamano}
          setTamano={setFormTamano}
          precioBase={formPrecioBase}
          setPrecioBase={setFormPrecioBase}
          onClose={cerrarFormModal}
          onSubmit={handleSubmitForm}
          errorMsg={formError}
        />
      )}

      {/* Modal eliminar */}
      {showDeleteModal && (
        <ConfirmDeleteModal
          pizza={pizzaAEliminar}
          onClose={cerrarDeleteModal}
          onConfirm={handleDelete}
        />
      )}
    </div>
  );
}

/**
 * Modal para crear / editar pizza
 */
function PizzaFormModal({
  isEditing,
  nombre,
  setNombre,
  descripcion,
  setDescripcion,
  tamano,
  setTamano,
  precioBase,
  setPrecioBase,
  onClose,
  onSubmit,
  errorMsg,
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-lg w-full max-w-md p-5 border border-slate-200 dark:border-slate-700">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3">
          {isEditing ? 'Editar pizza' : 'Añadir pizza'}
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
              placeholder="Pizza ZaHub Especial"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
              Descripción
            </label>
            <input
              type="text"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              className="w-full border border-slate-300 dark:border-slate-700 rounded-md px-3 py-2 text-sm bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-900/5 dark:focus:ring-slate-300/10"
              placeholder="Quesos, pepperoni, tocineta..."
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
              Tamaño
            </label>
            <select
              value={tamano}
              onChange={(e) => setTamano(e.target.value)}
              className="w-full border border-slate-300 dark:border-slate-700 rounded-md px-3 py-2 text-sm bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-900/5 dark:focus:ring-slate-300/10"
            >
              {TAMANOS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
              Precio base
            </label>
            <input
              type="number"
              min="0"
              value={precioBase}
              onChange={(e) => setPrecioBase(e.target.value)}
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
              <span>{isEditing ? 'Guardar cambios' : 'Crear pizza'}</span>
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
function ConfirmDeleteModal({ pizza, onClose, onConfirm }) {
  if (!pizza) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-lg w-full max-w-sm p-5 border border-slate-200 dark:border-slate-700">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-2">
          Eliminar pizza
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
          ¿Seguro que quieres eliminar{' '}
          <span className="font-semibold">{pizza.nombre}</span>? Esta acción no
          se puede deshacer.
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