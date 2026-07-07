function normalizarBooleanConcluido(valor) {
  if (valor === true || valor === 'true' || valor === 1 || valor === '1') return true;
  return false;
}
// ═══════════ STATS ═══════════
function actualizarStats() {
  const cl = getClientes().then(
    cl => {

      hoy = getHoy();
      const v = cl.filter(c => String(c.nextContact).trim() < hoy).length;
      const h = cl.filter(c => String(c.nextContact).trim() === hoy).length;
      document.getElementById('statsGrid').innerHTML = `
        <div class="stat-card stat-primary"><div class="stat-value">${cl.length}</div><div class="stat-label">Total clientes</div></div>
        <div class="stat-card stat-danger"><div class="stat-value">${v}</div><div class="stat-label">Vencidos</div></div>
        <div class="stat-card stat-warning"><div class="stat-value">${h}</div><div class="stat-label">Citas hoy</div></div>
        <div class="stat-card stat-success"><div class="stat-value">${cl.length - v - h}</div><div class="stat-label">Al día</div></div>`;
    }
  )
}
function buildBadge(fechaStr, eliminado = false) {
  if (eliminado) return `<span class="badge-eliminado">● Eliminado</span>`;
  const hoy = getHoy(), f = String(fechaStr).trim(), d = diasRestantes(f);
  if (f === hoy) return `<span class="badge-estado badge-hoy">⚠ HOY</span>`;
  if (f < hoy) return `<span class="badge-estado badge-vencido">✕ VENCIDO hace ${Math.abs(d)}d</span>`;
  if (d <= 7) return `<span class="badge-estado badge-pronto">📅 En ${d} días</span>`;
  return `<span class="badge-estado badge-ok">✓ OK — ${d}d</span>`;
}

// ═══════════ CONSTRUIR FILA ═══════════
function construirFila(c, citas = []) {
  const nombre = String(c.name || '');
  const telefono = String(c.telephone || '');
  const placa = String(c.plate || '').toUpperCase().trim();
  const categoria = String(c.service || 'Servicio General');
  const fechaActual = String(c.entryDate || '');
  const fechaFutura = String(c.nextContact || '');
  const km = String(c.mileage || '0');
  const id = c.id;
  //console.log(id);
  const hoy = getHoy(), f = fechaFutura.trim();
  const esHoy = f === hoy, esV = f < hoy;

  const marcado = normalizarBooleanContactado(c.wasContacted);
  const cl = esHoy ? 'fila-hoy' : esV ? 'fila-vencido' : '';

  const waTxt = esHoy
    ? `Hola%20${encodeURIComponent(nombre)},%20te%20recordamos%20que%20tu%20servicio%20de%20${encodeURIComponent(categoria)}%20es%20HOY.%20%C2%A1Te%20esperamos!`
    : `Hola%20${encodeURIComponent(nombre)},%20tu%20servicio%20de%20${encodeURIComponent(categoria)}%20est%C3%A1%20vencido.%20%C2%A1Cont%C3%A1ctanos!`;


  const citasCliente = citas.filter(ct => ct.customerId == id);
  const citaActiva = citasCliente.find(ct => !normalizarBooleanConcluido(ct.wasConcluded));
  const citaConcluida = citasCliente.find(ct => normalizarBooleanConcluido(ct.wasConcluded));
  const idSafe = String(id).replace(/'/g, "\\'");
  const nombreSafe = nombre.replace(/'/g, "\\'").replace(/"/g, '&quot;');
  const categoriaSafe = categoria.replace(/'/g, "\\'").replace(/"/g, '&quot;');
  const btnReservar = citaActiva
    ? `<button class="btn-reservar-cita btn-reservado" disabled>✅ Reservado</button>`
    : citaConcluida
      ? `<button class="btn-reservar-cita btn-concluido-reservar" onclick="abrirModalReservar('${idSafe}','${placa}','${nombreSafe}','${telefono}','${categoriaSafe}')">✓ Concluido · Reservar</button>`
      : `<button class="btn-reservar-cita" onclick="abrirModalReservar('${idSafe}','${placa}','${nombreSafe}','${telefono}','${categoriaSafe}')">📅 Reservar</button>`;

  const tr = document.createElement('tr');
  if (cl) tr.classList.add(cl);
  tr.innerHTML = `
        <td>${nombre}<small>${categoria}</small></td>
        <td>${telefono}</td>
        <td><strong>${placa}</strong></td>
        <td>${fechaActual}</td>
        <td>${fechaFutura}</td>
        <td>${buildBadge(fechaFutura)}</td>
        <td>${km} KM</td>
        <td>${btnReservar}</td>
        <td>
            <div class="acciones">
                <div class="btn-wa-wrap">
                    <a href="https://wa.me/57${telefono}?text=${waTxt}" target="_blank" class="btn-wa">📱 WhatsApp</a>
                    <button class="btn-chulo ${marcado ? 'marcado' : ''}" onclick="toggleContactado('${id}')" title="${marcado ? 'Contactado ✓' : 'Marcar contactado'}">✓</button>
                </div>
                <button class="btn-edit" onclick="abrirModalEditar('${id}')">✎ Editar</button>
                <button class="btn-del"  onclick="abrirModalEliminar('${id}')">✕ Eliminar</button>
            </div>
        </td>`;
  return tr;
}


// ═══════════ ALERTAS ═══════════
async function mostrarAlertas() {
  const tbody = document.getElementById('listaAlertas'), empty = document.getElementById('emptyAlertas'), hoy = getHoy();
  Promise.all([getClientes(), getCitas()]).then(([clientes, citas]) => {
    const al = clientes.filter(c => { const f = String(c.nextContact).trim(); return f === hoy || f < hoy; })
      .sort((a, b) => { const fa = String(a.nextContact).trim(), fb = String(b.nextContact).trim(); if (fa === hoy && fb !== hoy) return -1; if (fb === hoy && fa !== hoy) return 1; return fb.localeCompare(fa); });
    tbody.innerHTML = '';
    if (!al.length) { empty.style.display = 'block'; document.getElementById('tablaAlertas').style.display = 'none'; }
    else {
      empty.style.display = 'none'; document.getElementById('tablaAlertas').style.display = ''; al.forEach(c => {
        tbody.appendChild(construirFila(c, citas))
        //console.log(c)
      });
    }
    document.getElementById('badge-alertas').textContent = al.length;
    document.getElementById('nav-badge').textContent = al.length;
  }).catch(console.error);
}

// ═══════════ BASE DE DATOS ═══════════
async function mostrarGeneral(filtro = '') {
  const tbody = document.getElementById('listaGeneral'), empty = document.getElementById('emptyGeneral'), hoy = getHoy();
  Promise.all([getClientesDB(), getCitas()]).then(([todos, citas]) => {
    let cl = todos;
    if (filtro.trim()) {
      const f = filtro.trim().toUpperCase();
      cl = cl.filter(c => {
        const nombre = String(c.name || '').toUpperCase();
        const placa = String(c.plate || '').toUpperCase();
        const servicio = String(c.service || '').toUpperCase();
        const telefono = String(c.telephone || '');
        return nombre.includes(f) || placa.includes(f) || servicio.includes(f) || telefono.includes(filtro.trim());
      });
    }
    cl.sort((a, b) => String(a.nextContact).localeCompare(String(b.nextContact)));
    const v = todos.filter(c => String(c.nextContact).trim() < hoy).length;
    const hC = todos.filter(c => String(c.nextContact).trim() === hoy).length;
    document.getElementById('dbStats').innerHTML = `
        <div class="db-stat-item"><span class="db-dot" style="background:#ef4444"></span>${v} vencidos</div>
        <div class="db-stat-item"><span class="db-dot" style="background:#f59e0b"></span>${hC} hoy</div>
        <div class="db-stat-item"><span class="db-dot" style="background:#10b981"></span>${todos.length - v - hC} al día</div>
        <div class="db-stats-total">${todos.length} registros</div>`;
    tbody.innerHTML = '';
    if (!cl.length) { empty.style.display = 'block'; document.getElementById('tablaGeneral').style.display = 'none'; }
    else { empty.style.display = 'none'; document.getElementById('tablaGeneral').style.display = ''; cl.forEach(c => tbody.appendChild(construirFila(c, citas))); }
  }).catch(console.error);
}
function filtrarGeneral() { mostrarGeneral(document.getElementById('buscadorGeneral').value); }
function limpiarBuscadorGeneral() { document.getElementById('buscadorGeneral').value = ''; mostrarGeneral(); document.getElementById('buscadorGeneral').focus(); }
