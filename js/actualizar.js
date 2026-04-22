function actualizar() {
  mostrarGeneral();
  mostrarAlertas();
  actualizarStats();
  buscarHistorial();
  actualizarBadgeContactados();
  mostrarContactados();
  renderAgenda();
  if (document.getElementById('tab-citas-programadas').classList.contains('active'))
    renderListaCitasProgramadas(document.getElementById('buscadorCitasProgramadas').value);
  actualizarBadgeAgenda();
  actualizarBadgeCitasProgramadas();
}

setInterval(() => { actualizar(); }, 3000); // Actualiza cada 30 segundos
