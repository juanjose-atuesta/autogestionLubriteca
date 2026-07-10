function formatoEspacioHistorial(space) {
  const valor = String(space || '').trim();
  const etiquetas = {
    carcamo: 'Cárcamo',
    gato_hidraulico: 'Gato Hidráulico',
    gato_electrico: 'Gato Eléctrico'
  };
  return etiquetas[valor] || valor || '—';
}

function compararFechaHoraDesc(a = {}, b = {}) {
  const claveA = `${String(a.date || '')} ${String(a.hour || '')}`;
  const claveB = `${String(b.date || '')} ${String(b.hour || '')}`;
  return claveB.localeCompare(claveA);
}

function renderEstadoInicialHistorial() {
  const res = document.getElementById('historialResultado');
  if (!res) return;
  res.innerHTML = `<div class="empty-state"><div class="empty-icon">◎</div><p>Escribe un criterio para filtrar citas concluidas (placa, nombre, servicio, fecha o teléfono).</p></div>`;
}

// ═══════════ HISTORIAL (CITAS CONCLUIDAS) ═══════════
async function buscarHistorial() {
  const res = document.getElementById('historialResultado');
  const input = document.getElementById('buscadorPlaca');
  if (!res || !input) return;

  const busqueda = String(input.value || '').trim();
  const busquedaUpper = busqueda.toUpperCase();

  const citasRaw = await getReservationsConcluded();
  const citasConcluidas = (Array.isArray(citasRaw) ? citasRaw : [])
    .filter(c => normalizarBooleanConcluido(c.wasConcluded))
    .sort(compararFechaHoraDesc);

  if (!busqueda) {
    const recientes = citasConcluidas.slice(0, 20);
    if (!recientes.length) {
      res.innerHTML = `<div class="empty-state"><div class="empty-icon">○</div><p>No hay citas concluidas para mostrar.</p></div>`;
      return;
    }
    res.innerHTML = '';
    res.innerHTML = `<div class="historial-placa-header"><div class="historial-meta"><strong>${citasConcluidas.length}</strong> cita${citasConcluidas.length !== 1 ? 's' : ''} concluida${citasConcluidas.length !== 1 ? 's' : ''} · mostrando las <strong>${recientes.length}</strong> más recientes</div></div>`;
    res.innerHTML += `<div class="historial-timeline">${recientes.map((cita, idx) => {
      const nombre = String(cita.name || '—').trim();
      const telefono = String(cita.telephone || '—').trim();
      const placa = String(cita.plate || '—').toUpperCase().trim();
      const servicio = String(cita.service || '—').trim();
      const fecha = String(cita.date || '—').trim();
      const hora = String(cita.hour || '—').trim();
      const espacio = formatoEspacioHistorial(cita.space);
      const notas = String(cita.notes || '').trim();
      return `<div class="historial-item"><div class="historial-linea"><div class="historial-dot dot-actual"></div>${idx !== recientes.length - 1 ? '<div class="historial-connector"></div>' : ''}</div>
        <div class="historial-card card-actual">
          <div class="historial-card-top">
            <div class="historial-nombre">${nombre}<small>${telefono}</small></div>
            <span class="badge-estado badge-contactado">✓ CONCLUIDA</span>
          </div>
          <div class="historial-card-info">
            <div class="historial-info-item">🚗 <strong>${placa}</strong></div>
            <div class="historial-info-item">🔧 <strong>${servicio}</strong></div>
            <div class="historial-info-item">📍 <strong>${espacio}</strong></div>
            <div class="historial-info-item">📅 <strong>${fecha}</strong></div>
            <div class="historial-info-item">🕒 <strong>${hora}</strong></div>
            ${notas ? `<div class="historial-info-item">📝 <strong>${notas}</strong></div>` : ''}
          </div>
        </div></div>`;
    }).join('')}</div>`;
    return;
  }

  const filtradas = citasConcluidas.filter(cita => {
    const nombre = String(cita.name || '').toUpperCase();
    const telefono = String(cita.telephone || '').toUpperCase();
    const placa = String(cita.plate || '').toUpperCase();
    const servicio = String(cita.service || '').toUpperCase();
    const fecha = String(cita.date || '').toUpperCase();
    const hora = String(cita.hour || '').toUpperCase();
    const espacio = formatoEspacioHistorial(cita.space).toUpperCase();
    const reservationId = String(cita.reservationId || '').toUpperCase();

    return nombre.includes(busquedaUpper) ||
      telefono.includes(busquedaUpper) ||
      placa.includes(busquedaUpper) ||
      servicio.includes(busquedaUpper) ||
      fecha.includes(busquedaUpper) ||
      hora.includes(busquedaUpper) ||
      espacio.includes(busquedaUpper) ||
      reservationId.includes(busquedaUpper);
  });

  if (!filtradas.length) {
    res.innerHTML = `<div class="empty-state"><div class="empty-icon">○</div><p>No se encontraron citas concluidas para "<strong>${busqueda}</strong>".</p></div>`;
    return;
  }

  res.innerHTML = `<div class="historial-placa-header"><div class="historial-meta"><strong>${filtradas.length}</strong> resultado${filtradas.length !== 1 ? 's' : ''} para "<strong>${busqueda}</strong>"</div></div>`;
  res.innerHTML += `<div class="historial-timeline">${filtradas.map((cita, idx) => {
    const nombre = String(cita.name || '—').trim();
    const telefono = String(cita.telephone || '—').trim();
    const placa = String(cita.plate || '—').toUpperCase().trim();
    const servicio = String(cita.service || '—').trim();
    const fecha = String(cita.date || '—').trim();
    const hora = String(cita.hour || '—').trim();
    const espacio = formatoEspacioHistorial(cita.space);
    const notas = String(cita.notes || '').trim();
    return `<div class="historial-item"><div class="historial-linea"><div class="historial-dot dot-actual"></div>${idx !== filtradas.length - 1 ? '<div class="historial-connector"></div>' : ''}</div>
      <div class="historial-card card-actual">
        <div class="historial-card-top">
          <div class="historial-nombre">${nombre}<small>${telefono}</small></div>
          <span class="badge-estado badge-contactado">✓ CONCLUIDA</span>
        </div>
        <div class="historial-card-info">
          <div class="historial-info-item">🚗 <strong>${placa}</strong></div>
          <div class="historial-info-item">🔧 <strong>${servicio}</strong></div>
          <div class="historial-info-item">📍 <strong>${espacio}</strong></div>
          <div class="historial-info-item">📅 <strong>${fecha}</strong></div>
          <div class="historial-info-item">🕒 <strong>${hora}</strong></div>
          ${notas ? `<div class="historial-info-item">📝 <strong>${notas}</strong></div>` : ''}
        </div>
      </div></div>`;
  }).join('')}</div>`;
}

function consultarHistorialHoy() {
  document.getElementById('buscadorPlaca').value = getHoy();
  buscarHistorial();
  document.getElementById('buscadorPlaca').focus();
}

function limpiarHistorial() {
  document.getElementById('buscadorPlaca').value = '';
  buscarHistorial();
  document.getElementById('buscadorPlaca').focus();
}
