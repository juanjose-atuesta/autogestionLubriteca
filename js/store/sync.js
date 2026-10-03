
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
  await cargarUsuarios();
  const disponibles = await obtenerUsuariosDisponiblesParaRecomendar(usuarioIdDelContextoARecomendar);
  usuariosDisponiblesCache = disponibles;
  renderModalSeleccionarUsuarioContactar(disponibles);
}

let temporizadorEstadisticas = null;

function mostrarEstadisticasDebounced() {
  clearTimeout(temporizadorEstadisticas);
  temporizadorEstadisticas = setTimeout(() => { mostrarEstadisticas(); }, 500);
}

function iniciarSSE() {
  const source = new EventSource(API_BACKEND_URL + 'eventos');

  source.addEventListener('conectado', async () => {
    console.log('SSE conectado');
    await recargarTodo();
    refrescarVistaClientes();
    if (store.citasConcluidasCargado) {
      await recargarCitasConcluidas();
      refrescarVistaCitas();
    }
  });

  source.addEventListener('cliente-creado', e => {
    const { cliente } = JSON.parse(e.data);
    guardarClienteEnStore(cliente);
    refrescarVistaClientes();
  });


  source.addEventListener('cliente-editado', e => {
    const { cliente } = JSON.parse(e.data);
    guardarClienteEnStore(cliente);
    refrescarVistaClientes();
  });

  source.addEventListener('cliente-eliminado', e => {
    const { id, cliente } = JSON.parse(e.data);
    quitarClienteDelStore(id ?? cliente?.id);
    refrescarVistaClientes();
  });

  source.addEventListener('reserva-agregada', e => {
    //  mostrarAlertas();
    const { reserva } = JSON.parse(e.data);
    if (!reserva) return;
    store.citas.set(String(reserva.reservationId), reserva);
    refrescarVistaCitas();
  })

  //reservas 
  source.addEventListener('reserva-eliminada', e => {

    //  mostrarAlertas();
    const { reserva } = JSON.parse(e.data);
    if (!reserva) return;
    store.citas.delete(String(reserva.reservationId));
    refrescarVistaCitas();
  });

  source.addEventListener('reserva-editada', e => {
    //        mostrarAlertas();
    //actualizarBadgeAgenda();
    //actualizarBadgeCitasProgramadas();
    const { reserva } = JSON.parse(e.data);
    if (!reserva) return;
    store.citas.set(String(reserva.reservationId), reserva);
    refrescarVistaCitas();
  })

  source.addEventListener('historial-contactado', e => {
    const { historial } = JSON.parse(e.data);
    if (!historial) return;
    // La lista es solo de contactados: si se desmarca, el doc sale del Map
    if (historial.wasContacted) store.contactados.set(String(historial.id), historial);
    else store.contactados.delete(String(historial.id));
    refrescarVistaContactados();
  });

  source.addEventListener('historial-editado', e => {
    const { historial } = JSON.parse(e.data);
    if (!historial) return;
    if (normalizarBooleanContactado(historial.wasContacted)) store.contactados.set(String(historial.id), historial);
    else store.contactados.delete(String(historial.id));
    refrescarVistaContactados();
  });

  // El doc nascent no trae wasContacted, asi que no entra a la lista de contactados
  source.addEventListener('historial-guardado', e => {
    const { historial } = JSON.parse(e.data);
    if (!historial) return;
    if (normalizarBooleanContactado(historial.wasContacted)) store.contactados.set(String(historial.id), historial);
    refrescarVistaContactados();
  });
  // En tu archivo de sockets / init
  source.addEventListener('usuario-agregado', async e => {
    const { usuario } = JSON.parse(e.data);
    if (!usuario) return;
    store.usuarios.set(claveUsuario(usuario), usuario);
    refrescarVistaUsuarios();

    // Actualiza el modal solo si está abierto y hay un contexto activo
    const modalAbierto = document.getElementById('modalSeleccionarUsuarioContactar')
      ?.classList.contains('active');

    if (modalAbierto && usuarioIdDelContextoARecomendar) {
      await refrescarModalRecomendados();
    }
  });

  source.addEventListener('usuario-editado', async e => {
    const { usuario, _id } = JSON.parse(e.data);
    if (!usuario) return;
    const key = claveUsuario(usuario);
    // Si la cedula cambio la llave vieja queda huerfana: se recarga el Map completo
    if (store.usuarios.has(key) || _id === key) store.usuarios.set(key, usuario);
    else await recargarUsuarios();
    refrescarVistaUsuarios();
  });

  source.addEventListener('meRecomendaron-editado', async e => {
    const { usuario } = JSON.parse(e.data);
    if (usuario) store.usuarios.set(claveUsuario(usuario), usuario);

    const modalAbierto = document.getElementById('modalSeleccionarUsuarioContactar')
      ?.classList.contains('active');

    if (modalAbierto && usuarioIdDelContextoARecomendar) {
      await refrescarModalRecomendados();
    }
  });

  source.addEventListener('usuario-eliminado', async e => {
    const { id, usuario } = JSON.parse(e.data);
    // La clave puede ser la cedula o el _id (cedula ".")
    const key = usuario ? claveUsuario(usuario) : String(id ?? '');
    if (key) store.usuarios.delete(key);
    refrescarVistaUsuarios();

    const modalAbierto = document.getElementById('modalSeleccionarUsuarioContactar')
      ?.classList.contains('active');
    if (modalAbierto && usuarioIdDelContextoARecomendar) {
      await refrescarModalRecomendados();
    }
  });

  source.addEventListener('meRecomendo-agregado', e => {
    const { usuario } = JSON.parse(e.data);
    if (!usuario) return;
    store.usuarios.set(claveUsuario(usuario), usuario);
    refrescarVistaUsuarios();
  });

  // Para estadísticas
  source.addEventListener('usuarioRecomendado-agregado', e => {
    const { usuario } = JSON.parse(e.data);
    if (usuario) store.usuarios.set(claveUsuario(usuario), usuario);
    refrescarVistaUsuarios();
    mostrarEstadisticasDebounced();
  });
  source.addEventListener('agregarPuntos-compraAlta', e => {
    const { usuario } = JSON.parse(e.data);
    if (usuario) store.usuarios.set(claveUsuario(usuario), usuario);
    refrescarVistaUsuarios();
    mostrarEstadisticasDebounced();
  });
  source.addEventListener('agregarPuntos-compraRecurrente', e => {
    const { usuario } = JSON.parse(e.data);
    if (usuario) store.usuarios.set(claveUsuario(usuario), usuario);
    refrescarVistaUsuarios();
    mostrarEstadisticasDebounced();
  });
  source.addEventListener('puntosEditados', e => {
    const { usuario } = JSON.parse(e.data);
    if (usuario) store.usuarios.set(claveUsuario(usuario), usuario);
    refrescarVistaUsuarios();
    mostrarEstadisticasDebounced();
  });
  source.addEventListener('reservacion-concluida', e => {
    const { reserva } = JSON.parse(e.data);
    if (!reserva) return;
    const key = String(reserva.reservationId);
    store.citas.delete(key);
    if (store.citasConcluidasCargado) store.citasConcluidas.set(key, reserva);
    refrescarVistaCitas();
  })

  // Cuando se crea un pedido nuevo
  function refrescarPedidosSiVisible() {
    const filtro = document.getElementById('buscadorPedidos')?.value || '';
    if (modoPedidosHoy || filtro.trim()) {
      mostrarPedidos(filtro);
    }
  }

  source.addEventListener('pedido-agregado', e => {
    const { id, pedido } = JSON.parse(e.data);
    if (!pedido) return;
    store.pedidos.set(String(pedido._id ?? id), pedido);
    refrescarPedidosSiVisible();
  });
  source.addEventListener('pedido-editado', e => {
    const { id, pedido } = JSON.parse(e.data);
    if (!pedido) return;
    store.pedidos.set(String(pedido._id ?? id), pedido);
    refrescarPedidosSiVisible();
  });
  source.addEventListener('pedido-eliminado', e => {
    const { id, pedido } = JSON.parse(e.data);
    const key = String(pedido?._id ?? id ?? '');
    if (key) store.pedidos.delete(key);
    refrescarPedidosSiVisible();
  });




  source.onerror = () => {
    console.warn('SSE desconectado, reconectando...');
    source.close();
    setTimeout(iniciarSSE, 3000);
  };
}

// Llamar esto después del login
document.addEventListener('DOMContentLoaded', () => {
  iniciarSSE();
});


function refrescarVistaClientes() {
  actualizarStats();
  mostrarAlertas();
  refrescarVistaGeneral();
  // actualizarBadgeContactados();
  //mostrarContactados();
}

function refrescarVistaCitas() {
  actualizarBadgeAgenda();
  actualizarBadgeCitasProgramadas();
  renderAgenda();
  renderListaCitasProgramadas(document.getElementById('buscadorCitasProgramadas')?.value || '');
  mostrarAlertas();
  if (document.getElementById('tab-database')?.classList.contains('active'))
    mostrarGeneral(document.getElementById('buscadorGeneral')?.value || '');
  if (document.getElementById('tab-historial')?.classList.contains('active'))
    buscarHistorial();
}

function refrescarVistaUsuarios() {
  mostrarUsuarios(document.getElementById('buscadorUsuarios')?.value || '');
  refrescarModalBuscarUsuarioSiAbierto();
}

function refrescarVistaContactados() {
  actualizarBadgeContactados();
  mostrarContactados(document.getElementById('buscadorContactados')?.value || '');
}

function refrescarVistaGeneral() {
  if (document.getElementById('tab-database')?.classList.contains('active'))
    mostrarGeneral(document.getElementById('buscadorGeneral')?.value || '');
}
