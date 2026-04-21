
function abrirModalReservar(clienteId, placa, nombre, telefono, categoria) {
  document.getElementById('reservarClienteId').value = clienteId;
  document.getElementById('reservarPlacaH').value = placa;
  document.getElementById('reservarNombreH').value = nombre;
  document.getElementById('reservarTelefonoH').value = telefono;
  document.getElementById('reservarCategoriaH').value = categoria;
  document.getElementById('reservarFecha').value = getHoy();
  document.getElementById('reservarNotas').value = '';
  document.getElementById('reservarHora').value = '';
  document.getElementById('reservarEspacio').value = '';
  reservarEspacioActual = null;
  reservarHoraActual = null;

  document.getElementById('reservarInfo').innerHTML = `
        <div class="reservar-info-placa">${placa}</div>
        <div class="reservar-info-detalle"><strong>${nombre}</strong><br>${categoria} · ${telefono}</div>`;

  document.getElementById('reservarPaso1').style.display = 'block';
  document.getElementById('reservarPaso2').style.display = 'none';
  document.getElementById('reservarPaso3').style.display = 'none';
  document.getElementById('reservarPaso4').style.display = 'none';
  document.getElementById('btnConfirmarReserva').style.display = 'none';

  document.querySelectorAll('.espacio-btn').forEach(b => b.classList.remove('seleccionado'));

  document.getElementById('modalReservar').classList.add('active');
  mostrarPaso2();
}

function mostrarPaso2() {
  const fecha = document.getElementById('reservarFecha').value;
  if (!fecha) return;
  document.getElementById('reservarPaso2').style.display = 'block';
  document.getElementById('reservarPaso3').style.display = 'none';
  document.getElementById('reservarPaso4').style.display = 'none';
  document.getElementById('btnConfirmarReserva').style.display = 'none';
  reservarEspacioActual = null;
  reservarHoraActual = null;
  document.querySelectorAll('.espacio-btn').forEach(b => b.classList.remove('seleccionado'));
}

function seleccionarEspacio(espacio) {
  reservarEspacioActual = espacio;
  reservarHoraActual = null;
  document.getElementById('reservarEspacio').value = espacio;

  document.querySelectorAll('.espacio-btn').forEach(b => b.classList.remove('seleccionado'));
  const claseMap = { carcamo: 'espacio-carcamo', gato_hidraulico: 'espacio-hidraulico', gato_electrico: 'espacio-electrico' };
  document.querySelector('.' + claseMap[espacio]).classList.add('seleccionado');

  mostrarHorasDisponibles();
}

async function mostrarHorasDisponibles() {
  const date = document.getElementById('reservarFecha').value;
  const space = reservarEspacioActual;
  if (!date || !space) return;
  const citas = await getCitas();

  const ocupadas = new Set(
    citas
      .filter(c => c.date === date && c.space === space)
      .map(c => c.hour)
  );

  const hayDisponibles = HORAS.some(h => !ocupadas.has(h));

  let html = '';
  if (!hayDisponibles) {
    html = `<div class="sin-horas-msg">⚠ No hay horarios disponibles para este espacio en la fecha seleccionada. Prueba con otro espacio u otra fecha.</div>`;
  } else {
    HORAS.forEach(h => {
      const ocupada = ocupadas.has(h);
      html += `<button class="hora-btn ${ocupada ? 'ocupada' : ''}"
                ${ocupada ? 'disabled title="Horario ocupado"' : 'onclick="seleccionarHora(\'' + h + '\')"'}>
                ${HORAS_DISPLAY[h]}${ocupada ? ' 🔒' : ''}
            </button>`;
    });
  }

  document.getElementById('horasDisponibles').innerHTML = html;
  document.getElementById('horaSeleccionadaInfo').style.display = 'none';
  document.getElementById('reservarPaso3').style.display = 'block';
  document.getElementById('reservarPaso4').style.display = 'none';
  document.getElementById('btnConfirmarReserva').style.display = 'none';
}

function seleccionarHora(hora) {
  reservarHoraActual = hora;
  document.getElementById('reservarHora').value = hora;

  document.querySelectorAll('.hora-btn').forEach(b => b.classList.remove('seleccionada'));
  event.target.classList.add('seleccionada');

  const esp = ESPACIOS[reservarEspacioActual];
  document.getElementById('horaSeleccionadaInfo').textContent =
    `✓ Seleccionado: ${HORAS_DISPLAY[hora]} en ${esp.icono} ${esp.nombre}`;
  document.getElementById('horaSeleccionadaInfo').style.display = 'block';

  document.getElementById('reservarPaso4').style.display = 'block';
  document.getElementById('btnConfirmarReserva').style.display = 'inline-flex';
}

// 🔧 CORREGIDO: confirmarReserva con citaId string y fetch mode:'cors'
async function confirmarReserva() {
  const date = document.getElementById('reservarFecha').value;
  const hour = document.getElementById('reservarHora').value;
  const space = document.getElementById('reservarEspacio').value;
  const notes = document.getElementById('reservarNotas').value.trim();
  const plate = document.getElementById('reservarPlacaH').value;
  const name = document.getElementById('reservarNombreH').value;
  const telephone = document.getElementById('reservarTelefonoH').value;
  const service = document.getElementById('reservarCategoriaH').value;
  const customerId = document.getElementById('reservarClienteId').value;

  if (!date || !hour || !space) { alert('Completa todos los pasos antes de confirmar.'); return; }
  try {
    const citas = await getCitas();
    const conflicto = citas.find(c => c.date === date && c.hour === hour && c.space === space);
    if (conflicto) {
      alert(`⚠ Ya existe una reserva en ese horario para ${ESPACIOS[space].nombre}. Selecciona otra hora o espacio.`);
      return;
    }

    const nuevaCita = {
      reservationId: String(Date.now()),  // 🔧 CORREGIDO: string en lugar de número
      date, hour, space, notes, plate, name, telephone, service, customerId
    };

    // guardamos la cita en la DB 
    const response = await fetch(API_BACKEND_URL + "reservations/saveReservation", {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...nuevaCita })
    });
    if (!response.ok) throw new Error('HTTP ' + response.status);

    cerrarModalReservar();
    await actualizarBadgeAgenda();
    mostrarAlertas();
    if (document.getElementById('tab-database').classList.contains('active'))
      mostrarGeneral(document.getElementById('buscadorGeneral').value);
    if (document.getElementById('tab-agenda').classList.contains('active')) await renderAgenda();
  } catch (error) {
    console.error(error);
  }

  // 🔧 Forzar sincronización inmediata para reflejar en la nube
  //sincronizarSoloCitas();
}

function cerrarModalReservar() { document.getElementById('modalReservar').classList.remove('active'); }

// ═══════════════════════════════════════════
// AGENDA — RENDER PRINCIPAL
// ═══════════════════════════════════════════
async function actualizarBadgeAgenda() {
  const citas = await getCitas();
  const hoy = getHoy();
  const total = citas.filter(c => c.date === hoy).length;
  document.getElementById('nav-badge-agenda').textContent = total;
}

async function irHoyAgenda() {
  document.getElementById('agendaFecha').value = getHoy();
  await renderAgenda();
}

async function cambiarDiaAgenda(delta) {
  const input = document.getElementById('agendaFecha');
  const fecha = input.value || getHoy();
  const [y, m, d] = fecha.split('-').map(Number);
  input.value = new Date(y, m - 1, d + delta).toLocaleDateString('en-CA');
  await renderAgenda();
}

async function setFiltroAgenda(filtro) {
  filtroAgendaActual = filtro;
  document.querySelectorAll('.agenda-filtro-btn').forEach(b => b.classList.remove('activo'));
  document.getElementById('filtro-' + filtro).classList.add('activo');
  await renderAgenda();
}

async function renderAgenda() {
  const fecha = document.getElementById('agendaFecha').value || getHoy();
  const label = document.getElementById('agendaFechaLabel');
  const contenido = document.getElementById('agendaContenido');
  const resumen = document.getElementById('agendaResumen');
  const horaActual = new Date().toLocaleTimeString('en-CA', { hour: '2-digit', minute: '2-digit', hour12: false }).substring(0, 5);

  label.textContent = formatearFechaLarga(fecha);
  const citas = await getCitas();

  let citasDelDia = citas.filter(c => c.date === fecha);
  if (filtroAgendaActual !== 'todos') citasDelDia = citasDelDia.filter(c => c.space === filtroAgendaActual);

  const totalCitas = citasDelDia.length;
  const espaciosOcupados = new Set(citasDelDia.map(c => c.space)).size;
  resumen.textContent = totalCitas > 0
    ? `${totalCitas} cita${totalCitas !== 1 ? 's' : ''} · ${espaciosOcupados} espacio${espaciosOcupados !== 1 ? 's' : ''} ocupado${espaciosOcupados !== 1 ? 's' : ''}`
    : 'Sin citas para este día';

  let html = '';

  HORAS.forEach(hora => {
    const citasEnEstaHora = citasDelDia.filter(c => c.hour === hora);
    const esHoraActual = fecha === getHoy() && horaActual >= hora && horaActual < siguienteHora(hora);

    html += `<div class="agenda-slot ${citasEnEstaHora.length > 0 ? 'tiene-citas' : ''}"
            data-fecha="${fecha}" data-hora="${hora}"
            ondragover="onDragOver(event)" ondrop="onDrop(event,'${hora}')">

            <div class="agenda-hora-col ${esHoraActual ? 'hora-actual' : ''}">
                ${HORAS_DISPLAY[hora]}
            </div>

            <div class="agenda-citas-col">`;

    if (citasEnEstaHora.length > 0) {
      citasEnEstaHora.forEach(cita => {
        const esp = ESPACIOS[cita.space] || {};
        html += `
                <div class="agenda-cita-chip ${esp.clase || ''}"
                    draggable="true"
                    data-citaid="${cita.reservationId}"
                    ondragstart="onDragStart(event,'${cita.reservationId}')"
                    ondragend="onDragEnd(event)">
                    <span class="cita-espacio-tag ${esp.tag || ''}">${esp.icono || ''} ${esp.nombre || cita.space}</span>
                    <span class="cita-placa">${cita.plate}</span>
                    <div class="cita-info">
                        ${cita.name}
                        ${cita.notes ? `<small>📝 ${cita.notes}</small>` : ''}
                    </div>
                    <div class="cita-acciones">
                        <button class="btn-ver-cita" onclick="verDetalleCita('${cita.reservationId}')" title="Ver detalle">👁</button>
                        <button class="btn-del-cita-chip" onclick="if(confirm('¿Cancelar esta reserva?')){eliminarCita('${cita.reservationId}')}">✕</button>
                    </div>
                </div>`;
      });
    } else {
      html += `<div class="agenda-empty-slot"
                ondragover="onDragOver(event)" ondrop="onDrop(event,'${hora}')">
                Sin reservas
            </div>`;
    }

    html += `</div></div>`;
  });

  contenido.innerHTML = html;
  await actualizarBadgeAgenda();
}

function siguienteHora(hora) {
  const idx = HORAS.indexOf(hora);
  return idx < HORAS.length - 1 ? HORAS[idx + 1] : '23:59';
}

// 🔧 CORREGIDO: eliminarCita sin código duplicado y con fetch mode:'cors'
function eliminarCita(citaId) {

  // Enviar eliminación a Google Sheets
  fetch(API_BACKEND_URL + "reservations/deleteReservation/" + citaId, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' }
  }).then(response => {
    console.log(response.status);
  })
    .catch(console.error);

  actualizarBadgeAgenda();
  mostrarAlertas();
  if (document.getElementById('tab-database').classList.contains('active'))
    mostrarGeneral(document.getElementById('buscadorGeneral').value);
  renderAgenda();
}

async function verDetalleCita(citaId) {
  const citas = await getCitas();
  const cita = citas.find(c => String(c.reservationId) === String(citaId));
  if (!cita) return;

  const esp = ESPACIOS[cita.space] || {};
  const hoy = getHoy();
  const waTxt = encodeURIComponent(`Hola ${cita.name}, te confirmamos tu cita en ${cita.space} el ${cita.date} a las ${HORAS_DISPLAY[cita.hour]}. ¡Te esperamos!`);
  const esHoy = cita.date === hoy;
  const esPasada = cita.date < hoy;

  const estadoFecha = esHoy
    ? `<span class="badge-estado badge-hoy">⚠ HOY</span>`
    : esPasada
      ? `<span class="badge-estado badge-vencido">Pasada</span>`
      : `<span class="badge-estado badge-ok">Próxima</span>`;

  document.getElementById('detalleCitaContenido').innerHTML = `
        <div class="detalle-espacio-header detalle-espacio-${cita.space}">
            <span class="detalle-espacio-icon">${esp.icono}</span>
            <div>
                <div class="detalle-espacio-nombre">${cita.space}</div>
                <div class="detalle-espacio-hora">${HORAS_DISPLAY[cita.hour]} · ${cita.date} ${estadoFecha}</div>
            </div>
        </div>
        <div class="detalle-seccion">
            <div class="detalle-seccion-titulo">📋 Datos de la Cita</div>
            <div class="detalle-grid">
                <div class="detalle-item"><span class="detalle-label">Placa</span><span class="detalle-valor detalle-placa">${cita.plate}</span></div>
                <div class="detalle-item"><span class="detalle-label">Servicio</span><span class="detalle-valor">${cita.service}</span></div>
                <div class="detalle-item"><span class="detalle-label">Fecha</span><span class="detalle-valor">${cita.date}</span></div>
                <div class="detalle-item"><span class="detalle-label">Hora</span><span class="detalle-valor">${HORAS_DISPLAY[cita.hour]}</span></div>
                ${cita.notes ? `<div class="detalle-item detalle-item-full"><span class="detalle-label">Notas</span><span class="detalle-valor">📝 ${cita.notes}</span></div>` : ''}
            </div>
        </div>
        <div class="detalle-seccion">
            <div class="detalle-seccion-titulo">👤 Datos del Cliente</div>
            <div class="detalle-grid">
                <div class="detalle-item"><span class="detalle-label">Nombre</span><span class="detalle-valor">${cita.name}</span></div>
                <div class="detalle-item"><span class="detalle-label">Teléfono</span><span class="detalle-valor">${cita.telephone}</span></div>
            </div>
        </div>
        <div class="detalle-acciones">
            <a href="https://wa.me/57${cita.telephone}?text=${waTxt}" target="_blank" class="btn-wa btn-detalle-wa">
                📱 Contactar por WhatsApp
            </a>
            <button class="btn-del btn-detalle-del" onclick="if(confirm('¿Cancelar esta reserva?')){eliminarCita('${cita.reservationId}');cerrarDetalleCita();}">
                ✕ Cancelar reserva
            </button>
        </div>`;

  document.getElementById('modalDetalleCita').classList.add('active');
}

function cerrarDetalleCita() {
  document.getElementById('modalDetalleCita').classList.remove('active');
}

// ═══════════════════════════════════════════
// DRAG & DROP
// ═══════════════════════════════════════════
function onDragStart(event, citaId) {
  dragCitaId = citaId;
  event.target.classList.add('dragging');
  event.dataTransfer.effectAllowed = 'move';
}

function onDragEnd(event) {
  event.target.classList.remove('dragging');
  document.querySelectorAll('.agenda-slot,.agenda-empty-slot').forEach(el => el.classList.remove('drop-target'));
}

function onDragOver(event) {
  event.preventDefault();
  event.dataTransfer.dropEffect = 'move';
  const slot = event.currentTarget;
  document.querySelectorAll('.agenda-slot,.agenda-empty-slot').forEach(el => el.classList.remove('drop-target'));
  slot.classList.add('drop-target');
}

async function onDrop(event, nuevaHora) {
  event.preventDefault();
  document.querySelectorAll('.agenda-slot,.agenda-empty-slot').forEach(el => el.classList.remove('drop-target'));

  if (!dragCitaId) return;

  const citas = await getCitas();
  const citaIdx = citas.findIndex(c => String(c.reservationId) === String(dragCitaId));
  if (citaIdx === -1) return;

  const cita = citas[citaIdx];
  const fecha = document.getElementById('agendaFecha').value || getHoy();

  const conflicto = citas.find(c =>
    c.date === fecha &&
    c.hour === nuevaHora &&
    c.space === cita.space &&
    String(c.reservationId) !== String(dragCitaId)
  );
  if (conflicto) {
    mostrarToastError(`⚠ ${ESPACIOS[cita.space].nombre} ya tiene una reserva a las ${HORAS_DISPLAY[nuevaHora]}`);
    dragCitaId = null;
    return;
  }

  citas[citaIdx] = { ...cita, hour: nuevaHora };
  fetch(urlGoogle, {
    method: 'POST',
    mode: 'no-cors',
    body: JSON.stringify({ reservationId: String(dragCitaId), hour: nuevaHora, accion: 'mover_cita' })
  }).catch(console.error);
  dragCitaId = null;
  await renderAgenda();
}

function mostrarToastError(msg) {
  let toast = document.getElementById('toastError');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toastError';
    toast.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#fee2e2;border:1px solid #fca5a5;color:#991b1b;padding:12px 20px;border-radius:8px;font-size:0.85rem;font-weight:600;z-index:9999;box-shadow:0 4px 16px rgba(0,0,0,0.12);';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.style.display = 'block';
  setTimeout(() => { toast.style.display = 'none'; }, 3000);
}
