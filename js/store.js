
// ═══════════════════════════════════════════════════════════
// STORE — única fuente de verdad en memoria
// Se llena una sola vez al cargar y se mantiene al día con SSE.
// Ningún render hace fetch: todos leen de aquí.
// ═══════════════════════════════════════════════════════════

const store = {
  clientes: new Map(),   // clave: String(cliente.id)
  citas: new Map(),      // clave: String(cita.reservationId)
  historial: new Map(),  // clave: String(historial.id)  (colección historialDB)
  listo: false
};

// ── Claves ──
const claveCliente = c => String((c && c.id) || '').trim();
const claveCita = c => String((c && c.reservationId) || '').trim();
const claveHistorial = h => String((h && h.id) || '').trim();

// ── Índice citas → cliente (se reconstruye solo si cambió el store) ──
let indicePorCliente = new Map();
let versionIndice = -1;
let versionCitas = 0;

function indiceCitasPorCliente() {
  if (versionIndice === versionCitas) return indicePorCliente;
  const idx = new Map();
  store.citas.forEach(cita => {
    const clienteId = String(cita.customerId || '').trim();
    if (!clienteId) return;
    if (!idx.has(clienteId)) idx.set(clienteId, []);
    idx.get(clienteId).push(cita);
  });
  indicePorCliente = idx;
  versionIndice = versionCitas;
  return idx;
}

// ═══════════ MUTACIONES ═══════════

function setCliente(cliente) {
  const k = claveCliente(cliente);
  if (!k) return null;
  store.clientes.set(k, cliente);
  return cliente;
}

function eliminarClienteDelStore(id) {
  return store.clientes.delete(String(id || '').trim());
}

function reemplazarClientes(lista) {
  store.clientes = new Map();
  (Array.isArray(lista) ? lista : []).forEach(setCliente);
}

function setCita(cita) {
  const k = claveCita(cita);
  if (!k) return null;
  store.citas.set(k, cita);
  versionCitas++;
  return cita;
}

function eliminarCitaDelStore(reservationId) {
  const borrada = store.citas.delete(String(reservationId || '').trim());
  if (borrada) versionCitas++;
  return borrada;
}

function reemplazarCitas(lista) {
  store.citas = new Map();
  (Array.isArray(lista) ? lista : []).forEach(setCita);
  versionCitas++;
}

function setHistorial(registro) {
  const k = claveHistorial(registro);
  if (!k) return null;
  store.historial.set(k, registro);
  return registro;
}

function eliminarHistorialDelStore(id) {
  return store.historial.delete(String(id || '').trim());
}

function reemplazarHistorial(lista) {
  store.historial = new Map();
  (Array.isArray(lista) ? lista : []).forEach(setHistorial);
}

// ═══════════ QUERIES — clientes ═══════════

function estaContactado(cliente = {}) {
  return normalizarBooleanContactado(cliente.wasContacted);
}

function clientesTodos() {
  return Array.from(store.clientes.values());
}

function clientesPendientes() {
  return clientesTodos().filter(c => !estaContactado(c));
}

function clientePorId(id) {
  return store.clientes.get(String(id || '').trim()) || null;
}

function esAlertaDeHoy(cliente = {}, hoy = getHoy()) {
  return String(cliente.nextContact || '').trim() === hoy && !estaContactado(cliente);
}

function esAlertaAtrasada(cliente = {}, hoy = getHoy()) {
  const fecha = String(cliente.nextContact || '').trim();
  return fecha < hoy && !estaContactado(cliente);
}

function estaAlDia(cliente = {}, hoy = getHoy()) {
  const fecha = String(cliente.nextContact || '').trim();
  return fecha > hoy && !estaContactado(cliente);
}

// Orden de la tabla de alertas: hoy primero, luego de más atrasado a menos.
function ordenarAlertas(lista, hoy = getHoy()) {
  return lista.sort((a, b) => {
    const fa = String(a.nextContact || '').trim();
    const fb = String(b.nextContact || '').trim();
    if (fa === hoy && fb !== hoy) return -1;
    if (fb === hoy && fa !== hoy) return 1;
    return fb.localeCompare(fa);
  });
}

function alertasDeHoy(hoy = getHoy()) {
  return ordenarAlertas(clientesPendientes().filter(c => esAlertaDeHoy(c, hoy)), hoy);
}

function alertasAtrasadas(hoy = getHoy()) {
  return ordenarAlertas(clientesPendientes().filter(c => esAlertaAtrasada(c, hoy)), hoy);
}

function alertas(hoy = getHoy()) {
  return ordenarAlertas(
    clientesPendientes().filter(c => esAlertaDeHoy(c, hoy) || esAlertaAtrasada(c, hoy)),
    hoy
  );
}

function resumenClientes(hoy = getHoy()) {
  const pendientes = clientesPendientes();
  return {
    pendientes: pendientes.length,
    vencidos: pendientes.filter(c => esAlertaAtrasada(c, hoy)).length,
    hoy: pendientes.filter(c => esAlertaDeHoy(c, hoy)).length,
    alDia: pendientes.filter(c => estaAlDia(c, hoy)).length
  };
}

function resumenClientesDB(hoy = getHoy()) {
  const todos = clientesTodos();
  return {
    total: todos.length,
    vencidos: todos.filter(c => esAlertaAtrasada(c, hoy)).length,
    hoy: todos.filter(c => esAlertaDeHoy(c, hoy)).length,
    alDia: todos.filter(c => estaAlDia(c, hoy)).length
  };
}

// ═══════════ QUERIES — citas ═══════════

function citasTodas() {
  return Array.from(store.citas.values());
}

function citasAbiertas() {
  return citasTodas().filter(c => !normalizarBooleanConcluido(c.wasConcluded));
}

function citasConcluidas() {
  return citasTodas().filter(c => normalizarBooleanConcluido(c.wasConcluded));
}

function citaPorId(reservationId) {
  return store.citas.get(String(reservationId || '').trim()) || null;
}

function citasDeFecha(fecha, soloAbiertas = true) {
  return (soloAbiertas ? citasAbiertas() : citasTodas()).filter(c => c.date === fecha);
}

function citasDeCliente(customerId) {
  return indiceCitasPorCliente().get(String(customerId || '').trim()) || [];
}

// true si el espacio/hora está tomado por OTRA cita
function hayCitaEnEspacio(fecha, hora, espacio, ignorarReservationId = '') {
  const ignorar = String(ignorarReservationId || '').trim();
  return citasAbiertas().some(c =>
    c.date === fecha &&
    c.hour === hora &&
    c.space === espacio &&
    String(c.reservationId || '').trim() !== ignorar
  );
}

function horasOcupadas(fecha, espacio) {
  return new Set(
    citasAbiertas()
      .filter(c => c.date === fecha && c.space === espacio)
      .map(c => c.hour)
  );
}

// ═══════════ QUERIES — historial / contactados ═══════════

function historialTodos() {
  return Array.from(store.historial.values());
}

function contactados() {
  return historialTodos().filter(h => estaContactado(h));
}

// ═══════════ CARGA INICIAL ═══════════

async function cargarStore() {
  const [clientes, citas, historial] = await Promise.all([
    getClientesAll(),
    getCitasAll(),
    getHistorialDB()
  ]);

  reemplazarClientes(clientes);
  reemplazarCitas(citas);
  reemplazarHistorial(historial);
  store.listo = true;

  return store;
}

// ═══════════ SSE → store ═══════════

// Aplica un evento del backend al store.
// Devuelve qué colecciones cambiaron para saber qué renders hay que refrescar.
function aplicarEventoSSE(evento, payload = {}) {
  let doc = null, docId = '';
  if (payload.cliente) {
    doc = payload.cliente; docId = claveCliente(doc);
  } else if (payload.reserva) {
    doc = payload.reserva; docId = claveCita(doc);
  } else if (payload.historial) {
    doc = payload.historial; docId = claveHistorial(doc);
  }

  switch (evento) {
    // ── clientes ──
    case 'cliente-creado':
    case 'cliente-editado':
      if (!doc || !docId) return {};
      setCliente(doc);
      return { clientes: true };

    case 'cliente-eliminado':
      // Ojo: payload.id es el _id de Mongo, la clave del store es cliente.id
      if (doc && docId) eliminarClienteDelStore(docId);
      return { clientes: true };

    // ── citas ──
    case 'reserva-agregada':
    case 'reserva-editada':
    case 'reservacion-concluida':
      if (!doc || !docId) return {};
      setCita(doc);
      return { citas: true, clientes: true };

    case 'reserva-eliminada':
      if (doc && docId) eliminarCitaDelStore(docId);
      return { citas: true, clientes: true };

    // ── historial (pestaña contactados) ──
    case 'historial-guardado':
    case 'historial-contactado':
    case 'historial-editado':
      if (!doc || !docId) return {};
      setHistorial(doc);
      return { historial: true };

    default:
      return {};
  }
}
