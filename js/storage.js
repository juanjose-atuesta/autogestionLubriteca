
// ═══════════════════════════════════════════════════════════
// STORAGE — única capa que habla con el backend para LEER
// Solo se usa en la carga inicial del store (js/store.js).
// Cualquier render posterior lee del store, nunca de aquí.
// ═══════════════════════════════════════════════════════════

// Clientes sin filtro de wasContacted: el store guarda pendientes y
// contactados, y cada vista decide qué mostrar.
async function getClientesAll() {
  try {
    const response = await fetch(API_BACKEND_URL + "customers/customersListAll");
    const data = await response.json();
    return data.customers || [];
  }
  catch (error) {
    console.error('Error fetching clientesAll:', error);
    return [];
  }
}

// Reservas sin filtro de wasConcluded (abiertas + concluidas).
async function getCitasAll() {
  try {
    const response = await fetch(API_BACKEND_URL + "reservations/reservationsListAll");
    if (!response.ok) throw new Error('HTTP ' + response.status);
    const data = await response.json();
    return data.reservationList || [];
  } catch (error) {
    console.error('Error fetching citasAll:', error);
    return [];
  }
}

// Colección historialDB completa (base de la pestaña Contactados).
async function getHistorialDB() {
  try {
    const response = await fetch(API_BACKEND_URL + "historial/historialDBList");
    const data = await response.json();
    return data.historialDBList || [];
  } catch (error) {
    console.error('Error fetching historialDB:', error);
    return [];
  }
}
