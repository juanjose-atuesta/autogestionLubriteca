
// ═══════════ INDICADOR DE CARGA ═══════════
function mostrarCargando(visible) {
  let el = document.getElementById('syncIndicador');
  if (!el) {
    el = document.createElement('div');
    el.id = 'syncIndicador';
    el.style.cssText = 'position:fixed;top:70px;right:20px;z-index:500;background:#0f172a;color:#38bdf8;padding:8px 16px;border-radius:8px;font-family:Syne,sans-serif;font-size:0.78rem;font-weight:700;box-shadow:0 4px 16px rgba(0,0,0,0.3);display:flex;align-items:center;gap:8px;transition:opacity 0.3s;';
    document.body.appendChild(el);
  }
  if (visible) {
    el.innerHTML = '<span style="animation:spin-slow 0.8s linear infinite;display:inline-block">⟳</span> Sincronizando...';
    el.style.opacity = '1';
    el.style.display = 'flex';
  } else {
    el.style.opacity = '0';
    setTimeout(() => { el.style.display = 'none'; }, 400);
  }
}

async function refrescarModalRecomendados() {
  if (!usuarioIdDelContextoARecomendar) return;
  const disponibles = await obtenerUsuariosDisponiblesParaRecomendar(usuarioIdDelContextoARecomendar);
  usuariosDisponiblesCache = disponibles;
  renderModalSeleccionarUsuarioContactar(disponibles);
}

// ═══════════ DISPATCH DE RENDERS ═══════════
// Única puerta de entrada. Repinta TODO desde el store (sin fetch):
// así, pase lo que pase, la pantalla siempre refleja el estado
// actual en memoria. El argumento _cambios se ignora a propósito:
// pintar todo es más barato y a prueba de errores que pintar solo lo
// que "cambió" y arriesgarse a quedar con datos viejos en pantalla.
const tabActiva = tabId => !!document.getElementById(tabId)?.classList.contains('active');

function refrescarVistas(_cambios = {}) {
  console.log('[refrescarVistas] repintando desde el store', {
    clientesEnStore: clientesTodos().length,
    citasEnStore: citasTodas().length,
    historialEnStore: historialTodos().length,
    alertasARenderizar: alertas().map(c => ({
      id: c.id, name: c.name, nextContact: c.nextContact, wasContacted: c.wasContacted
    })),
    stats: resumenClientes(getHoy())
  });

  actualizarStats();
  mostrarAlertas();

  // Vistas según pestaña visible (todas leen del store, nunca hacen fetch)
  if (tabActiva('tab-database')) mostrarGeneral(document.getElementById('buscadorGeneral').value);
  if (tabActiva('tab-agenda')) renderAgenda();
  if (tabActiva('tab-citas-programadas')) renderListaCitasProgramadas(document.getElementById('buscadorCitasProgramadas').value);
  if (tabActiva('tab-historial')) buscarHistorial();
  if (tabActiva('tab-contactados')) mostrarContactados(document.getElementById('buscadorContactados').value);

  // Badges (cambien o no, se mantienen al día)
  actualizarBadgeAgenda();
  actualizarBadgeCitasProgramadas();
  actualizarBadgeContactados();
}

// ═══════════ SSE ═══════════
let sseSource = null;

function parsearEvento(e) {
  try {
    return JSON.parse(e.data);
  } catch (err) {
    console.warn('SSE: payload inválido en', e.type, err);
    return {};
  }
}

function iniciarSSE() {
  if (sseSource) sseSource.close();
  sseSource = new EventSource(API_BACKEND_URL + 'eventos');

  sseSource.addEventListener('conectado', () => {
    console.log('SSE conectado');
  });

  // ── Eventos que alimentan el store ──
  const eventosDelStore = [
    'cliente-creado', 'cliente-editado', 'cliente-eliminado',
    'reserva-agregada', 'reserva-editada', 'reserva-eliminada', 'reservacion-concluida',
    'historial-guardado', 'historial-contactado', 'historial-editado'
  ];

  eventosDelStore.forEach(evento => {
    sseSource.addEventListener(evento, e => {
      const payload = parsearEvento(e);
      const cambios = aplicarEventoSSE(evento, payload);
      if (!payload.cliente && !payload.reserva && !payload.historial) {
        console.warn('[SSE] "' + evento + '" llegó sin documento completo -> no se puede actualizar el store. ¿Backend desactualizado?', payload);
      }
      refrescarVistas(cambios);
    });
  });

  // ── Eventos que no tocan el store ──
  sseSource.addEventListener('usuario-agregado', async () => {
    mostrarUsuarios(document.getElementById('buscadorUsuarios')?.value || '');
    await refrescarModalRecomendadosSiEstaAbierto();
  });

  sseSource.addEventListener('usuario-editado', () => {
    mostrarUsuarios(document.getElementById('buscadorUsuarios')?.value || '');
  });

  sseSource.addEventListener('meRecomendaron-editado', async () => {
    await refrescarModalRecomendadosSiEstaAbierto();
  });

  sseSource.addEventListener('usuario-eliminado', async () => {
    mostrarUsuarios(document.getElementById('buscadorUsuarios')?.value || '');
    await refrescarModalRecomendadosSiEstaAbierto();
  });

  sseSource.addEventListener('usuarioRecomendado-agregado', () => mostrarEstadisticas());
  sseSource.addEventListener('agregarPuntos-compraAlta', () => mostrarEstadisticas());
  sseSource.addEventListener('agregarPuntos-compraRecurrente', () => mostrarEstadisticas());
  sseSource.addEventListener('puntosEditados', () => mostrarEstadisticas());

  function refrescarPedidosSiVisible() {
    const filtro = document.getElementById('buscadorPedidos')?.value || '';
    if (modoPedidosHoy || filtro.trim()) {
      mostrarPedidos(filtro);
    }
  }

  sseSource.addEventListener('pedido-agregado', refrescarPedidosSiVisible);
  sseSource.addEventListener('pedido-editado', refrescarPedidosSiVisible);
  sseSource.addEventListener('pedido-eliminado', refrescarPedidosSiVisible);

  sseSource.onerror = () => {
    console.warn('SSE desconectado, reconectando...');
    sseSource.close();
    sseSource = null;
    setTimeout(() => {
      iniciarSSE();
      // Hubo una ventana sin eventos: resincronizamos para no perder datos.
      if (store.listo) resincronizarStore();
    }, 3000);
  };
}

async function refrescarModalRecomendadosSiEstaAbierto() {
  const modalAbierto = document.getElementById('modalSeleccionarUsuarioContactar')
    ?.classList.contains('active');
  if (modalAbierto && usuarioIdDelContextoARecomendar) {
    await refrescarModalRecomendados();
  }
}

async function resincronizarStore() {
  try {
    await cargarStore();
    refrescarVistas({ clientes: true, citas: true, historial: true });
  } catch (err) {
    console.warn('No se pudo resincronizar el store:', err);
  }
}
