
// ═══════════ HISTORIAL ═══════════
function buscarHistorial() {
  getHistorialDB().then(regs => {
    const busqueda = document.getElementById('buscadorPlaca').value.trim();
    const res = document.getElementById('historialResultado');

    if (busqueda.length < 2) {
      res.innerHTML = `<div class="empty-state"><div class="empty-icon">◎</div><p>Ingresa al menos 2 caracteres para buscar por placa, nombre, teléfono, servicio o fecha.</p></div>`;
      return;
    }

    const busquedaUpper = busqueda.toUpperCase();

    // Filtrar por múltiples campos
    let regsFiltered = regs.filter(c => {
      const plate = String(c.plate || '').toUpperCase();
      const name = String(c.name || '').toUpperCase();
      const telephone = String(c.telephone || '').toUpperCase();
      const service = String(c.service || '').toUpperCase();
      const entryDate = String(c.entryDate || '').toUpperCase();
      const nextContact = String(c.nextContact || '').toUpperCase();

      return plate.includes(busquedaUpper) ||
        name.includes(busquedaUpper) ||
        telephone.includes(busquedaUpper) ||
        service.includes(busquedaUpper) ||
        entryDate.includes(busquedaUpper) ||
        nextContact.includes(busquedaUpper);
    }).sort((a, b) => String(a.entryDate).localeCompare(String(b.nextContact)));

    if (!regsFiltered.length) {
      res.innerHTML = `<div class="empty-state"><div class="empty-icon">○</div><p>No se encontraron registros para "<strong>${busqueda}</strong>".</p></div>`;
      return;
    }

    const hoy = getHoy(), pu = [...new Set(regsFiltered.map(c => c.plate))];
    let html = '';
    pu.forEach(p => {
      const r = regsFiltered.filter(c => c.plate === p), d = new Set(r.map(x => x.nombre)).size;
      html += `<div class="historial-placa-header"><div class="historial-placa-badge">${p}</div><div class="historial-meta"><strong>${r.length}</strong> servicio${r.length !== 1 ? 's' : ''} · <strong>${d}</strong> dueño${d !== 1 ? 's' : ''}</div></div><div class="historial-timeline">`;
      r.forEach((c, idx) => {
        const esE = c.eliminado === true, esH = !esE && String(c.nextContact).trim() === hoy, esV = !esE && String(c.nextContact).trim() < hoy;
        const dotC = esE ? '' : esH ? 'dot-hoy' : esV ? 'dot-vencido' : 'dot-actual';
        const cardC = esE ? 'card-eliminado' : esH ? 'card-hoy' : esV ? 'card-vencido' : 'card-actual';
        const idSafe = String(c.id || '').replace(/'/g, "\\'");
        html += `<div class="historial-item"><div class="historial-linea"><div class="historial-dot ${dotC}"></div>${idx !== r.length - 1 ? '<div class="historial-connector"></div>' : ''}</div>
            <div class="historial-card ${cardC}">
                <div class="historial-card-top"><div class="historial-nombre">${c.name}<small>${c.telephone}</small></div>${buildBadge(c.fechaFutura, esE)}</div>
                <div class="historial-card-info">
                    <div class="historial-info-item">🔧 <strong>${c.service}</strong></div>
                    <div class="historial-info-item">📅 Ingreso: <strong>${c.entryDate}</strong></div>
                    <div class="historial-info-item">📅 Contacto: <strong>${c.nextContact}</strong></div>
                    <div class="historial-info-item">🛣 <strong>${c.mileage} KM</strong></div>
                    ${esE ? '<div class="historial-info-item">🗑 <strong>Eliminado del sistema</strong></div>' : ''}
                </div>
                ${!esE ? `<button class="btn-reservar-historial" onclick="abrirModalReservar('${idSafe}','${c.plate}','${c.name.replace(/'/g, "\\'")}','${c.telephone}','${c.service.replace(/'/g, "\\'")}')">📅 Reservar cita</button>` : ''}
            </div></div>`;
      });
      html += `</div>`;
    });
    res.innerHTML = html;

  })

}

function limpiarHistorial() {
  let hoy = new Date();
  let dia = hoy.getDate();
  let mes = hoy.getMonth() + 1;
  let anio = hoy.getFullYear();
  document.getElementById('buscadorPlaca').value = `${anio}-${mes.toString().padStart(2, '0')}-${dia.toString().padStart(2, '0')}`;
  buscarHistorial();
  document.getElementById('buscadorPlaca').focus();
}
