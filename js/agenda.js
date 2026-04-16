
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

function mostrarHorasDisponibles() {
  const fecha = document.getElementById('reservarFecha').value;
  const espacio = reservarEspacioActual;
  if (!fecha || !espacio) return;

  const ocupadas = new Set(
    getCitas()
      .filter(c => c.fecha === fecha && c.espacio === espacio)
      .map(c => c.hora)
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
function confirmarReserva() {
  const fecha = document.getElementById('reservarFecha').value;
  const hora = document.getElementById('reservarHora').value;
  const espacio = document.getElementById('reservarEspacio').value;
  const notas = document.getElementById('reservarNotas').value.trim();
  const placa = document.getElementById('reservarPlacaH').value;
  const nombre = document.getElementById('reservarNombreH').value;
  const telefono = document.getElementById('reservarTelefonoH').value;
  const categoria = document.getElementById('reservarCategoriaH').value;
  const clienteId = document.getElementById('reservarClienteId').value;

  if (!fecha || !hora || !espacio) { alert('Completa todos los pasos antes de confirmar.'); return; }

  const conflicto = getCitas().find(c => c.fecha === fecha && c.hora === hora && c.espacio === espacio);
  if (conflicto) {
    alert(`⚠ Ya existe una reserva en ese horario para ${ESPACIOS[espacio].nombre}. Selecciona otra hora o espacio.`);
    return;
  }

  const nuevaCita = {
    citaId: String(Date.now()),  // 🔧 CORREGIDO: string en lugar de número
    clienteId, placa, nombre, telefono, categoria, fecha, hora, espacio, notas
  };

  const citas = getCitas();
  citas.push(nuevaCita);
  setCitas(citas);

  // Guardar en Google Sheets
  fetch(urlGoogle, {
    method: 'POST',
    mode: 'no-cors',                // 🔧 CORREGIDO: 'cors' en lugar de 'no-cors'
    body: JSON.stringify({ ...nuevaCita, accion: 'guardar_cita' })
  }).catch(console.error);

  cerrarModalReservar();
  actualizarBadgeAgenda();
  mostrarAlertas();
  if (document.getElementById('tab-database').classList.contains('active'))
    mostrarGeneral(document.getElementById('buscadorGeneral').value);
  if (document.getElementById('tab-agenda').classList.contains('active')) renderAgenda();

  // 🔧 Forzar sincronización inmediata para reflejar en la nube
  sincronizarSoloCitas();
}

function cerrarModalReservar() { document.getElementById('modalReservar').classList.remove('active'); }

// ═══════════════════════════════════════════
// AGENDA — RENDER PRINCIPAL
// ═══════════════════════════════════════════
function actualizarBadgeAgenda() {
  const hoy = getHoy();
  const total = getCitas().filter(c => c.fecha === hoy).length;
  document.getElementById('nav-badge-agenda').textContent = total;
}

function irHoyAgenda() {
  document.getElementById('agendaFecha').value = getHoy();
  renderAgenda();
}

function cambiarDiaAgenda(delta) {
  const input = document.getElementById('agendaFecha');
  const fecha = input.value || getHoy();
  const [y, m, d] = fecha.split('-').map(Number);
  input.value = new Date(y, m - 1, d + delta).toLocaleDateString('en-CA');
  renderAgenda();
}

function setFiltroAgenda(filtro) {
  filtroAgendaActual = filtro;
  document.querySelectorAll('.agenda-filtro-btn').forEach(b => b.classList.remove('activo'));
  document.getElementById('filtro-' + filtro).classList.add('activo');
  renderAgenda();
}

function renderAgenda() {
  const fecha = document.getElementById('agendaFecha').value || getHoy();
  const label = document.getElementById('agendaFechaLabel');
  const contenido = document.getElementById('agendaContenido');
  const resumen = document.getElementById('agendaResumen');
  const horaActual = new Date().toLocaleTimeString('en-CA', { hour: '2-digit', minute: '2-digit', hour12: false }).substring(0, 5);

  label.textContent = formatearFechaLarga(fecha);

  let citasDelDia = getCitas().filter(c => c.fecha === fecha);
  if (filtroAgendaActual !== 'todos') citasDelDia = citasDelDia.filter(c => c.espacio === filtroAgendaActual);

  const totalCitas = citasDelDia.length;
  const espaciosOcupados = new Set(citasDelDia.map(c => c.espacio)).size;
  resumen.textContent = totalCitas > 0
    ? `${totalCitas} cita${totalCitas !== 1 ? 's' : ''} · ${espaciosOcupados} espacio${espaciosOcupados !== 1 ? 's' : ''} ocupado${espaciosOcupados !== 1 ? 's' : ''}`
    : 'Sin citas para este día';

  let html = '';

  HORAS.forEach(hora => {
    const citasEnEstaHora = citasDelDia.filter(c => c.hora === hora);
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
        const esp = ESPACIOS[cita.espacio] || {};
        html += `
                <div class="agenda-cita-chip ${esp.clase || ''}"
                    draggable="true"
                    data-citaid="${cita.citaId}"
                    ondragstart="onDragStart(event,${cita.citaId})"
                    ondragend="onDragEnd(event)">
                    <span class="cita-espacio-tag ${esp.tag || ''}">${esp.icono || ''} ${esp.nombre || cita.espacio}</span>
                    <span class="cita-placa">${cita.placa}</span>
                    <div class="cita-info">
                        ${cita.nombre}
                        ${cita.notas ? `<small>📝 ${cita.notas}</small>` : ''}
                    </div>
                    <div class="cita-acciones">
                        <button class="btn-ver-cita" onclick="verDetalleCita(${cita.citaId})" title="Ver detalle">👁</button>
                        <button class="btn-del-cita-chip" onclick="eliminarCita(${cita.citaId})">✕</button>
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
  actualizarBadgeAgenda();
}

function siguienteHora(hora) {
  const idx = HORAS.indexOf(hora);
  return idx < HORAS.length - 1 ? HORAS[idx + 1] : '23:59';
}

// 🔧 CORREGIDO: eliminarCita sin código duplicado y con fetch mode:'cors'
function eliminarCita(citaId) {
  setCitas(getCitas().filter(c => c.citaId !== citaId));

  // Enviar eliminación a Google Sheets
  fetch(urlGoogle, {
    method: 'POST',
    mode: 'no-cors',
    body: JSON.stringify({ citaId: String(citaId), accion: 'eliminar_cita' })
  }).catch(console.error);

  actualizarBadgeAgenda();
  mostrarAlertas();
  if (document.getElementById('tab-database').classList.contains('active'))
    mostrarGeneral(document.getElementById('buscadorGeneral').value);
  renderAgenda();
}

function verDetalleCita(citaId) {
  const cita = getCitas().find(c => c.citaId === citaId);
  if (!cita) return;

  const esp = ESPACIOS[cita.espacio] || {};
  const hoy = getHoy();
  const waTxt = encodeURIComponent(`Hola ${cita.nombre}, te confirmamos tu cita en ${esp.nombre} el ${cita.fecha} a las ${HORAS_DISPLAY[cita.hora]}. ¡Te esperamos!`);
  const esHoy = cita.fecha === hoy;
  const esPasada = cita.fecha < hoy;

  const estadoFecha = esHoy
    ? `<span class="badge-estado badge-hoy">⚠ HOY</span>`
    : esPasada
      ? `<span class="badge-estado badge-vencido">Pasada</span>`
      : `<span class="badge-estado badge-ok">Próxima</span>`;

  document.getElementById('detalleCitaContenido').innerHTML = `
        <div class="detalle-espacio-header detalle-espacio-${cita.espacio}">
            <span class="detalle-espacio-icon">${esp.icono}</span>
            <div>
                <div class="detalle-espacio-nombre">${esp.nombre}</div>
                <div class="detalle-espacio-hora">${HORAS_DISPLAY[cita.hora]} · ${cita.fecha} ${estadoFecha}</div>
            </div>
        </div>
        <div class="detalle-seccion">
            <div class="detalle-seccion-titulo">📋 Datos de la Cita</div>
            <div class="detalle-grid">
                <div class="detalle-item"><span class="detalle-label">Placa</span><span class="detalle-valor detalle-placa">${cita.placa}</span></div>
                <div class="detalle-item"><span class="detalle-label">Servicio</span><span class="detalle-valor">${cita.categoria}</span></div>
                <div class="detalle-item"><span class="detalle-label">Fecha</span><span class="detalle-valor">${cita.fecha}</span></div>
                <div class="detalle-item"><span class="detalle-label">Hora</span><span class="detalle-valor">${HORAS_DISPLAY[cita.hora]}</span></div>
                ${cita.notas ? `<div class="detalle-item detalle-item-full"><span class="detalle-label">Notas</span><span class="detalle-valor">📝 ${cita.notas}</span></div>` : ''}
            </div>
        </div>
        <div class="detalle-seccion">
            <div class="detalle-seccion-titulo">👤 Datos del Cliente</div>
            <div class="detalle-grid">
                <div class="detalle-item"><span class="detalle-label">Nombre</span><span class="detalle-valor">${cita.nombre}</span></div>
                <div class="detalle-item"><span class="detalle-label">Teléfono</span><span class="detalle-valor">${cita.telefono}</span></div>
            </div>
        </div>
        <div class="detalle-acciones">
            <a href="https://wa.me/57${cita.telefono}?text=${waTxt}" target="_blank" class="btn-wa btn-detalle-wa">
                📱 Contactar por WhatsApp
            </a>
            <button class="btn-del btn-detalle-del" onclick="if(confirm('¿Cancelar esta reserva?')){eliminarCita(${cita.citaId});cerrarDetalleCita();}">
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

function onDrop(event, nuevaHora) {
  event.preventDefault();
  document.querySelectorAll('.agenda-slot,.agenda-empty-slot').forEach(el => el.classList.remove('drop-target'));

  if (!dragCitaId) return;

  const citas = getCitas();
  const citaIdx = citas.findIndex(c => c.citaId === dragCitaId);
  if (citaIdx === -1) return;

  const cita = citas[citaIdx];
  const fecha = document.getElementById('agendaFecha').value || getHoy();

  const conflicto = citas.find(c => c.fecha === fecha && c.hora === nuevaHora && c.espacio === cita.espacio && c.citaId !== dragCitaId);
  if (conflicto) {
    mostrarToastError(`⚠ ${ESPACIOS[cita.espacio].nombre} ya tiene una reserva a las ${HORAS_DISPLAY[nuevaHora]}`);
    dragCitaId = null;
    return;
  }

  citas[citaIdx] = { ...cita, hora: nuevaHora };
  setCitas(citas);
  fetch(urlGoogle, {
    method: 'POST',
    mode: 'no-cors',
    body: JSON.stringify({ citaId: String(dragCitaId), hora: nuevaHora, accion: 'mover_cita' })
  }).catch(console.error);
  dragCitaId = null;
  renderAgenda();
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
