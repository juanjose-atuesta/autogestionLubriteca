
// ═══════════ STORAGE ═══════════
const store = {
  clientes: new Map(),
  citas: new Map(),
  citasConcluidas: new Map(),
  citasConcluidasCargado: false,
  usuarios: new Map(),
  usuariosCargado: false,
  pedidos: new Map(),
  pedidosCargado: false,
  contactados: new Map(),
  contactadosCargado: false,
  clientesDB: new Map(),
  clientesDBCargado: false,
};

//fetch a la API 
async function fetchClientesAPI() {
  try {
    const response = await fetch(API_BACKEND_URL + "customers/customersListPanelPrincipal");
    const data = await response.json();
    return data.customers || [];

  }
  catch (error) {
    console.error('Error fetching clientes:', error);
    return [];
  }

}
async function fetchCitasAPI() {
  try {
    const response = await fetch(API_BACKEND_URL + "reservations/reservationsList");
    if (!response.ok) throw new Error('HTTP ' + response.status);
    const data = await response.json();
    return data.reservationList || [];
  } catch (error) {
    console.error('Error fetching citas:', error);
    return [];
  }
}

async function fetchReservationsConcludedAPI() {
  try {
    const response = await fetch(API_BACKEND_URL + "reservations/getReservationsConcluded");
    if (!response.ok) throw new Error('HTTP ' + response.status);
    const data = await response.json();
    return data.reservationList || data.reservations || [];
  } catch (error) {
    console.error('Error fetching citas concluidas:', error);
    return [];
  }
}

async function fetchUsuariosRegistradosAPI() {
  try {
    const response = await fetch(API_BACKEND_URL + "users/usersList");
    const data = await response.json();
    return data.users || [];
  } catch (error) {
    console.error('Error fetching usuarios registrados:', error);
    return [];
  }
}

// ═══════════ CITAS: escrituras ═══════════
// El store NO se toca aquí: se actualiza solo cuando llega el evento SSE
async function fetchSaveReservationAPI(payload) {
  const response = await fetch(API_BACKEND_URL + "reservations/saveReservation", {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!response.ok) throw new Error('HTTP ' + response.status);
  return response.json();
}

async function fetchEditReservationAPI(reservationId, payload) {
  const response = await fetch(API_BACKEND_URL + "reservations/editReservation/" + reservationId, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!response.ok) throw new Error('HTTP ' + response.status);
  return response.json();
}

async function fetchDeleteReservationAPI(reservationId) {
  const response = await fetch(API_BACKEND_URL + "reservations/deleteReservation/" + reservationId, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' }
  });
  if (!response.ok) throw new Error('HTTP ' + response.status);
  return response.json();
}

async function fetchReservationConcludedAPI(reservationId) {
  const response = await fetch(API_BACKEND_URL + "reservations/reservationConcluded/" + reservationId, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' }
  });
  if (!response.ok) throw new Error('HTTP ' + response.status);
  return response.json();
}

async function fetchToogleReservationConcludedAPI(customerId) {
  const response = await fetch(API_BACKEND_URL + "customers/toogleReservationConcluded/" + customerId, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' }
  });
  if (!response.ok) throw new Error('HTTP ' + response.status);
  return response.json();
}


//CARGAR INFORMACION EN EL STORRE 
async function recargarClientes() {
  const clientes = await fetchClientesAPI();
  store.clientes.clear();
  clientes.forEach(c => store.clientes.set(String(c.id), c));
}

async function recargarCitas() {
  const citas = await fetchCitasAPI();
  store.citas.clear();
  citas.forEach(ct => store.citas.set(String(ct.reservationId), ct));
}

async function recargarTodo() {
  await Promise.all([recargarClientes(), recargarCitas(), recargarUsuarios(), recargarPedidos(), recargarContactados(), recargarClientesDB()]);
}

// ═══════════ USUARIOS ═══════════
// ═══════════ PEDIDOS ═══════════
async function fetchPedidosAPI() {
  try {
    const response = await fetch(API_BACKEND_URL + "pedidos/getPedidos");
    const data = await response.json();
    return data.pedidos || [];
  } catch (error) {
    console.error('Error obteniendo pedidos:', error);
    return [];
  }
}

// ═══════════ PEDIDOS: escrituras ═══════════
// El store NO se toca aquí: se actualiza solo cuando llega el evento SSE
async function fetchSavePedidoAPI(payload) {
  try {
    const response = await fetch(API_BACKEND_URL + "pedidos/addPedido", {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload || {})
    });
    return response.json();
  } catch (error) {
    console.error('Error creando pedido:', error);
    return null;
  }
}

async function fetchEditPedidoAPI(pedidoMongoId, payload) {
  const id = String(pedidoMongoId || '').trim();
  if (!id) return null;
  try {
    const response = await fetch(API_BACKEND_URL + "pedidos/editPedido/" + id, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload || {})
    });
    return response.json();
  } catch (error) {
    console.error('Error editando pedido:', error);
    return null;
  }
}

async function fetchDeletePedidoAPI(pedidoMongoId) {
  const id = String(pedidoMongoId || '').trim();
  if (!id) return null;
  try {
    const response = await fetch(API_BACKEND_URL + "pedidos/deletePedido/" + id, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' }
    });
    return response.json();
  } catch (error) {
    console.error('Error eliminando pedido:', error);
    return null;
  }
}

// ═══════════ CONTACTADOS ═══════════
async function fetchContactadosAPI() {
  try {
    const response = await fetch(API_BACKEND_URL + "historial/historialListCustomersContacted");
    const data = await response.json();
    return data.customerList || [];
  } catch (error) {
    console.error(error);
    return [];
  }
}

// ═══════════ CONTACTADOS / CLIENTES: escrituras ═══════════
// El store NO se toca aquí: se actualiza solo cuando llega el evento SSE
async function fetchToggleWasContactedClienteAPI(clienteId) {
  const id = String(clienteId || '').trim();
  if (!id) return null;
  try {
    const response = await fetch(API_BACKEND_URL + "customers/toogleWasContacted/" + id, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
    });
    return await response.json();
  } catch (error) {
    console.error("Error de red al togglear contacto:", error);
    return null;
  }
}

async function fetchToggleHistorialContactadoAPI(historialId) {
  const id = String(historialId || '').trim();
  if (!id) return null;
  try {
    const response = await fetch(API_BACKEND_URL + "historial/toggleWasContacted/" + id, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" }
    });
    return await response.json();
  } catch (error) {
    console.error("Error de red al togglear contacto:", error);
    return null;
  }
}

// La cedula es el identificador principal, pero puede guardarse como "."
// cuando el cliente no quiere darlo: en ese caso la clave interna del store
// es el _id de Mongo para que dos usuarios con cedula "." no se pisen.
const CEDULA_SIN_DATO_USUARIO = ".";

function claveUsuario(usuario = {}) {
  const cedula = String(usuario?.id ?? '').trim();
  if (cedula && cedula !== CEDULA_SIN_DATO_USUARIO) return cedula;
  return String(usuario?._id ?? '').trim();
}

function obtenerUsuarioPorClave(clave) {
  const key = String(clave ?? '').trim();
  if (!key) return null;
  return store.usuarios.get(key) || null;
}

async function recargarUsuarios() {
  const usuarios = await fetchUsuariosRegistradosAPI();
  store.usuarios.clear();
  usuarios.forEach(u => store.usuarios.set(claveUsuario(u), u));
  store.usuariosCargado = true;
}

async function cargarUsuarios() {
  if (store.usuariosCargado) return;
  await recargarUsuarios();
}

function getUsuariosRegistrados() {
  return Promise.resolve(Array.from(store.usuarios.values()));
}

async function recargarPedidos() {
  const pedidos = await fetchPedidosAPI();
  store.pedidos.clear();
  pedidos.forEach(p => store.pedidos.set(String(p._id), p));
  store.pedidosCargado = true;
}

async function cargarPedidos() {
  if (store.pedidosCargado) return;
  await recargarPedidos();
}

function getPedidosRegistrados() {
  return Promise.resolve(Array.from(store.pedidos.values()));
}

// ═══════════ CONTACTADOS ═══════════
async function recargarContactados() {
  const contactados = await fetchContactadosAPI();
  store.contactados.clear();
  contactados.forEach(c => store.contactados.set(String(c.id), c));
  store.contactadosCargado = true;
}

async function cargarContactados() {
  if (store.contactadosCargado) return;
  await recargarContactados();
}

function getContactados() {
  return Promise.resolve(Array.from(store.contactados.values()));
}

// ═══════════ CITAS CONCLUIDAS (carga perezosa) ═══════════
async function recargarCitasConcluidas() {
  const citas = await fetchReservationsConcludedAPI();
  store.citasConcluidas.clear();
  citas.forEach(ct => {
    if (normalizarBooleanConcluido(ct.wasConcluded))
      store.citasConcluidas.set(String(ct.reservationId), ct);
  });
  store.citasConcluidasCargado = true;
}

async function cargarCitasConcluidas() {
  if (store.citasConcluidasCargado) return;
  await recargarCitasConcluidas();
}

//Leer informacion en memoria
function getClientes() {
  console.log("se obtubo la info desde el store")
  return Promise.resolve(Array.from(store.clientes.values()));

}

function getCitas() {

  return Promise.resolve(Array.from(store.citas.values()));
}

// ═══════════ ALTA/EDICION DE CLIENTE EN LOS DOS MAPS ═══════════
// store.clientesDB guarda todos los clientes; store.clientes solo los no contactados
// (mismo criterio que customersListPanelPrincipal), para que el panel de alertas no
// cuente clientes ya contactados.
function guardarClienteEnStore(cliente) {
  const doc = cliente && typeof cliente === 'object' ? cliente : null;
  const key = String(doc?.id ?? doc?._id ?? '');
  if (!doc || !key) return;
  store.clientesDB.set(key, doc);
  if (doc.wasContacted) store.clientes.delete(key);
  else store.clientes.set(key, doc);
}

function quitarClienteDelStore(id) {
  const key = String(id ?? '');
  if (!key) return;
  store.clientes.delete(key);
  store.clientesDB.delete(key);
}

// ═══════════ CLIENTES DB (pestaña Base de datos: todos los clientes) ═══════════
async function fetchClientesDBAPI() {
  try {
    const response = await fetch(API_BACKEND_URL + "customers/customersList");
    const data = await response.json();
    return data.customers || [];
  }
  catch (error) {
    console.error('Error fetching clientes:', error);
    return [];
  }
}

async function recargarClientesDB() {
  const clientes = await fetchClientesDBAPI();
  store.clientesDB.clear();
  clientes.forEach(c => store.clientesDB.set(String(c.id ?? c._id), c));
  store.clientesDBCargado = true;
}

async function cargarClientesDB() {
  if (store.clientesDBCargado) return;
  await recargarClientesDB();
}

function getClientesDB() {
  return Promise.resolve(Array.from(store.clientesDB.values()));
}

//function setClientes(arr) { localStorage.setItem('db_clientes', JSON.stringify(arr)); }
async function getHistorialDB() {
  try {
    const response = await fetch(API_BACKEND_URL + "historial/historialDBList");
    const data = await response.json();
    return data.historialDBList || [];
  } catch (error) {
    console.error('Error fetching historialDB:', error);
  }
}
//function setHistorialDB(arr) { localStorage.setItem('db_historial', JSON.stringify(arr)); }
//function setContactados(arr) { localStorage.setItem('db_contactados_log', JSON.stringify(arr)); }
//function getIdsContactados() { return JSON.parse(localStorage.getItem('db_contactados_ids')) || []; }
//function setIdsContactados(arr) { localStorage.setItem('db_contactados_ids', JSON.stringify(arr)); }
function getReservationsConcluded() {
  return Promise.resolve(Array.from(store.citasConcluidas.values()));
}

async function setCitas() {
  return getCitas();
}
