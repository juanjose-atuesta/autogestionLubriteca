// ═══════════ CONTACTADO ═══════════
const LIMITE_CONTACTADOS = 50;
let limiteContactadosActual = LIMITE_CONTACTADOS;
let filtroContactadosAplicado = '';
let temporizadorFiltroContactados = null;

async function actualizarBadgeContactados() {
  await cargarContactados();
  getContactados().then(contactados => {
    document.getElementById('nav-badge-contactados').textContent = contactados.length

  })
}
async function toggleContactado(id) {
  const clienteId = String(id);
  const clientes = await getClientes();
  const idxCliente = clientes.findIndex(c => String(c.id) === clienteId);
  const estadoActual = idxCliente !== -1 ? normalizarBooleanContactado(clientes[idxCliente].wasContacted) : false;

  await fetchToggleWasContactedClienteAPI(clienteId);
  mostrarAlertas();
  if (document.getElementById('tab-database').classList.contains('active')) {
    mostrarGeneral(document.getElementById('buscadorGeneral').value);
  }
  if (document.getElementById('tab-contactados').classList.contains('active')) {
    mostrarContactados(document.getElementById('buscadorContactados').value);
  }
  await fetchToggleHistorialContactadoAPI(clienteId);
}


// ═══════════ CONTACTADOS ═══════════
async function mostrarContactados(filtro = '') {
  await cargarContactados();
  const data = await getContactados();

  const tbody = document.getElementById('listaContactados'), empty = document.getElementById('emptyContactados');
  const textoFiltro = String(filtro || '').trim().toUpperCase();
  const filtrados = textoFiltro
    ? data.filter(r => {
      const f = textoFiltro;
      return r.name.toUpperCase().includes(f) || r.plate.toUpperCase().includes(f) || (r.service || '').toUpperCase().includes(f);
    })
    : data;
  const log = [...filtrados].reverse();
  const visibles = log.slice(0, limiteContactadosActual);

  const total = data.length, placas = new Set(data.map(r => r.plate)).size;
  document.getElementById('statsContactados').innerHTML = `<div class="db-stat-item"><span class="db-dot" style="background:#059669"></span>${total} contacto${total !== 1 ? 's' : ''}</div><div class="db-stats-total">${placas} placa${placas !== 1 ? 's' : ''} distinta${placas !== 1 ? 's' : ''}</div>`;
  document.getElementById('nav-badge-contactados').textContent = total;
  tbody.innerHTML = '';
  if (!visibles.length) { empty.style.display = 'block'; document.getElementById('tablaContactados').style.display = 'none'; }
  else {
    empty.style.display = 'none'; document.getElementById('tablaContactados').style.display = '';
    visibles.forEach(r => {
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

  actualizarBotonMostrarMasContactados(log.length - visibles.length);
}

function actualizarBotonMostrarMasContactados(quedan = 0) {
  const boton = document.getElementById('btnMostrarMasContactados');
  if (!boton) return;
  const restantes = Number(quedan) || 0;
  if (restantes > 0) {
    boton.textContent = `Mostrar más (${restantes})`;
    boton.style.display = 'inline-flex';
    return;
  }
  boton.style.display = 'none';
}

function mostrarMasContactados() {
  limiteContactadosActual += LIMITE_CONTACTADOS;
  mostrarContactados(document.getElementById('buscadorContactados')?.value || '');
}
//
//OJO, ARREGLAR ESTA FUNCION, ES PARA ELIMINAR LOS CONTACTADOS DEL LOG, NO PARA QUITAR EL CONTACTADO DE LA BASE DE DATOS, SOLO QUITARLO DE LA LISTA DE CONTACTADOS QUE SE MUESTRA EN LA PESTAÑA DE CONTACTADOS, PARA ESO HAY UN BOTON EN CADA FILA QUE LLAMA A ESTA FUNCION CON EL ID DEL LOG DE CONTACTADOS, NO EL ID DEL CLIENTE, HAY QUE HACER UN FILTRO PARA QUITAR ESE LOG DE CONTACTADOS Y VOLVER A MOSTRAR LOS CONTACTADOS CON EL FILTRO ACTIVO SI LO HAY
async function eliminarLogContactado(id) {
  id = String(id || '');
  if (!id) {
    console.error("No se recibió ID del log para eliminar contactado.");
    return;
  }
  await fetchToggleHistorialContactadoAPI(id);
  actualizarBadgeContactados();
  mostrarContactados(document.getElementById('buscadorContactados').value);
}

function filtrarContactados() {
  const texto = document.getElementById('buscadorContactados').value;
  if (texto !== filtroContactadosAplicado) limiteContactadosActual = LIMITE_CONTACTADOS;
  clearTimeout(temporizadorFiltroContactados);
  temporizadorFiltroContactados = setTimeout(() => {
    filtroContactadosAplicado = texto;
    mostrarContactados(texto);
  }, 200);
}
function limpiarBuscadorContactados() {
  document.getElementById('buscadorContactados').value = '';
  limiteContactadosActual = LIMITE_CONTACTADOS;
  filtroContactadosAplicado = '';
  clearTimeout(temporizadorFiltroContactados);
  mostrarContactados();
  document.getElementById('buscadorContactados').focus();
}