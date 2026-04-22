
// ═══════════ HISTORIAL ═══════════
function buscarHistorial() {
  /*
  fetch("http://192.168.80.25:3000/api/historial/historialDBList")
    .then(res => res.json())
    .then(data => {
      if (data.status === 'success') {
        setHistorialDB(data.historialDBList);
      }
      console.log("Se actualizo la lista de historial:", data);
    })
    .catch(console.error);
  */
  //Ojo, cambiamos donde esta el getClientes por getHistorialDB de forma momentanea, pues como tal aun no hacemos un historial en el backend
  getHistorialDB().then(regs => {
    const placa = document.getElementById('buscadorPlaca').value.toUpperCase().trim();
    const res = document.getElementById('historialResultado');
    if (placa.length < 3) { res.innerHTML = `<div class="empty-state"><div class="empty-icon">◎</div><p>Ingresa una placa para ver su historial completo.</p></div>`; return; }

    let regsFiltered = regs.filter(c => c.plate.toUpperCase().includes(placa)).sort((a, b) => String(a.entryDate).localeCompare(String(b.nextContact)));//filter no edita, toca guardarlo en algo
    if (!regsFiltered.length) { res.innerHTML = `<div class="empty-state"><div class="empty-icon">○</div><p>No se encontraron registros para "<strong>${placa}</strong>".</p></div>`; return; }
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
function limpiarHistorial() { document.getElementById('buscadorPlaca').value = ''; buscarHistorial(); document.getElementById('buscadorPlaca').focus(); }
