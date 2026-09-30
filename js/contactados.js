
// ═══════════ CONTACTADO ═══════════
function actualizarBadgeContactados() {
  document.getElementById('nav-badge-contactados').textContent = contactados().length;
}

async function toggleContactado(id) {
  const clienteId = String(id);
  const cliente = clientePorId(clienteId);
  const estabaContactado = cliente ? estaContactado(cliente) : false;

  try {
    await fetch(API_BACKEND_URL + "customers/toogleWasContacted/" + clienteId, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
    });

    await fetch(API_BACKEND_URL + "historial/toggleWasContacted/" + clienteId, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" }
    });

    // El store se actualiza con el evento SSE; mientras llega, ajustamos
    // localmente para que la tabla responda al instante.
    if (cliente) setCliente({ ...cliente, wasContacted: !estabaContactado });
    refrescarVistas({ clientes: true, historial: true });
  } catch (err) {
    console.error("Error de red al togglear contacto:", err);
  }
}


// ═══════════ CONTACTADOS ═══════════
function mostrarContactados(filtro = '') {
  const data = contactados();
  const tbody = document.getElementById('listaContactados'), empty = document.getElementById('emptyContactados');
  let log = data;
  if (filtro) {
    const f = String(filtro).toUpperCase();
    log = data.filter(r =>
      String(r.name || '').toUpperCase().includes(f) ||
      String(r.plate || '').toUpperCase().includes(f) ||
      String(r.service || '').toUpperCase().includes(f));
  }
  log = [...log].reverse();
  const total = data.length, placas = new Set(data.map(r => r.plate)).size;
  document.getElementById('statsContactados').innerHTML = `<div class="db-stat-item"><span class="db-dot" style="background:#059669"></span>${total} contacto${total !== 1 ? 's' : ''}</div><div class="db-stats-total">${placas} placa${placas !== 1 ? 's' : ''} distinta${placas !== 1 ? 's' : ''}</div>`;
  document.getElementById('nav-badge-contactados').textContent = total;
  tbody.innerHTML = '';
  if (!log.length) { empty.style.display = 'block'; document.getElementById('tablaContactados').style.display = 'none'; }
  else {
    empty.style.display = 'none'; document.getElementById('tablaContactados').style.display = '';
    log.forEach(r => {
      const logId = String(r.id).replace(/'/g, "\\'");
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${r.name}<small>${r.telephone}</small></td>
    <td>${r.telephone}</td>
    <td><strong>${r.plate}</strong></td>
    <td>${r.service}</td>
    <td>${r.entryDate}</td>
    <td>${r.nextContact}</td>
    <td>${r.mileage} KM</td>
    <td><span class="fecha-contacto-badge">📞 ${r.nextContact}</span></td>
    <td><button class="btn-del-contactado" onclick="eliminarLogContactado('${logId}')" ${logId ? '' : 'disabled'}>✕ Quitar</button></td>`;
      tbody.appendChild(tr);
    });
  }
}

// Quita el registro del log de contactados (colección historialDB).
// Solo afecta la lista de la pestaña Contactados, no el cliente en la base de datos.
async function eliminarLogContactado(id) {
  const clave = String(id || '').trim();
  if (!clave) {
    console.error("No se recibió ID del log para eliminar contactado.");
    return;
  }

  try {
    await fetch(API_BACKEND_URL + "historial/toggleWasContacted/" + clave, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" }
    });
    refrescarVistas({ historial: true });
  } catch (err) {
    console.error("Error al quitar el contactado del log:", err);
  }
}

function filtrarContactados() { mostrarContactados(document.getElementById('buscadorContactados').value); }
function limpiarBuscadorContactados() { document.getElementById('buscadorContactados').value = ''; mostrarContactados(); document.getElementById('buscadorContactados').focus(); }
