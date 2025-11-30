// src/admin/pages/PedidosPage.jsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import {
  User,
  DollarSign,
  MapPin,
  Clock,
  Filter,
  ChevronDown,
  PlusCircle,
  ChevronLeft,
  ChevronRight,
  Search,
} from 'lucide-react';
import { useAuth } from '../auth/AuthContext';

const ESTADOS = [
  'PENDIENTE',
  'PREPARANDO',
  'HORNEANDO',
  'LISTO',
  'EN_CAMINO',
  'ENTREGADO',
  'CANCELADO',
];

const ESTADOS_FILTRO = ['TODOS', ...ESTADOS];

function getEstadoClasses(estado) {
  switch (estado) {
    case 'PENDIENTE':
      return 'bg-yellow-100 dark:bg-yellow-500/10 dark:text-yellow-400';
    case 'PREPARANDO':
    case 'HORNEANDO':
      return 'bg-orange-100 dark:bg-orange-500/25 dark:text-orange-400';
    case 'LISTO':
      return 'bg-blue-100 dark:bg-blue-500/25 dark:text-blue-300';
    case 'EN_CAMINO':
      return 'bg-indigo-100 dark:bg-indigo-500/25 dark:text-indigo-400';
    case 'ENTREGADO':
      return 'bg-green-100 dark:bg-green-500/25 dark:text-emerald-400';
    case 'CANCELADO':
      return 'bg-red-100 dark:bg-red-500/25 dark:text-red-400';
    default:
      return 'bg-slate-100 dark:bg-slate-500/25 dark:text-slate-800';
  }
}

export default function PedidosPage() {
  const { userProfile, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filtroEstado, setFiltroEstado] = useState('TODOS');
  const [busqueda, setBusqueda] = useState('');
  const [errorCarga, setErrorCarga] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(9); // responsive

  // --- responsive items per page (9 desktop, 6 pantallas más pequeñas) ---
  useEffect(() => {
    const updateItemsPerPage = () => {
      if (typeof window === 'undefined') return;
      const w = window.innerWidth;
      setItemsPerPage(w < 1280 ? 6 : 9);
    };

    updateItemsPerPage();
    window.addEventListener('resize', updateItemsPerPage);
    return () => window.removeEventListener('resize', updateItemsPerPage);
  }, []);

  const fetchPedidos = async () => {
    setLoading(true);
    setErrorCarga('');

    try {
      const { data, error } = await supabase
        .from('pedidos')
        .select(`
          id,
          estado,
          total,
          metodo_pago,
          direccion_entrega,
          created_at,
          usuarios_app:usuarios_app!pedidos_cliente_id_fkey (nombre)
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Error cargando pedidos desde Supabase:', error);
        setErrorCarga('No se pudieron cargar los pedidos.');
        setPedidos([]);
      } else {
        setPedidos(data || []);
      }
    } catch (err) {
      console.error('💥 Error inesperado cargando pedidos:', err);
      setErrorCarga('Ocurrió un error inesperado al cargar los pedidos.');
      setPedidos([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authLoading) return;
    if (!userProfile) return;
    fetchPedidos();
  }, [authLoading, userProfile?.id]);

  // reset página cuando cambian filtros, búsqueda o tamaño de página
  useEffect(() => {
    setCurrentPage(1);
  }, [filtroEstado, pedidos.length, busqueda, itemsPerPage]);

  /**
   * Cambiar estado desde la tarjeta:
   * - Actualiza pedidos
   * - Inserta registro en historial_estado_pedido (cambiado_por_id)
   */
  const cambiarEstado = async (pedido, nuevoEstado) => {
    if (!pedido) return;
    if (nuevoEstado === pedido.estado) return;

    // snapshot para poder revertir
    const estadoAnterior = pedido.estado;

    // actualización optimista en UI
    setPedidos((prev) =>
      prev.map((p) =>
        p.id === pedido.id ? { ...p, estado: nuevoEstado } : p
      )
    );

    try {
      // 1) actualizar tabla pedidos
      const { error: pedidoError } = await supabase
        .from('pedidos')
        .update({ estado: nuevoEstado })
        .eq('id', pedido.id);

      if (pedidoError) throw pedidoError;

      // 2) registrar historial de estado
      const { error: histError } = await supabase
        .from('historial_estado_pedido')
        .insert({
          pedido_id: pedido.id,
          estado: nuevoEstado,
          cambiado_por_id: userProfile?.id ?? null,
          comentario: `Estado actualizado a ${nuevoEstado} desde la lista de pedidos.`,
        });

      if (histError) throw histError;
    } catch (err) {
      console.error('Error cambiando estado de pedido:', err);
      alert('No se pudo cambiar el estado. Se revertirá.');

      // revertir en UI
      setPedidos((prev) =>
        prev.map((p) =>
          p.id === pedido.id ? { ...p, estado: estadoAnterior } : p
        )
      );
    }
  };

  const crearPedidoDePrueba = async () => {
    const clienteId = '11c68e3b-cf7d-417a-ae79-fe6d39f3bc84';

    const { data, error } = await supabase
      .from('pedidos')
      .insert({
        cliente_id: clienteId,
        estado: 'PENDIENTE',
        total: 25000,
        metodo_pago: 'EFECTIVO',
        direccion_entrega: 'Cra 50 #20-15',
        canal: 'APP_MOBILE',
      })
      .select()
      .single();

    if (error) {
      console.error('Error creando pedido:', error);
      alert('Error al crear pedido.');
    } else {
      setPedidos((prev) => [data, ...prev]);
    }
  };

  // ==== Filtro + búsqueda + paginación ====
  const pedidosFiltrados = pedidos.filter((p) => {
    const matchEstado =
      filtroEstado === 'TODOS' ? true : p.estado === filtroEstado;

    const q = busqueda.trim().toLowerCase();
    if (!q) return matchEstado;

    const id = p.id?.toLowerCase() ?? '';
    const nombre = p.usuarios_app?.nombre?.toLowerCase() ?? '';
    const direccion = p.direccion_entrega?.toLowerCase() ?? '';

    const matchTexto =
      id.includes(q) || nombre.includes(q) || direccion.includes(q);

    return matchEstado && matchTexto;
  });

  const totalPedidos = pedidosFiltrados.length;
  const totalPages = Math.max(1, Math.ceil(totalPedidos / itemsPerPage));
  const safePage = Math.min(currentPage, totalPages);

  const startIndex = (safePage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const pedidosPagina = pedidosFiltrados.slice(startIndex, endIndex);

  const handlePrev = () => {
    setCurrentPage((p) => Math.max(1, p - 1));
  };

  const handleNext = () => {
    setCurrentPage((p) => Math.min(totalPages, p + 1));
  };

  const handleGoto = (page) => {
    setCurrentPage(page);
  };

  const handleCardClick = (id) => {
    navigate(`/admin/pedidos/${id}`);
  };

  const handleCardKeyDown = (e, id) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      navigate(`/admin/pedidos/${id}`);
    }
  };

  if (authLoading) {
    return (
      <p className="text-sm text-slate-400">
        Preparando tu panel de administración...
      </p>
    );
  }

  if (!userProfile) {
    return (
      <p className="text-sm text-red-500">
        No se encontró un usuario autenticado. Vuelve a iniciar sesión.
      </p>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header (mismo patrón que Usuarios) */}
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-md bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 flex items-center justify-center">
          <DollarSign className="w-4 h-4" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              Pedidos
            </h1>
            <span className="inline-flex items-center px-2 py-[2px] rounded-full bg-emerald-500/10 dark:bg-emerald-500/20 text-[11px] text-emerald-700 dark:text-emerald-300 border border-emerald-500/40">
              En vivo
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Gestiona los pedidos en tiempo real desde este panel.
          </p>
        </div>
      </div>

      {/* Barra de acciones: búsqueda + filtro + botón de prueba */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-4 flex flex-wrap gap-4 items-end shadow-sm">
        {/* Buscar pedido */}
        <div className="flex-1 min-w-[220px]">
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
            Buscar pedido
          </label>
          <div className="relative">
            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500">
              <Search className="w-4 h-4" />
            </span>
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="ID, cliente o dirección..."
              className="w-full pl-8 pr-3 py-2 border border-slate-300 dark:border-slate-700 rounded-md text-sm bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-900/5 dark:focus:ring-slate-300/10"
            />
          </div>
        </div>

        {/* Filtro por estado */}
        <div className="w-full sm:w-56">
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
            Estado
          </label>
          <div className="relative">
            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500">
              <Filter className="w-4 h-4" />
            </span>
            <select
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value)}
              className="w-full appearance-none pl-8 pr-8 py-2 border border-slate-300 dark:border-slate-700 rounded-md text-sm bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-900/5 dark:focus:ring-slate-300/10"
            >
              {ESTADOS_FILTRO.map((est) => (
                <option key={est} value={est}>
                  {est}
                </option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-slate-500 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {/* Botón crear pedido de prueba (más pequeño) */}
        <button
          type="button"
          onClick={crearPedidoDePrueba}
          className="inline-flex items-center gap-1.5 bg-emerald-600 dark:bg-emerald-500 hover:bg-emerald-700 dark:hover:bg-emerald-600 text-[11px] sm:text-xs px-3 py-1.5 rounded-md text-white transition"
        >
          <PlusCircle className="w-3 h-3" />
          <span>Crear pedido de prueba</span>
        </button>
      </div>

      {/* Estados de carga / error */}
      {loading && (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Cargando pedidos...
        </p>
      )}

      {!loading && errorCarga && (
        <p className="text-sm text-red-500">{errorCarga}</p>
      )}

      {!loading && !errorCarga && totalPedidos === 0 && (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          No hay pedidos para el filtro seleccionado.
        </p>
      )}

      {/* Grid de cards + paginación */}
      {!loading && !errorCarga && totalPedidos > 0 && (
        <>
          {/* GRID responsive */}
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
            {pedidosPagina.map((p) => (
              <div
                key={p.id}
                role="button"
                tabIndex={0}
                onClick={() => handleCardClick(p.id)}
                onKeyDown={(e) => handleCardKeyDown(e, p.id)}
                className="bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-col justify-between gap-3 transition hover:border-orange-500/40 hover:shadow-[0_0_0_1px_rgba(249,115,22,0.3)] cursor-pointer focus:outline-none focus:ring-2 focus:ring-orange-500/60 focus:ring-offset-2 focus:ring-offset-slate-900"
              >
                <div className="space-y-2">
                  <p className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                    <span className="inline-flex items-center gap-2">
                      <Clock className="w-4 h-4 text-slate-400" />
                      <span>#{p.id.slice(0, 8)}</span>
                    </span>
                    <span>
                      {new Date(p.created_at).toLocaleString('es-CO', {
                        day: '2-digit',
                        month: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </p>

                  <p className="flex items-center gap-2 text-sm font-medium text-slate-900 dark:text-slate-100">
                    <User className="w-4 h-4 text-slate-400" />
                    <span className="truncate">
                      Cliente:{' '}
                      <span className="font-semibold">
                        {p.usuarios_app?.nombre ?? 'Desconocido'}
                      </span>
                    </span>
                  </p>

                  <p className="flex items-center gap-2 text-sm text-slate-800 dark:text-slate-200">
                    <DollarSign className="w-4 h-4 text-slate-400" />
                    <span>Total: ${p.total}</span>
                  </p>

                  <p className="flex items-center gap-2 text-sm text-slate-800 dark:text-slate-200">
                    <span
                      className={
                        'inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold ' +
                        getEstadoClasses(p.estado)
                      }
                    >
                      {p.estado}
                    </span>
                    <span className="text-slate-500">·</span>
                    <span className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-300">
                      Pago: {p.metodo_pago ?? 'N/A'}
                    </span>
                  </p>

                  <p className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                    <MapPin className="w-4 h-4 text-slate-400" />
                    <span className="line-clamp-2">
                      Dirección: {p.direccion_entrega}
                    </span>
                  </p>
                </div>

                {/* Selector de estado */}
                <div
                  className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-800 mt-1"
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => e.stopPropagation()}
                >
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    Cambiar estado
                  </span>
                  <select
                    value={p.estado}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => cambiarEstado(p, e.target.value)}
                    className="border border-slate-300 dark:border-slate-700 rounded-md px-3 py-1.5 text-xs bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500/60 cursor-pointer"
                  >
                    {ESTADOS.map((est) => (
                      <option key={est} value={est}>
                        {est}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ))}
          </div>

          {/* PAGINACIÓN */}
          {totalPages > 1 && (
            <div className="mt-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3 text-xs text-slate-400">
              <p>
                Mostrando{' '}
                <span className="text-slate-700 dark:text-slate-200">
                  {startIndex + 1}–
                  {Math.min(endIndex, totalPedidos)}
                </span>{' '}
                de{' '}
                <span className="text-slate-700 dark:text-slate-200">
                  {totalPedidos}
                </span>{' '}
                pedidos
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
