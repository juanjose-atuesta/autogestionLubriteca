

function actualizar() {
  fetch(API_BACKEND_URL + "customersList")
    .then(res => res.json())
    .then(data => {
      if (data.status === 'success') {
        const clientes = data.customers;
        setClientes(clientes);

        console.log("Se actualizo la lista de clientes:", clientes);
      }
      fetch(API_BACKEND_URL + "listCustomersContacted")
        .then(res => res.json())
        .then(data => {
          if (data.status === 'success') {
            setContactados(data.customerList);
          }
          console.log("Se actualizo la lista de contactados:", data);

        })

    }).then(() => {
      mostrarAlertas();
      mostrarGeneral();
    })

}

setInterval(() => { actualizar(); }, 3000);

