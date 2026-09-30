
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

function iniciarSSE() {
  const source = new EventSource(API_BACKEND_URL + 'eventos');

  source.addEventListener('conectado', async () => {
    console.log('SSE conectado');
    await recargarTodo();
    refrescarVistaClientes();
  });

  source.addEventListener('cliente-creado', e => {
    const { cliente } = JSON.parse(e.data);
    store.clientes.set(String(cliente.id ?? cliente._id), cliente);
    refrescarVistaClientes();
  });


  source.addEventListener('cliente-editado', e => {
    const { cliente } = JSON.parse(e.data);
    store.clientes.set(String(cliente.id ?? cliente._id), cliente); // reemplaza el anterior
    refrescarVistaClientes();
  });

  source.addEventListener('cliente-eliminado', e => {
    const { id } = JSON.parse(e.data);
    store.clientes.delete(String(id));
    refrescarVistaClientes();
  });

  source.addEventListener('cliente-citaConcluida', () => {
    mostrarAlertas();
    actualizarStats();

  });


  source.addEventListener('reserva-agregada', () => {
    //  mostrarAlertas();
    actualizarBadgeAgenda();
    actualizarBadgeCitasProgramadas();
    renderAgenda();
    renderListaCitasProgramadas(document.getElementById('buscadorCitasProgramadas').value);

  })

  //reservas 
  source.addEventListener('reserva-eliminada', () => {

    //  mostrarAlertas();
    actualizarBadgeAgenda();
    actualizarBadgeCitasProgramadas();
    renderAgenda();
    renderListaCitasProgramadas(document.getElementById('buscadorCitasProgramadas').value);

  });

  source.addEventListener('reserva-editada', () => {
    //        mostrarAlertas();
    //actualizarBadgeAgenda();
    //actualizarBadgeCitasProgramadas();
    renderAgenda();
    renderListaCitasProgramadas(document.getElementById('buscadorCitasProgramadas').value);

  })

  source.addEventListener('historial-guardado', () => {
    buscarHistorial();
  })
  // En tu archivo de sockets / init
  source.addEventListener('usuario-agregado', async () => {
    // Actualiza la lista principal siempre
    mostrarUsuarios(document.getElementById('buscadorUsuarios')?.value || '');

    // Actualiza el modal solo si está abierto y hay un contexto activo
    const modalAbierto = document.getElementById('modalSeleccionarUsuarioContactar')
      ?.classList.contains('active');

    if (modalAbierto && usuarioIdDelContextoARecomendar) {
      await refrescarModalRecomendados();
    }
  });

  source.addEventListener('meRecomendaron-editado', async () => {
    const modalAbierto = document.getElementById('modalSeleccionarUsuarioContactar')
      ?.classList.contains('active');

    if (modalAbierto && usuarioIdDelContextoARecomendar) {
      await refrescarModalRecomendados();
    }
  });

  source.addEventListener('usuario-eliminado', async () => {
    mostrarUsuarios(document.getElementById('buscadorUsuarios')?.value || '');

    const modalAbierto = document.getElementById('modalSeleccionarUsuarioContactar')
      ?.classList.contains('active');
    if (modalAbierto && usuarioIdDelContextoARecomendar) {
      await refrescarModalRecomendados();
    }
  });

  // Para estadísticas
  source.addEventListener('usuarioRecomendado-agregado', () => mostrarEstadisticas());
  source.addEventListener('agregarPuntos-compraAlta', () => mostrarEstadisticas());
  source.addEventListener('agregarPuntos-compraRecurrente', () => mostrarEstadisticas());
  source.addEventListener('puntosEditados', () => mostrarEstadisticas());
  source.addEventListener('reservacion-concluida', () => {
    renderAgenda();
    renderListaCitasProgramadas(document.getElementById('buscadorCitasProgramadas').value);

  })

  // Cuando se crea un pedido nuevo
  function refrescarPedidosSiVisible() {
    const filtro = document.getElementById('buscadorPedidos')?.value || '';
    if (modoPedidosHoy || filtro.trim()) {
      mostrarPedidos(filtro);
    }
  }

  source.addEventListener('pedido-agregado', refrescarPedidosSiVisible);
  source.addEventListener('pedido-editado', refrescarPedidosSiVisible);
  source.addEventListener('pedido-eliminado', refrescarPedidosSiVisible);




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
  // actualizarBadgeContactados();
  //mostrarContactados();
}
