
// ═══════════ MIGRACIÓN ═══════════
function migrarClientesAHistorial() {
  const h = getHistorialDB(), c = getClientes();
  if (!c.length) return;
  const ids = new Set(h.map(x => x.id));
  let n = 0;
  c.forEach(x => { if (!ids.has(x.id)) { h.push({ ...x, eliminado: false, fechaRegistro: x.fechaActual || fechaHoraActual() }); n++; } });
  if (n > 0) setHistorialDB(h);
}

// ═══════════ GUARDAR CLIENTE ═══════════
document.getElementById('clienteForm').addEventListener('submit', e => {
  e.preventDefault();
  const c = {
    id: Date.now(),
    nombre: document.getElementById('nombre').value.trim(),
    telefono: document.getElementById('telefono').value.trim(),
    placa: document.getElementById('placa').value.toUpperCase().trim(),
    categoria: document.getElementById('categoria').value,
    fechaActual: document.getElementById('fechaActual').value,
    fechaFutura: document.getElementById('fechaFutura').value,
    km: document.getElementById('kilometraje').value
  };
  fetch(urlGoogle, { method: 'POST', mode: 'no-cors', body: JSON.stringify({ ...c, accion: "guardar" }) }).catch(console.error);
  const cl = getClientes(); cl.push(c); setClientes(cl);
  const h = getHistorialDB(); h.push({ ...c, eliminado: false, fechaRegistro: fechaHoraActual() }); setHistorialDB(h);
  document.getElementById('clienteForm').reset();
  mostrarToast(); actualizarStats(); mostrarAlertas(); revisarCitasDeHoy();
});

function eliminarCliente(id) {
  const cl = getClientes(), c = cl.find(x => x.id === id);
  if (c) {
    fetch(urlGoogle, { method: 'POST', mode: 'no-cors', body: JSON.stringify({ placa: c.placa, accion: "eliminar" }) }).catch(console.error);
    const h = getHistorialDB(), idx = h.findLastIndex(x => x.id === id);
    if (idx !== -1) { h[idx].eliminado = true; setHistorialDB(h); }
    setCitas(getCitas().filter(ct => String(ct.placa).toUpperCase() !== String(c.placa).toUpperCase()));
  }
  setIdsContactados(getIdsContactados().filter(x => x !== id));
  setClientes(cl.filter(x => x.id !== id));
  actualizarStats(); mostrarAlertas(); actualizarBadgeAgenda();
  if (document.getElementById('tab-database').classList.contains('active'))
    mostrarGeneral(document.getElementById('buscadorGeneral').value);
  if (document.getElementById('tab-agenda').classList.contains('active'))
    renderAgenda();
}

// ═══════════ MODAL EDITAR ═══════════
function abrirModalEditar(id) {
  const c = getClientes().find(x => x.id === id); if (!c) return;
  document.getElementById('editId').value = c.id;
  document.getElementById('editNombre').value = c.nombre;
  document.getElementById('editTelefono').value = c.telefono;
  document.getElementById('editPlaca').value = c.placa;
  document.getElementById('editCategoria').value = c.categoria;
  document.getElementById('editFechaActual').value = c.fechaActual;
  document.getElementById('editFechaFutura').value = c.fechaFutura;
  document.getElementById('editKm').value = c.km;
  document.getElementById('modalEditar').classList.add('active');
}


function guardarEdicion() {
  const id = parseInt(document.getElementById('editId').value);
  const cl = getClientes(), idx = cl.findIndex(x => x.id === id);
  if (idx === -1) return;

  const fAnt = cl[idx].fechaFutura;
  const fNueva = document.getElementById('editFechaFutura').value;
  const placaAnterior = cl[idx].placa;

  const act = {
    ...cl[idx],
    nombre: document.getElementById('editNombre').value.trim(),
    telefono: document.getElementById('editTelefono').value.trim(),
    placa: document.getElementById('editPlaca').value.toUpperCase().trim(),
    categoria: document.getElementById('editCategoria').value,
    fechaActual: document.getElementById('editFechaActual').value,
    fechaFutura: fNueva,
    km: document.getElementById('editKm').value
  };

  if (fAnt !== fNueva) setIdsContactados(getIdsContactados().filter(x => x !== id));

  const h = getHistorialDB(), hIdx = h.findLastIndex(x => x.id === id);
  if (hIdx !== -1) { h[hIdx] = { ...h[hIdx], ...act, eliminado: false }; setHistorialDB(h); }

  fetch(urlGoogle, {
    method: 'POST',
    mode: 'no-cors',
    body: JSON.stringify({ ...act, accion: "actualizar", placaAnterior: placaAnterior })
  }).catch(console.error);

  cl[idx] = act; setClientes(cl);
  cerrarModalEditar(); actualizarStats(); mostrarAlertas();
  if (document.getElementById('tab-database').classList.contains('active'))
    mostrarGeneral(document.getElementById('buscadorGeneral').value);
}

