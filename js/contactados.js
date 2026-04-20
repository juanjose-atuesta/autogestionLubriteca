
// ═══════════ CONTACTADO ═══════════
function toggleContactado(id) {
  const clienteId = String(id);
  getClientes()
    .then(clientes => {
      const idxCliente = clientes.findIndex(c => String(c.id) === clienteId);
      const estadoActual = idxCliente !== -1 ? normalizarBooleanContactado(clientes[idxCliente].wasContacted) : false;

      return fetch(API_BACKEND_URL + "customers/toogleWasContacted/" + id, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
      }).then(res => res.json())
        .then(data => {
          console.log("Respuesta al togglear contacto:", data);
          const estadoDesdeBackend =
            data?.wasContacted ??
            data?.isContacted ??
            data?.contacted ??
            data?.customer?.wasContacted ??
            data?.customerUpdated?.wasContacted;
          const nuevoEstado = estadoDesdeBackend === undefined
            ? !estadoActual
            : normalizarBooleanContactado(estadoDesdeBackend);

          if (idxCliente !== -1) {
            clientes[idxCliente] = { ...clientes[idxCliente], wasContacted: nuevoEstado };
            setClientes(clientes);
          }

          return fetch(API_BACKEND_URL + "customers/listCustomersContacted")
            .then(res => res.json())
            .catch(err => {
              console.error("No se pudo refrescar contactados:", err);
              return null;
            });
        });
    })
    .then(listado => {
      if (listado?.status === 'success' && Array.isArray(listado.customerList)) {
        setContactados(listado.customerList);
      }
      actualizarBadgeContactados();
      mostrarAlertas();
      if (document.getElementById('tab-database').classList.contains('active')) {
        mostrarGeneral(document.getElementById('buscadorGeneral').value);
      }
      if (document.getElementById('tab-contactados').classList.contains('active')) {
        mostrarContactados(document.getElementById('buscadorContactados').value);
      }
    })
    .catch(err => {
      console.error("Error de red al togglear contacto:", err);
    })
}
function actualizarBadgeContactados() { document.getElementById('nav-badge-contactados').textContent = getContactados().length; }


// ═══════════ CONTACTADOS ═══════════
function mostrarContactados(filtro = '') {
  console.log("Aqui se hace el fetch")
  fetch(API_BACKEND_URL + "customers/listCustomersContacted")
    .then(res => res.json())
    .then(data => {
      console.log("Esta es la data para los contactados:", data);
      if (!data || typeof data !== 'object') {
        console.error("Respuesta inesperada al obtener contactados:", data);

      }
      if (data.status === 'success') {
        setContactados(data.customerList);
      }
      else {
        console.error("Error al obtener contactados:", data.message);
      }

      console.log(getContactados());
      const tbody = document.getElementById('listaContactados'), empty = document.getElementById('emptyContactados');
      let log = filtro ? getContactados().filter(r => { const f = filtro.toUpperCase(); return r.name.toUpperCase().includes(f) || r.plate.toUpperCase().includes(f) || (r.service || '').toUpperCase().includes(f); }) : getContactados();
      log = [...log].reverse();
      const total = getContactados().length, placas = new Set(getContactados().map(r => r.plate)).size;
      document.getElementById('statsContactados').innerHTML = `<div class="db-stat-item"><span class="db-dot" style="background:#059669"></span>${total} contacto${total !== 1 ? 's' : ''}</div><div class="db-stats-total">${placas} placa${placas !== 1 ? 's' : ''} distinta${placas !== 1 ? 's' : ''}</div>`;
      tbody.innerHTML = '';
      if (!log.length) { empty.style.display = 'block'; document.getElementById('tablaContactados').style.display = 'none'; }
      else {
        empty.style.display = 'none'; document.getElementById('tablaContactados').style.display = '';
        log.forEach(r => {
          const tr = document.createElement('tr');
          tr.innerHTML = `<td>${r.name}<small>${r.telephone}</small></td>
    <td>${r.telephone}</td>
    <td><strong>${r.plate}</strong></td>
    <td>${r.service}</td>
    <td>${r.entryDate}</td>
    <td>${r.nextContact}</td>
    <td>${r.mileage} KM</td>
    <td><span class="fecha-contacto-badge">📞 ${r.nextContact}</span></td>
    <td><button class="btn-del-contactado" onclick="eliminarLogContactado(${r.logId})">✕ Quitar</button></td>`;
          tbody.appendChild(tr);
        });
      }


    }).catch(err => {
      console.error("Error de red al obtener contactados:", err);
    });

}
function eliminarLogContactado(id) { setContactados(getContactados().filter(r => r.logId !== id)); actualizarBadgeContactados(); mostrarContactados(document.getElementById('buscadorContactados').value); }
function filtrarContactados() { mostrarContactados(document.getElementById('buscadorContactados').value); }
function limpiarBuscadorContactados() { document.getElementById('buscadorContactados').value = ''; mostrarContactados(); document.getElementById('buscadorContactados').focus(); }
