
// ═══════════ STORAGE ═══════════
async function getClientes() {
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

async function getClientesDB() {
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
async function getContactados() {
  try {
    const response = await fetch(API_BACKEND_URL + "historial/historialListCustomersContacted");
    const data = await response.json();
    return data.customerList;
  }
  catch (error) { console.error(error); return []; }
}
//function setContactados(arr) { localStorage.setItem('db_contactados_log', JSON.stringify(arr)); }
//function getIdsContactados() { return JSON.parse(localStorage.getItem('db_contactados_ids')) || []; }
//function setIdsContactados(arr) { localStorage.setItem('db_contactados_ids', JSON.stringify(arr)); }
async function getCitas() {
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
async function setCitas() {
  return getCitas();
}
