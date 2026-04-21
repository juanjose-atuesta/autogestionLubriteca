function actualizar() {
  mostrarGeneral();
  mostrarAlertas();
  actualizarStats();
  buscarHistorial();
  actualizarBadgeContactados();
  mostrarContactados();
  renderAgenda();
  actualizarBadgeAgenda();
}

setInterval(() => { actualizar(); }, 3000); // Actualiza cada 30 segundos


