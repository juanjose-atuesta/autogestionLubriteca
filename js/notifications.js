
// ═══════════════════════════════════════════
// NOTIFICACIONES
// ═══════════════════════════════════════════
function revisarCitasDeHoy() {
  const hoy = getHoy();
  getClientes().forEach(c => { if (String(c.fechaFutura).trim() === hoy) dispararNotificacion(c); });
}
function dispararNotificacion(c) {
  if (Notification.permission === "granted")
    new Notification(`RECORDATORIO: ${c.nombre}`, { body: `Hoy: ${c.categoria} · Placa ${c.placa} · Tel: ${c.telefono}`, icon: 'https://cdn-icons-png.flaticon.com/512/1033/1033935.png' });
}
