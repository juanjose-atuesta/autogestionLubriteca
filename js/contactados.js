
// ═══════════ CONTACTADO ═══════════
function actualizarBadgeContactados() {
  getContactados().then(contactados => {
    document.getElementById('nav-badge-contactados').textContent = contactados.length
  })
}
function toggleContactado(id) {
  const clienteId = String(id);
  getClientes()
    .then(clientes => {
      const idxCliente = clientes.findIndex(c => String(c.id) === clienteId);
      const estadoActual = idxCliente !== -1 ? normalizarBooleanContactado(clientes[idxCliente].wasContacted) : false;

      return fetch(API_BACKEND_URL + "customers/toogleWasContacted/" + clienteId, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
      }).then(res => res.json())
        .then(data => {

          return fetch(API_BACKEND_URL + "customers/listCustomersContacted")
            .then(res => res.json())
            .catch(err => {
              console.error("No se pudo refrescar contactados:", err);
              return null;
            });
        });
    })
    .then(listado => {
      actualizarBadgeContactados();
      mostrarAlertas();
      if (document.getElementById('tab-database').classList.contains('active')) {
        mostrarGeneral(document.getElementById('buscadorGeneral').value);
      }
      if (document.getElementById('tab-contactados').classList.contains('active')) {
        mostrarContactados(document.getElementById('buscadorContactados').value);
      }
      fetch(API_BACKEND_URL + "historial/toggleWasContacted/" + id, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" }
      })
    })
    .catch(err => {
      console.error("Error de red al togglear contacto:", err);
    })
}


// ═══════════ CONTACTADOS ═══════════
function mostrarContactados(filtro = '') {
  //console.log("Aqui se hace el fetch")
  getContactados()
    .then(data => {
      // console.log("Esta es la data para los contactados:", data);
      if (!data || typeof data !== 'object') {
        console.error("Respuesta inesperada al obtener contactados:", data);

      }
      const tbody = document.getElementById('listaContactados'), empty = document.getElementById('emptyContactados');
      let log = filtro ? data.filter(r => { const f = filtro.toUpperCase(); return r.name.toUpperCase().includes(f) || r.plate.toUpperCase().includes(f) || (r.service || '').toUpperCase().includes(f); }) : data;
      log = [...log].reverse();
      const total = data.length, placas = new Set(data.map(r => r.plate)).size;
      document.getElementById('statsContactados').innerHTML = `<div class="db-stat-item"><span class="db-dot" style="background:#059669"></span>${total} contacto${total !== 1 ? 's' : ''}</div><div class="db-stats-total">${placas} placa${placas !== 1 ? 's' : ''} distinta${placas !== 1 ? 's' : ''}</div>`;
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


    }).catch(err => {
      console.error("Error de red al obtener contactados:", err);
    });

}
//
//OJO, ARREGLAR ESTA FUNCION, ES PARA ELIMINAR LOS CONTACTADOS DEL LOG, NO PARA QUITAR EL CONTACTADO DE LA BASE DE DATOS, SOLO QUITARLO DE LA LISTA DE CONTACTADOS QUE SE MUESTRA EN LA PESTAÑA DE CONTACTADOS, PARA ESO HAY UN BOTON EN CADA FILA QUE LLAMA A ESTA FUNCION CON EL ID DEL LOG DE CONTACTADOS, NO EL ID DEL CLIENTE, HAY QUE HACER UN FILTRO PARA QUITAR ESE LOG DE CONTACTADOS Y VOLVER A MOSTRAR LOS CONTACTADOS CON EL FILTRO ACTIVO SI LO HAY
function eliminarLogContactado(id) {
  id = String(id || '');
  if (!id) {
    console.error("No se recibió ID del log para eliminar contactado.");
    return;
  }
  getContactados().then(contactados => {

    fetch(API_BACKEND_URL + "historial/toggleWasContacted/" + id, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" }
    }).then(
      () => {

        actualizarBadgeContactados();
        mostrarContactados(document.getElementById('buscadorContactados').value);
      }
    )

  }
  )
}

function filtrarContactados() { mostrarContactados(document.getElementById('buscadorContactados').value); }
function limpiarBuscadorContactados() { document.getElementById('buscadorContactados').value = ''; mostrarContactados(); document.getElementById('buscadorContactados').focus(); }
