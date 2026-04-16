
// ═══════════ STORAGE ═══════════
function getClientes() { return JSON.parse(localStorage.getItem('db_clientes')) || []; }
function setClientes(arr) { localStorage.setItem('db_clientes', JSON.stringify(arr)); }
function getHistorialDB() { return JSON.parse(localStorage.getItem('db_historial')) || []; }
function setHistorialDB(arr) { localStorage.setItem('db_historial', JSON.stringify(arr)); }
function getContactados() { return JSON.parse(localStorage.getItem('db_contactados_log')) || []; }
function setContactados(arr) { localStorage.setItem('db_contactados_log', JSON.stringify(arr)); }
function getIdsContactados() { return JSON.parse(localStorage.getItem('db_contactados_ids')) || []; }
function setIdsContactados(arr) { localStorage.setItem('db_contactados_ids', JSON.stringify(arr)); }
function getCitas() { return JSON.parse(localStorage.getItem('db_citas')) || []; }
function setCitas(arr) { localStorage.setItem('db_citas', JSON.stringify(arr)); }
