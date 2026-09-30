// Redibuja todo desde el store. No hace fetch.
// El SSE ya llama a refrescarVistas() por evento; esto queda como
// "pintar todo" manual.
function actualizar() {
  refrescarVistas({ clientes: true, citas: true });
  refrescarContactados();
  actualizarBadgeUsuarios();
  revisarCitasDeHoy();
}

/*
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

*/
