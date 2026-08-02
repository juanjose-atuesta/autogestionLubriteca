
// ═══════════ MIGRACIÓN ═══════════
/*
function migrarClientesAHistorial() {
  getClientes().then(c => {
    if (!c.length) return;
    const h = getHistorialDB();
    const ids = new Set(h.map(x => x.id));
    let n = 0;
    c.forEach(x => { if (!ids.has(x.id)) { h.push({ ...x, eliminado: false, fechaRegistro: x.fechaActual || fechaHoraActual() }); n++; } });
    if (n > 0) setHistorialDB(h);
  }).catch(console.error);
}
*/
// ═══════════ GUARDAR CLIENTE ═══════════
document.getElementById('clienteForm').addEventListener('submit', async e => {
  e.preventDefault();

  const c = {
    id: Date.now(),
    name: document.getElementById('nombre').value.toUpperCase(),
    telephone: limpiarTelefono(document.getElementById('telefono').value),
    plate: document.getElementById('placa').value.toUpperCase().trim(),
    service: document.getElementById('categoria').value,
    entryDate: document.getElementById('fechaActual').value,
    nextContact: document.getElementById('fechaFutura').value,
    mileage: document.getElementById('kilometraje').value,
    createAt: document.getElementById('fechaActual').value
  };
  fetch(API_BACKEND_URL + "customers/addCustomer", {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(c)
  })
    .then(response => response.json())
    .then(data => {
      //console.log(data.status);
      //console.log("se logro");
      fetch(API_BACKEND_URL + "historial/saveToHistorialDB", {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(c)
      }).then(res => res.json())
        .then(data => {

          mostrarToast(); actualizarStats(); mostrarAlertas(); revisarCitasDeHoy();
          document.getElementById('clienteForm').reset();
          setFechaHoyEnInput('fechaActual');

          fetch(API_BACKEND_URL + "eventos/changeValue", {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({})
          })

        })

    })
    .catch(console.error);
});

function eliminarCliente(id) {
  console.log("Hiciste click en eliminar cliente con id:", id);
  id = String(id);
  getClientes().then(cl => {
    const c = cl.find(x => String(x.id) === id);
    if (c) {
      fetch(API_BACKEND_URL + "customers/deleteCustomer/" + id, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      }).then(response => response.json())
        .then(data => {
          actualizarStats(); mostrarAlertas(); actualizarBadgeAgenda();
          if (document.getElementById('tab-database').classList.contains('active'))
            mostrarGeneral(document.getElementById('buscadorGeneral').value);
          if (document.getElementById('tab-agenda').classList.contains('active'))
            renderAgenda();

          // cerrarModalEliminar();
        })
      //No se para que es esto, pero no lo borro por si las moscas
      //setCitas(getCitas().filter(ct => String(ct.placa).toUpperCase() !== String(c.placa).toUpperCase()));
    }
  }).catch(console.error);
}
function formatoParaInput(fecha) {
  // Convierte "aaaa-mm-dd" a "aaaa-mm-dd"
  const anio = fecha.slice(0, 4);
  const mes = fecha.slice(5, 7);
  const dia = fecha.slice(8, 10);
  return `${anio}-${mes}-${dia}`;
}


// ═══════════ MODAL EDITAR ═══════════
function abrirModalEditar(id) {

  id = String(id);
  getClientes().then(clientes => {
    const c = clientes.find(x => String(x.id) === id);
    if (!c) return;
    //document.getElementById('editId').value = c.id;
    document.getElementById('editNombre').value = c.name;
    document.getElementById('editTelefono').value = c.telephone;
    document.getElementById('editPlaca').value = c.plate;
    document.getElementById('editCategoria').value = c.service;

    document.getElementById('editFechaActual').value = formatoParaInput(c.entryDate);
    document.getElementById('editFechaFutura').value = formatoParaInput(c.nextContact);
    document.getElementById('editKm').value = c.mileage;
    document.getElementById('modalEditar').classList.add('active');
  }).catch(console.error);
  document.querySelector("#buttonSaveEdition").addEventListener("click", () => {

    fetch(API_BACKEND_URL + "customers/editCustomer/" + id, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: id,
        name: document.getElementById('editNombre').value.toUpperCase(),
        telephone: limpiarTelefono(document.getElementById('editTelefono').value),
        plate: document.getElementById('editPlaca').value.toUpperCase().trim(),
        service: document.getElementById('editCategoria').value,
        entryDate: document.getElementById('editFechaActual').value,
        nextContact: document.getElementById('editFechaFutura').value,
        mileage: document.getElementById('editKm').value
      })
    })
      .then(() => {
        fetch(API_BACKEND_URL + "historial/editHistorialDBCustomer/" + id, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: id,
            name: document.getElementById('editNombre').value.toUpperCase(),
            telephone: limpiarTelefono(document.getElementById('editTelefono').value),
            plate: document.getElementById('editPlaca').value.toUpperCase().trim(),
            service: document.getElementById('editCategoria').value,
            entryDate: document.getElementById('editFechaActual').value,
            nextContact: document.getElementById('editFechaFutura').value,
            mileage: document.getElementById('editKm').value

          })
        })

          .then(response => response.json())
          .then(data => {
            if (data.status === "success") {
              cerrarModalEditar(); actualizarStats(); mostrarAlertas();
              if (document.getElementById('tab-database').classList.contains('active'))
                mostrarGeneral(document.getElementById('buscadorGeneral').value);

            }
          })
      })
  });
}


function guardarEdicion(idAux) {

  //const id = document.getElementById('editId').value;
  /*
      const idx = cl.findIndex(x => x.id === id);
      console.log(idx);
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

      // if (fAnt !== fNueva) setIdsContactados(getIdsContactados().filter(x => x !== id));

      //const h = getHistorialDB(), hIdx = h.findLastIndex(x => x.id === id);
      //if (hIdx !== -1) { h[hIdx] = { ...h[hIdx], ...act, eliminado: false }; setHistorialDB(h); }

      fetch(API_BACKEND_URL + "customers/editCustomer", {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...act })
      })
        .then(response => response.json())
        .then(data => { console.log(data.status); console.log("se logro editar"); })
        .catch(console.error);

      cl[idx] = act; setClientes(cl);
    */
  cerrarModalEditar(); actualizarStats(); mostrarAlertas();
  if (document.getElementById('tab-database').classList.contains('active'))
    mostrarGeneral(document.getElementById('buscadorGeneral').value);
}

let cacheUsuariosBusqueda = [];
let contextoBusquedaUsuario = 'principal';

function normalizarUsuarioBusqueda(usuario = {}) {
  return {
    name: String(usuario.name || '').trim(),
    telephone: String(usuario.telephone || '').trim(),
    id: String(usuario.id || '').trim(),
    email: String(usuario.email || usuario.emial || '').trim()
  };
}

function cerrarModalBuscarUsuario() {
  const modal = document.getElementById('modalBuscarUsuario');
  if (modal) modal.classList.remove('active');
  contextoBusquedaUsuario = 'principal';
}

function rellenarFormularioClienteDesdeUsuario(usuario = {}) {
  if (contextoBusquedaUsuario === 'pedidos') {
    if (typeof rellenarFormularioPedidoDesdeUsuario === 'function') {
      rellenarFormularioPedidoDesdeUsuario(usuario);
    }
    cerrarModalBuscarUsuario();
    contextoBusquedaUsuario = 'principal';
    return;
  }

  const nombreInput = document.getElementById('nombre');
  const telefonoInput = document.getElementById('telefono');
  if (!nombreInput || !telefonoInput) return;

  nombreInput.value = String(usuario.name || '').trim();
  telefonoInput.value = String(usuario.telephone || '').trim();
  cerrarModalBuscarUsuario();
  nombreInput.focus();
}

function renderUsuariosBusqueda(filtro = '') {
  const tbody = document.getElementById('listaUsuariosBusqueda');
  const empty = document.getElementById('emptyUsuariosBusqueda');
  const tabla = document.getElementById('tablaUsuariosBusqueda');
  if (!tbody || !empty || !tabla) return;

  const textoFiltro = String(filtro || '').trim().toUpperCase();
  const usuarios = (Array.isArray(cacheUsuariosBusqueda) ? cacheUsuariosBusqueda : []).filter(usuario => {
    if (!textoFiltro) return true;
    return (
      String(usuario.name || '').toUpperCase().includes(textoFiltro) ||
      String(usuario.telephone || '').toUpperCase().includes(textoFiltro) ||
      String(usuario.id || '').toUpperCase().includes(textoFiltro) ||
      String(usuario.email || '').toUpperCase().includes(textoFiltro)
    );
  });

  tbody.innerHTML = '';

  if (!usuarios.length) {
    tabla.style.display = 'none';
    empty.style.display = 'block';
    return;
  }

  empty.style.display = 'none';
  tabla.style.display = '';

  usuarios.forEach(usuario => {
    const tr = document.createElement('tr');

    const tdNombre = document.createElement('td');
    tdNombre.textContent = usuario.name || '-';

    const tdCedula = document.createElement('td');
    tdCedula.textContent = usuario.id || '-';

    const tdTelefono = document.createElement('td');
    tdTelefono.textContent = usuario.telephone || '-';

    const tdCorreo = document.createElement('td');
    tdCorreo.textContent = usuario.email || '-';

    const tdAccion = document.createElement('td');
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'btn-add-action';
    button.textContent = 'Agregar';
    button.addEventListener('click', () => rellenarFormularioClienteDesdeUsuario(usuario));
    tdAccion.appendChild(button);

    tr.append(tdNombre, tdCedula, tdTelefono, tdCorreo, tdAccion);
    tbody.appendChild(tr);
  });
}

async function cargarUsuariosBusqueda() {
  const datos = await getUsuariosRegistrados();
  cacheUsuariosBusqueda = Array.isArray(datos) ? datos.map(normalizarUsuarioBusqueda) : [];
  renderUsuariosBusqueda(document.getElementById('buscadorUsuariosBusqueda')?.value || '');
}

async function abrirPanelBuscarUsuario(contexto = 'principal') {
  const modal = document.getElementById('modalBuscarUsuario');
  if (!modal) return;
  contextoBusquedaUsuario = String(contexto || 'principal').trim() || 'principal';
  modal.classList.add('active');
  await cargarUsuariosBusqueda();
}

function filtrarUsuariosBusqueda() {
  renderUsuariosBusqueda(document.getElementById('buscadorUsuariosBusqueda')?.value || '');
}
