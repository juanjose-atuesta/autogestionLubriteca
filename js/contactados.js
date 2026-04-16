
// ═══════════ CONTACTADO ═══════════
function toggleContactado(id) {
  const c = getClientes().find(x => x.id === id); if (!c) return;
  let ids = getIdsContactados();
  if (ids.includes(id)) { setIdsContactados(ids.filter(x => x !== id)); }
  else {
    ids.push(id); setIdsContactados(ids);
    const log = getContactados();
    log.push({ logId: Date.now(), clienteId: c.id, nombre: c.nombre, telefono: c.telefono, placa: c.placa, categoria: c.categoria, fechaActual: c.fechaActual, fechaFutura: c.fechaFutura, km: c.km, fechaContacto: fechaHoraActual() });
    setContactados(log);
  }
  actualizarBadgeContactados(); mostrarAlertas();
  if (document.getElementById('tab-database').classList.contains('active')) mostrarGeneral(document.getElementById('buscadorGeneral').value);
  if (document.getElementById('tab-contactados').classList.contains('active')) mostrarContactados();
}
function actualizarBadgeContactados() { document.getElementById('nav-badge-contactados').textContent = getContactados().length; }


// ═══════════ CONTACTADOS ═══════════
function mostrarContactados(filtro = '') {
  const tbody = document.getElementById('listaContactados'), empty = document.getElementById('emptyContactados');
  let log = filtro ? getContactados().filter(r => { const f = filtro.toUpperCase(); return r.nombre.toUpperCase().includes(f) || r.placa.toUpperCase().includes(f) || (r.categoria || '').toUpperCase().includes(f); }) : getContactados();
  log = [...log].reverse();
  const total = getContactados().length, placas = new Set(getContactados().map(r => r.placa)).size;
  document.getElementById('statsContactados').innerHTML = `<div class="db-stat-item"><span class="db-dot" style="background:#059669"></span>${total} contacto${total !== 1 ? 's' : ''}</div><div class="db-stats-total">${placas} placa${placas !== 1 ? 's' : ''} distinta${placas !== 1 ? 's' : ''}</div>`;
  tbody.innerHTML = '';
  if (!log.length) { empty.style.display = 'block'; document.getElementById('tablaContactados').style.display = 'none'; }
  else {
    empty.style.display = 'none'; document.getElementById('tablaContactados').style.display = '';
    log.forEach(r => { const tr = document.createElement('tr'); tr.innerHTML = `<td>${r.nombre}<small>${r.telefono}</small></td><td>${r.telefono}</td><td><strong>${r.placa}</strong></td><td>${r.categoria}</td><td>${r.fechaActual}</td><td>${r.fechaFutura}</td><td>${r.km} KM</td><td><span class="fecha-contacto-badge">📞 ${r.fechaContacto}</span></td><td><button class="btn-del-contactado" onclick="eliminarLogContactado(${r.logId})">✕ Quitar</button></td>`; tbody.appendChild(tr); });
  }
}
function eliminarLogContactado(id) { setContactados(getContactados().filter(r => r.logId !== id)); actualizarBadgeContactados(); mostrarContactados(document.getElementById('buscadorContactados').value); }
function filtrarContactados() { mostrarContactados(document.getElementById('buscadorContactados').value); }
function limpiarBuscadorContactados() { document.getElementById('buscadorContactados').value = ''; mostrarContactados(); document.getElementById('buscadorContactados').focus(); }
