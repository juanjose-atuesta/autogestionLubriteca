
// ═══════════ HISTORIAL ═══════════
function buscarHistorial() {
  const placa = document.getElementById('buscadorPlaca').value.toUpperCase().trim();
  const res = document.getElementById('historialResultado');
  if (placa.length < 3) { res.innerHTML = `<div class="empty-state"><div class="empty-icon">◎</div><p>Ingresa una placa para ver su historial completo.</p></div>`; return; }
  const regs = getHistorialDB().filter(c => c.placa.toUpperCase().includes(placa)).sort((a, b) => String(a.fechaActual).localeCompare(String(b.fechaActual)));
  if (!regs.length) { res.innerHTML = `<div class="empty-state"><div class="empty-icon">○</div><p>No se encontraron registros para "<strong>${placa}</strong>".</p></div>`; return; }
  const hoy = getHoy(), pu = [...new Set(regs.map(c => c.placa))];
  let html = '';
  pu.forEach(p => {
    const r = regs.filter(c => c.placa === p), d = new Set(r.map(x => x.nombre)).size;
    html += `<div class="historial-placa-header"><div class="historial-placa-badge">${p}</div><div class="historial-meta"><strong>${r.length}</strong> servicio${r.length !== 1 ? 's' : ''} · <strong>${d}</strong> dueño${d !== 1 ? 's' : ''}</div></div><div class="historial-timeline">`;
    r.forEach((c, idx) => {
      const esE = c.eliminado === true, esH = !esE && String(c.fechaFutura).trim() === hoy, esV = !esE && String(c.fechaFutura).trim() < hoy;
      const dotC = esE ? '' : esH ? 'dot-hoy' : esV ? 'dot-vencido' : 'dot-actual';
      const cardC = esE ? 'card-eliminado' : esH ? 'card-hoy' : esV ? 'card-vencido' : 'card-actual';
      html += `<div class="historial-item"><div class="historial-linea"><div class="historial-dot ${dotC}"></div>${idx !== r.length - 1 ? '<div class="historial-connector"></div>' : ''}</div>
            <div class="historial-card ${cardC}">
                <div class="historial-card-top"><div class="historial-nombre">${c.nombre}<small>${c.telefono}</small></div>${buildBadge(c.fechaFutura, esE)}</div>
                <div class="historial-card-info">
                    <div class="historial-info-item">🔧 <strong>${c.categoria}</strong></div>
                    <div class="historial-info-item">📅 Ingreso: <strong>${c.fechaActual}</strong></div>
                    <div class="historial-info-item">📅 Contacto: <strong>${c.fechaFutura}</strong></div>
                    <div class="historial-info-item">🛣 <strong>${c.km} KM</strong></div>
                    ${esE ? '<div class="historial-info-item">🗑 <strong>Eliminado del sistema</strong></div>' : ''}
                </div>
                ${!esE ? `<button class="btn-reservar-historial" onclick="abrirModalReservar(${c.id || 'null'},'${c.placa}','${c.nombre.replace(/'/g, "\\'")}','${c.telefono}','${c.categoria.replace(/'/g, "\\'")}')">📅 Reservar cita</button>` : ''}
            </div></div>`;
    });
    html += `</div>`;
  });
  res.innerHTML = html;
}
function limpiarHistorial() { document.getElementById('buscadorPlaca').value = ''; buscarHistorial(); document.getElementById('buscadorPlaca').focus(); }
