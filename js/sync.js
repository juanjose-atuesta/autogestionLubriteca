
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
function iniciarSSE() {
  const source = new EventSource(API_BACKEND_URL + 'eventos');

  source.addEventListener('conectado', () => {
    console.log('SSE conectado');
  });

  source.addEventListener('cliente-creado', () => {
    actualizar();
  });


  source.addEventListener('cliente-editado', () => {

    actualizarBadgeContactados();
  });


  source.addEventListener('cliente-eliminado', () => {
    actualizar();
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

// ═══════════ SINCRONIZAR CON GOOGLE SHEETS (CORREGIDO) ═══════════
function sincronizarConSheets() {
  mostrarCargando(true);

  fetch(API_BACKEND_URL + "customers/customersList")
    .then(res => {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json();
    })
    .then(datos => {
      if (!datos || !Array.isArray(datos.customers)) {
        throw new Error('Respuesta inválida');
      }

      // Sincronizar clientes
      console.log(datos);
      const clientesSheets = datos.customers
        .map(c => ({
          ...c,
          id: String(c.id),
          name: String(c.name),
          telephone: String(c.telephone),
          plate: String(c.plate).toUpperCase().trim(),
          service: String(c.service),
          entryDate: String(c.entryDate),
          nextContact: String(c.nextContact),
          mileage: String(c.mileage)
        }));

      //migrarClientesAHistorial();
      actualizarStats();
      mostrarAlertas();
      actualizarBadgeContactados();
      actualizarBadgeUsuarios();
      actualizarBadgeAgenda();
      actualizarBadgeCitasProgramadas();
      if (document.getElementById('tab-database').classList.contains('active'))
        mostrarGeneral(document.getElementById('buscadorGeneral').value);
      if (document.getElementById('tab-contactados').classList.contains('active'))
        mostrarContactados();
      if (document.getElementById('tab-usuarios').classList.contains('active'))
        mostrarUsuarios(document.getElementById('buscadorUsuarios').value);
      if (document.getElementById('tab-historial').classList.contains('active'))
        buscarHistorial();
      if (document.getElementById('tab-agenda').classList.contains('active'))
        renderAgenda();
      if (document.getElementById('tab-citas-programadas').classList.contains('active'))
        renderListaCitasProgramadas(document.getElementById('buscadorCitasProgramadas').value);
      console.log('✓ ' + clientesSheets.length + ' clientes sincronizados desde Sheets');
    })
    .catch(err => {
      console.warn('Sheets no disponible — usando datos locales:', err.message);
    })
    .finally(() => {
      mostrarCargando(false);
    });
}



// 🔧 CORREGIDO: sincronizarSoloCitas con manejo de string para citaId
/*
async function sincronizarSoloCitas() {
  try {
    const res = await fetch(API_BACKEND_URL + "reservations/reservationsList");
    const datos = await res.json();
    if (!datos.ok || !Array.isArray(datos.reservationList)) return;

    const citasSheets = datos.reservationList.map(c => ({
      reservationId: String(c.reservationId),
      plate: String(c.plate || '').toUpperCase().trim(),
      name: String(c.name || ''),
      telephone: String(c.telephone || ''),
      service: String(c.service || ''),
      date: String(c.date || ''),
      hour: String(c.hour || ''),
      space: String(c.space || ''),
      notes: String(c.notes || '')
    }));

    const idsSheets = new Set(citasSheets.map(c => c.citaId));
    const citasLocales = getCitas();
    const ahora = Date.now();

    const pendientes = citasLocales.filter(c =>
      !idsSheets.has(String(c.citaId)) && (ahora - Number(c.citaId)) < 600000
    );

    const citasMerge = [...citasSheets, ...pendientes];

    const localIds = new Set(citasLocales.map(c => String(c.citaId)));
    const sheetsIds = new Set(citasMerge.map(c => String(c.citaId)));
    const hayDiferencia =
      citasMerge.length !== citasLocales.length ||
      [...sheetsIds].some(id => !localIds.has(id)) ||
      [...localIds].some(id => !sheetsIds.has(id));

    if (hayDiferencia) {
      setCitas().then(respuesta => {
        console.log(respuesta.status);
        actualizarBadgeAgenda();
        mostrarAlertas();
        if (document.getElementById('tab-database').classList.contains('active'))
          mostrarGeneral(document.getElementById('buscadorGeneral').value);
      })
    }
  } catch (err) {
    console.warn('Sync citas falló:', err.message);
  }
}
 */
