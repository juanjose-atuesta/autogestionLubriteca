function formatoEspacioCita(space) {
  const valor = String(space || '').trim();
  const etiquetas = {
    carcamo: 'Cárcamo',
    gato_hidraulico: 'Gato Hidráulico',
    gato_electrico: 'Gato Eléctrico'
  };
  return etiquetas[valor] || valor;
}

function cerrarModalNotasCita() {
  document.getElementById('modalNotasCita').classList.remove('active');
}

async function abrirModalNotasCita(citaId) {
  const id = String(citaId || '').trim();
  if (!id) return;

  const citas = await getCitas();
  const cita = (Array.isArray(citas) ? citas : []).find(c => String(c.reservationId) === id);
  if (!cita) return;

  const textoNotas = String(cita.notes || '').trim();
  document.getElementById('modalNotasCitaTexto').textContent = textoNotas || 'NO hay notas para esta cita';
  document.getElementById('modalNotasCita').classList.add('active');
}

function cerrarModalEditarReserva() {
  document.getElementById('modalEditarReserva').classList.remove('active');
}

function cargarOpcionesHoraEditarReserva(horaSeleccionada = '') {
  const selectHora = document.getElementById('editReservaHora');
  if (!selectHora) return;

  selectHora.innerHTML = '';
  HORAS.forEach(h => {
    const option = document.createElement('option');
    option.value = h;
    option.textContent = HORAS_DISPLAY[h] || h;
    selectHora.appendChild(option);
  });
  selectHora.value = String(horaSeleccionada || HORAS[0] || '');
}

async function editarCitaProgramada(citaId) {
  const id = String(citaId || '').trim();
  if (!id) return;

  const citas = await getCitas();
  const cita = (Array.isArray(citas) ? citas : []).find(c => String(c.reservationId) === id);
  if (!cita) return;

  cargarOpcionesHoraEditarReserva(cita.hour);
  document.getElementById('editReservaId').value = String(cita.reservationId || '');
  document.getElementById('editReservaCustomerId').value = String(cita.customerId || '');
  document.getElementById('editReservaNombre').value = String(cita.name || '');
  document.getElementById('editReservaTelefono').value = String(cita.telephone || '');
  document.getElementById('editReservaPlaca').value = String(cita.plate || '').toUpperCase().trim();
  const selectServicio = document.getElementById('editReservaServicio');
  const servicioActual = String(cita.service || '').trim();
  const existeServicio = Array.from(selectServicio.options).some(o => o.value === servicioActual);
  if (!existeServicio && servicioActual) {
    const opcionActual = document.createElement('option');
    opcionActual.value = servicioActual;
    opcionActual.textContent = servicioActual;
    selectServicio.appendChild(opcionActual);
  }
  selectServicio.value = servicioActual || 'Otros';
  document.getElementById('editReservaEspacio').value = String(cita.space || 'carcamo');
  document.getElementById('editReservaFecha').value = String(cita.date || '');
  document.getElementById('editReservaHora').value = String(cita.hour || '');
  document.getElementById('editReservaNotas').value = String(cita.notes || '');
  document.getElementById('modalEditarReserva').classList.add('active');
}

async function guardarEdicionReserva() {
  const reservationId = String(document.getElementById('editReservaId').value || '').trim();
  if (!reservationId) return;

  const payload = {
    name: String(document.getElementById('editReservaNombre').value || '').trim(),
    telephone: String(document.getElementById('editReservaTelefono').value || '').trim(),
    plate: String(document.getElementById('editReservaPlaca').value || '').toUpperCase().trim(),
    service: String(document.getElementById('editReservaServicio').value || '').trim(),
    space: String(document.getElementById('editReservaEspacio').value || '').trim(),
    date: String(document.getElementById('editReservaFecha').value || '').trim(),
    hour: String(document.getElementById('editReservaHora').value || '').trim(),
    notes: String(document.getElementById('editReservaNotas').value || '').trim()
  };

  if (!payload.name || !payload.telephone || !payload.plate || !payload.service || !payload.space || !payload.date || !payload.hour) {
    alert('Completa todos los campos obligatorios para guardar los cambios.');
    return;
  }

  const citas = await getCitas();
  const conflicto = (Array.isArray(citas) ? citas : []).find(c =>
    String(c.reservationId) !== reservationId &&
    String(c.date) === payload.date &&
    String(c.hour) === payload.hour &&
    String(c.space) === payload.space
  );
  if (conflicto) {
    alert(`⚠ Ya existe una reserva en ese horario para ${formatoEspacioCita(payload.space)}.`);
    return;
  }

  try {
    const response = await fetch(API_BACKEND_URL + "reservations/editReservation/" + reservationId, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!response.status) throw new Error('HTTP ' + response.status);

    cerrarModalEditarReserva();
    await actualizarBadgeAgenda();
    await actualizarBadgeCitasProgramadas();
    mostrarAlertas();
    if (document.getElementById('tab-database').classList.contains('active'))
      mostrarGeneral(document.getElementById('buscadorGeneral').value);
    if (document.getElementById('tab-citas-programadas').classList.contains('active'))
      renderListaCitasProgramadas(document.getElementById('buscadorCitasProgramadas').value);
    if (document.getElementById('tab-agenda').classList.contains('active')) await renderAgenda();
  } catch (error) {
    console.error(error);
  }
}

async function actualizarBadgeCitasProgramadas() {
  const badge = document.getElementById('nav-badge-citas-programadas');
  if (!badge) return;
  const citas = await getCitas();
  badge.textContent = Array.isArray(citas) ? citas.length : 0;
}

async function renderListaCitasProgramadas(filtro = '') {
  const tbody = document.getElementById('listaCitasProgramadas');
  if (!tbody) return;

  const empty = document.getElementById('emptyCitasProgramadas');
  const tabla = document.getElementById('tablaCitasProgramadas');
  const stats = document.getElementById('statsCitasProgramadas');

  const todas = await getCitas();
  const badge = document.getElementById('nav-badge-citas-programadas');
  if (badge) badge.textContent = Array.isArray(todas) ? todas.length : 0;
  const filtroNormalizado = String(filtro || '').trim().toUpperCase();

  let citas = Array.isArray(todas) ? todas : [];
  if (filtroNormalizado) {
    citas = citas.filter(cita => {
      const nombre = String(cita.name || '').toUpperCase();
      const espacio = formatoEspacioCita(cita.space).toUpperCase();
      const servicio = String(cita.service || '').toUpperCase();
      const hora = String(cita.hour || '').toUpperCase();
      const fecha = String(cita.date || '').toUpperCase();
      const placa = String(cita.plate || '').toUpperCase();

      return nombre.includes(filtroNormalizado) ||
        espacio.includes(filtroNormalizado) ||
        servicio.includes(filtroNormalizado) ||
        hora.includes(filtroNormalizado) ||
        fecha.includes(filtroNormalizado) ||
        placa.includes(filtroNormalizado);
    });
  }

  citas.sort((a, b) => `${String(a.date || '')} ${String(a.hour || '')}`.localeCompare(`${String(b.date || '')} ${String(b.hour || '')}`));

  const totalConNotas = (Array.isArray(todas) ? todas : []).filter(c => String(c.notes || '').trim()).length;
  stats.innerHTML = `
    <div class="db-stat-item"><span class="db-dot" style="background:#3b82f6"></span>${citas.length} mostradas</div>
    <div class="db-stat-item"><span class="db-dot" style="background:#14b8a6"></span>${totalConNotas} con notas</div>
    <div class="db-stats-total">${(Array.isArray(todas) ? todas : []).length} citas</div>`;

  tbody.innerHTML = '';
  if (!citas.length) {
    empty.style.display = 'block';
    tabla.style.display = 'none';
    return;
  }

  empty.style.display = 'none';
  tabla.style.display = '';

  citas.forEach(cita => {
    const tr = document.createElement('tr');

    const celdas = [
      String(cita.name || ''),
      String(cita.telephone || ''),
      String(cita.plate || '').toUpperCase().trim(),
      String(cita.service || ''),
      formatoEspacioCita(cita.space),
      String(cita.date || ''),
      String(cita.hour || '')
    ];

    celdas.forEach(valor => {
      const td = document.createElement('td');
      td.textContent = valor;
      tr.appendChild(td);
    });

    const reservationId = String(cita.reservationId || '').trim();
    const reservationIdSafe = reservationId.replace(/'/g, "\\'");
    const tdAcciones = document.createElement('td');
    tdAcciones.innerHTML = `
      <div class="citas-programadas-acciones">
        <button class="btn-ver-cita" onclick="abrirModalNotasCita('${reservationIdSafe}')" ${reservationId ? '' : 'disabled'}>👁 Ver notas</button>
        <button class="btn-edit" onclick="editarCitaProgramada('${reservationIdSafe}')" ${reservationId ? '' : 'disabled'}>✎ Editar</button>
        <button class="btn-del" onclick="eliminarCita('${reservationIdSafe}')" ${reservationId ? '' : 'disabled'}>✕ Eliminar</button>
      </div>`;
    tr.appendChild(tdAcciones);

    tbody.appendChild(tr);
  });
}

function filtrarListaCitasProgramadas() {
  renderListaCitasProgramadas(document.getElementById('buscadorCitasProgramadas').value);
}

function limpiarBuscadorCitasProgramadas() {
  const buscador = document.getElementById('buscadorCitasProgramadas');
  buscador.value = '';
  renderListaCitasProgramadas();
  buscador.focus();
}
