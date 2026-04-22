function formatoEspacioCita(space) {
  const valor = String(space || '').trim();
  const etiquetas = {
    carcamo: 'Cárcamo',
    gato_hidraulico: 'Gato Hidráulico',
    gato_electrico: 'Gato Eléctrico'
  };
  return etiquetas[valor] || valor;
}

function mostrarNotasCitaProgramada(notes) {
  const textoNotas = String(notes || '').trim();
  alert(textoNotas || 'Esta cita no tiene notas.');
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

    const tdNotas = document.createElement('td');
    const btnNotas = document.createElement('button');
    btnNotas.className = 'btn-edit';
    btnNotas.textContent = '📝 Notas';
    btnNotas.onclick = () => mostrarNotasCitaProgramada(cita.notes);
    tdNotas.appendChild(btnNotas);
    tr.appendChild(tdNotas);

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
