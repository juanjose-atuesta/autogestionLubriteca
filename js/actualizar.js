function actualizar() {
  fetch(API_BACKEND_URL + "customersList")
    .then(res => res.json())
    .then(data => {
      if (data.status === 'success') {
        const clientes = data.customers;
        setClientes(clientes);
        console.log("Se actualizo la lista de clientes:", clientes);
      }
      return fetch(API_BACKEND_URL + "listCustomersContacted");
    })
    .then(res => res.json())
    .then(data => {
      if (data.status === 'success') {
        setContactados(data.customerList);
      }
      console.log("Se actualizo la lista de contactados:", data);
      return fetch("http://192.168.80.25:3000/api/historial/historialDBList");
    })
    .then(res => res.json())
    .then(data => {
      if (data.status === 'success') {
        setHistorialDB(data.historialDBList);
      }
      console.log("Se actualizo la lista de historial:", data);
      mostrarGeneral();
      mostrarAlertas();
      actualizarStats();
      buscarHistorial();
      actualizarBadgeContactados();
      mostrarContactados();
    });
}

setInterval(() => { actualizar(); }, 30000); // Actualiza cada 30 segundos


