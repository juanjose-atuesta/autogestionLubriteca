
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
    name: document.getElementById('nombre').value.toUpperCase(),
    telephone: document.getElementById('telefono').value.trim(),
    plate: document.getElementById('placa').value.toUpperCase().trim(),
    service: document.getElementById('categoria').value,
    entryDate: document.getElementById('fechaActual').value,
    nextContact: document.getElementById('fechaFutura').value,
    mileage: document.getElementById('kilometraje').value,
    createAt: document.getElementById('fechaActual').value
  };
  fetch(API_BACKEND_URL + "addCustomer", {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(c)
  })
    .then(response => response.json())
    .then(data => {
      console.log(data.status);
      console.log("se logro");
    })
    .catch(console.error);
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
  document.getElementById('editNombre').value = c.name;
  document.getElementById('editTelefono').value = c.telephone;
  document.getElementById('editPlaca').value = c.plate;
  document.getElementById('editCategoria').value = c.service;
  document.getElementById('editFechaActual').value = c.entryDate;
  document.getElementById('editFechaFutura').value = c.nextContact;
  document.getElementById('editKm').value = c.mileage;
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
    name: document.getElementById('editNombre').value.trim(),
    telephone: document.getElementById('editTelefono').value.trim(),
    plate: document.getElementById('editPlaca').value.toUpperCase().trim(),
    service: document.getElementById('editCategoria').value,
    entryDate: document.getElementById('editFechaActual').value,
    nextContact: fNueva,
    mileage: document.getElementById('editKm').value
  };

  if (fAnt !== fNueva) setIdsContactados(getIdsContactados().filter(x => x !== id));

  const h = getHistorialDB(), hIdx = h.findLastIndex(x => x.id === id);
  if (hIdx !== -1) { h[hIdx] = { ...h[hIdx], ...act, eliminado: false }; setHistorialDB(h); }

  fetch(API_BACKEND_URL + "editCustomer", {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...act })
  })
    .then(response => response.json())
    .then(data => { console.log(data.status); console.log("se logro editar"); })
    .catch(console.error);

  cl[idx] = act; setClientes(cl);
  cerrarModalEditar(); actualizarStats(); mostrarAlertas();
  if (document.getElementById('tab-database').classList.contains('active'))
    mostrarGeneral(document.getElementById('buscadorGeneral').value);
}

