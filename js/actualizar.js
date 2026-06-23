function actualizar() {
  mostrarGeneral();
  mostrarAlertas();
  actualizarStats();
  buscarHistorial();
  actualizarBadgeContactados();
  mostrarContactados();
  actualizarBadgeUsuarios();
  if (document.getElementById('tab-usuarios').classList.contains('active'))
    mostrarUsuarios(document.getElementById('buscadorUsuarios').value);
  renderAgenda();
  if (document.getElementById('tab-citas-programadas').classList.contains('active'))
    renderListaCitasProgramadas(document.getElementById('buscadorCitasProgramadas').value);
  actualizarBadgeAgenda();
  actualizarBadgeCitasProgramadas();
}


async function verificarCambios() {
  const response = await fetch(API_BACKEND_URL + "eventos/getvalue");
  const data = await response.json();
  const objeto = data.valor
  console.log(currentValue)
  if (objeto.value !== currentValue) {
    currentValue = objeto.value;

    console.log("Hubo cambios");

    actualizar();
  }
  else {
    console.log("no hay cambios");
  }
}
async function iniciar() {
  await cargarValorInicial();

  console.log(currentValue);

  actualizar();

  setInterval(verificarCambios, 3000);
}

iniciar();
