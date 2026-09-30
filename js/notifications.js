
// ═══════════════════════════════════════════
// NOTIFICACIONES
// ═══════════════════════════════════════════
function revisarCitasDeHoy() {
  const hoy = getHoy();
  alertasDeHoy(hoy).forEach(c => dispararNotificacion(c));
}
function dispararNotificacion(c) {
  if (Notification.permission === "granted")
    new Notification(`RECORDATORIO: ${c.name}`, { body: `Hoy: ${c.service} · Placa ${c.plate} · Tel: ${c.telephone}`, icon: 'https://cdn-icons-png.flaticon.com/512/1033/1033935.png' });
}
