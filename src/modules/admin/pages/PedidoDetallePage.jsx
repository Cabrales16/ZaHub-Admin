// src/admin/pages/PedidoDetallePage.jsx
import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../../../supabaseClient';
import {
  ArrowLeft,
  DollarSign,
  User,
  MapPin,
  Clock,
  Truck,
  Pizza,
  ChevronRight,
} from 'lucide-react';

const ESTADOS = [
  'PENDIENTE',
  'PREPARANDO',
  'HORNEANDO',
  'LISTO',
  'EN_CAMINO',
  'ENTREGADO',
  'CANCELADO',
];

function getEstadoClasses(estado) {
  switch (estado) {
    case 'PENDIENTE':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-500/10 dark:text-yellow-400';
    case 'PREPARANDO':
    case 'HORNEANDO':
      return 'bg-orange-100 text-orange-800 dark:bg-orange-500/25 dark:text-orange-400';
    case 'LISTO':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-500/25 dark:text-blue-300';
    case 'EN_CAMINO':
      return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-500/25 dark:text-indigo-400';
    case 'ENTREGADO':
      return 'bg-green-100 text-green-800 dark:bg-green-500/25 dark:text-emerald-400';
    case 'CANCELADO':
      return 'bg-red-100 text-red-800 dark:bg-red-500/25 dark:text-red-400';
    default:
      return 'bg-slate-100 text-slate-800 dark:bg-slate-500/25 dark:text-slate-200';
  }
}

export default function PedidoDetallePage() {
  const { id } = useParams();

  const [pedido, setPedido] = useState(null);
  const [items, setItems] = useState([]);
  const [historial, setHistorial] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [estadoSeleccionado, setEstadoSeleccionado] = useState('');
  const [savingEstado, setSavingEstado] = useState(false);

  const fetchDetalle = async () => {
    setLoading(true);
    setErrorMsg('');

    try {
      // === 1) Pedido + info cliente ===
      const { data: pedidoData, error: pedidoError } = await supabase
        .from('pedidos')
        .select(
          `
          id,
          estado,
          total,
          metodo_pago,
          direccion_entrega,
          canal,
          created_at,
          usuarios_app:usuarios_app!pedidos_cliente_id_fkey (
            id,
            nombre,
            telefono
          )
        `
        )
        .eq('id', id)
        .single();

      if (pedidoError) throw pedidoError;

      // === 2) Ítems del pedido (sin columna "notas" porque no existe en la BD) ===
      const { data: itemsData, error: itemsError } = await supabase
        .from('pedido_items')
        .select(
          `
          id,
          cantidad,
          precio_unitario,
          subtotal,
          pizzas_base:pizzas_base!pedido_items_pizza_base_id_fkey (
            id,
            nombre,
            tamano
          )
        `
        )
        .eq('pedido_id', id)
        .order('id', { ascending: true });

      if (itemsError) throw itemsError;

      // === 3) Historial de estados ===
      const { data: historialData, error: historialError } = await supabase
        .from('historial_estado_pedido')
        .select(
          `
          id,
          estado,
          comentario,
          created_at,
          usuarios_app (
            nombre
          )
        `
        )
        .eq('pedido_id', id)
        .order('created_at', { ascending: true });

      if (historialError) throw historialError;

      setPedido(pedidoData);
      setItems(itemsData || []);
      setHistorial(historialData || []);
      setEstadoSeleccionado(pedidoData.estado);
    } catch (err) {
      console.error('Error cargando detalle de pedido:', err);
      setErrorMsg('No se pudo cargar el detalle del pedido.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!id) return;
    fetchDetalle();
  }, [id]);

  const handleCambiarEstado = async (nuevoEstado) => {
    if (!pedido) return;
    if (nuevoEstado === pedido.estado) return;

    setSavingEstado(true);
    setEstadoSeleccionado(nuevoEstado);

    try {
      // 1) actualizar tabla pedidos
      const { error: pedidoError } = await supabase
        .from('pedidos')
        .update({ estado: nuevoEstado })
        .eq('id', pedido.id);

      if (pedidoError) throw pedidoError;

      // 2) registrar historial
      const { error: histError } = await supabase
        .from('historial_estado_pedido')
        .insert({
          pedido_id: pedido.id,
          estado: nuevoEstado,
          comentario: `Estado actualizado a ${nuevoEstado} desde el panel admin.`,
        });

      if (histError) throw histError;

      // 3) actualizar estado local
      setPedido((prev) => (prev ? { ...prev, estado: nuevoEstado } : prev));
      await fetchDetalle(); // refresca historial, items, etc.
    } catch (err) {
      console.error('Error cambiando estado desde detalle:', err);
      setErrorMsg('No se pudo actualizar el estado del pedido.');
      // revertir selección en UI
      setEstadoSeleccionado(pedido.estado);
    } finally {
      setSavingEstado(false);
    }
  };

  if (loading) {
    return (
      <p className="text-sm text-slate-500 dark:text-slate-400">
        Cargando detalle del pedido...
      </p>
    );
  }

  if (!pedido || errorMsg) {
    return (
      <div className="space-y-3">
        <Link
          to="/admin/pedidos"
          className="inline-flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 hover:text-orange-500 dark:hover:text-orange-300"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Volver a pedidos</span>
        </Link>
        <p className="text-sm text-red-500">
          {errorMsg || 'No se encontró el pedido solicitado.'}
        </p>
      </div>
    );
  }

  const shortId = pedido.id?.slice(0, 8) ?? '';
  const cliente = pedido.usuarios_app;

  return (
    <div className="space-y-5">
      {/* Header superior */}
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-2">
          <Link
            to="/admin/pedidos"
            className="inline-flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 hover:text-orange-500 dark:hover:text-orange-300"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Volver a pedidos</span>
          </Link>

          <div className="flex items-center gap-2 mt-1">
            <div className="h-9 w-9 rounded-md bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                  Pedido #{shortId}
                </h1>
                <span
                  className={
                    'inline-flex items-center px-2 py-[2px] rounded-full text-[11px] font-semibold ' +
                    getEstadoClasses(pedido.estado)
                  }
                >
                  {pedido.estado}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-2">
                <Clock className="w-3 h-3" />
                <span>
                  {new Date(pedido.created_at).toLocaleString('es-CO', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
                <span className="text-slate-400 dark:text-slate-500">·</span>
                <span className="uppercase text-[11px] tracking-wide text-slate-500 dark:text-slate-400">
                  {pedido.canal || 'CANAL DESCONOCIDO'}
                </span>
              </p>
            </div>
          </div>
        </div>

        {/* Selector de estado */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 flex flex-col gap-1 shadow-sm min-w-[190px]">
          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
            Cambiar estado
          </span>
          <select
            value={estadoSeleccionado}
            onChange={(e) => handleCambiarEstado(e.target.value)}
            disabled={savingEstado}
            className="mt-1 w-full border border-slate-300 dark:border-slate-700 rounded-md px-2 py-1.5 text-xs bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-500/30"
          >
            {ESTADOS.map((est) => (
              <option key={est} value={est}>
                {est}
              </option>
            ))}
          </select>
          {savingEstado && (
            <span className="text-[10px] text-amber-600 dark:text-amber-300">
              Guardando cambios...
            </span>
          )}
        </div>
      </div>

      {/* Grid principal: detalle / items / historial */}
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-3">
        {/* Columna izquierda: info del pedido + cliente */}
        <div className="space-y-4 lg:col-span-1">
          {/* Info financiera / dirección */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-4 shadow-sm space-y-3">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-emerald-500" />
              Resumen del pedido
            </h2>

            <div className="space-y-2 text-sm">
              <p className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400">
                  Total
                </span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">
                  ${pedido.total}
                </span>
              </p>
              <p className="flex items-center justify-between text-xs">
                <span className="text-slate-500 dark:text-slate-400">
                  Método de pago
                </span>
                <span className="uppercase text-[11px] text-slate-700 dark:text-slate-300">
                  {pedido.metodo_pago || 'N/A'}
                </span>
              </p>
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 mt-2">
              <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-2">
                <MapPin className="w-3 h-3" />
                Dirección de entrega
              </p>
              <p className="text-xs text-slate-700 dark:text-slate-200">
                {pedido.direccion_entrega || 'Sin dirección registrada.'}
              </p>
            </div>
          </div>

          {/* Info cliente */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-4 shadow-sm space-y-3">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <User className="w-4 h-4 text-sky-500" />
              Cliente
            </h2>

            <div className="space-y-1 text-sm">
              <p className="font-medium text-slate-900 dark:text-slate-100">
                {cliente?.nombre || 'Cliente desconocido'}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Teléfono:{' '}
                <span className="font-medium">
                  {cliente?.telefono || 'No registrado'}
                </span>
              </p>
            </div>
          </div>

          {/* Historial de estados */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-4 shadow-sm space-y-3">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Truck className="w-4 h-4 text-indigo-500" />
              Historial de estados
            </h2>

            {historial.length === 0 ? (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Aún no hay historial registrado para este pedido.
              </p>
            ) : (
              <ul className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {historial.map((h) => (
                  <li
                    key={h.id}
                    className="flex items-start gap-2 text-xs text-slate-700 dark:text-slate-200"
                  >
                    <div className="mt-[2px]">
                      <div className="w-2 h-2 rounded-full bg-orange-500" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-1">
                        <span className="font-semibold text-[11px]">
                          {h.estado}
                        </span>
                        <ChevronRight className="w-3 h-3 text-slate-400" />
                        <span className="text-[11px] text-slate-500 dark:text-slate-400">
                          {new Date(h.created_at).toLocaleString('es-CO', {
                            day: '2-digit',
                            month: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      {h.comentario && (
                        <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                          {h.comentario}
                        </p>
                      )}
                      {h.usuarios_app?.nombre && (
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                          Registrado por{' '}
                          <span className="font-medium">
                            {h.usuarios_app.nombre}
                          </span>
                        </p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Columna derecha: Ítems del pedido */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 flex items-center gap-2">
              <Pizza className="w-4 h-4 text-orange-500" />
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Ítems del pedido
              </h2>
              <span className="ml-auto text-[11px] text-slate-500 dark:text-slate-400">
                {items.length} ítem{items.length === 1 ? '' : 's'}
              </span>
            </div>

            {items.length === 0 ? (
              <p className="px-4 py-4 text-xs text-slate-500 dark:text-slate-400">
                Este pedido no tiene ítems registrados.
              </p>
            ) : (
              <table className="w-full text-sm text-slate-800 dark:text-slate-100">
                <thead className="bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200">
                  <tr>
                    <th className="text-left px-4 py-2 border-b border-slate-200 dark:border-slate-700">
                      Pizza
                    </th>
                    <th className="text-center px-4 py-2 border-b border-slate-200 dark:border-slate-700">
                      Tamaño
                    </th>
                    <th className="text-center px-4 py-2 border-b border-slate-200 dark:border-slate-700">
                      Cantidad
                    </th>
                    <th className="text-right px-4 py-2 border-b border-slate-200 dark:border-slate-700">
                      Precio unitario
                    </th>
                    <th className="text-right px-4 py-2 border-b border-slate-200 dark:border-slate-700">
                      Subtotal
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => {
                    const pizzaBase = item.pizzas_base;
                    return (
                      <tr
                        key={item.id}
                        className="hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                      >
                        <td className="px-4 py-2 border-b border-slate-200 dark:border-slate-800">
                          <div className="flex flex-col">
                            <span className="font-medium text-xs sm:text-sm">
                              {pizzaBase?.nombre || 'Pizza personalizada'}
                            </span>
                            {/* Si en el futuro agregas columna notas, aquí se puede volver a mostrar */}
                            {item.notas && (
                              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                                {item.notas}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-2 border-b border-slate-200 dark:border-slate-800 text-center text-xs">
                          {pizzaBase?.tamano || '—'}
                        </td>
                        <td className="px-4 py-2 border-b border-slate-200 dark:border-slate-800 text-center text-xs">
                          {item.cantidad}
                        </td>
                        <td className="px-4 py-2 border-b border-slate-200 dark:border-slate-800 text-right text-xs">
                          ${item.precio_unitario ?? 0}
                        </td>
                        <td className="px-4 py-2 border-b border-slate-200 dark:border-slate-800 text-right text-xs">
                          ${item.subtotal ?? 0}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
