// ═══════════ IDENTIFICACIÓN DE USUARIOS ═══════════
// La clave interna puede ser la cédula o el _id (cuando la cédula es "."), así que
// cada llamada resuelve el documento en el store y envía cédula + teléfono.
// El backend exige un único usuario con esa cédula y que el teléfono coincida.

// Resuelve {cedula, telefono} a partir de la clave interna de una fila.
function datosUsuarioDesdeClave(clave) {
  const key = String(clave ?? '').trim();
  if (!key) return null;
  const usuario = obtenerUsuarioPorClave(key);
  const cedula = String(usuario?.id ?? key).trim();
  if (!cedula) return null;
  return { cedula, telefono: String(usuario?.telephone ?? '').trim() };
}

function urlUsuarioPorCedula(ruta, cedula, telefono) {
  const url = API_BACKEND_URL + "users/" + ruta + "/" + encodeURIComponent(cedula);
  return telefono ? url + "?telephone=" + encodeURIComponent(telefono) : url;
}

async function obtenerUsuariosDisponiblesParaRecomendar(usuarioId) {
  const usuario = datosUsuarioDesdeClave(usuarioId);
  if (!usuario) return [];
  try {
    const response = await fetch(urlUsuarioPorCedula("availableToRecommend", usuario.cedula, usuario.telefono));
    const data = await response.json();

    if (data?.status === 'error') return [];
    return data.users || [];
  } catch (error) {
    console.error('Error obteniendo usuarios disponibles:', error);
    return [];
  }
}
async function crearUsuarioRegistrado(payload) {
  try {
    const response = await fetch(API_BACKEND_URL + "users/addUser", {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload || {})
    });
    return response.json();
  } catch (error) {
    console.error('Error creando usuario registrado:', error);
    return null;
  }
}

async function agregarCompraAltaUsuario(usuarioId, idBill) {
  const usuario = datosUsuarioDesdeClave(usuarioId);
  const factura = String(idBill || '').trim();
  if (!usuario || !factura) return null;

  try {
    const response = await fetch(urlUsuarioPorCedula("addHighBuy", usuario.cedula, usuario.telefono), {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idBill: factura, telephone: usuario.telefono })
    });
    return response.json();
  } catch (error) {
    console.error('Error agregando compra alta al usuario:', error);
    return null;
  }
}

async function agregarCompraFrecuenteUsuario(usuarioId, service) {
  const usuario = datosUsuarioDesdeClave(usuarioId);
  const producto = String(service || '').trim();
  if (!usuario || !producto) return null;

  try {
    const response = await fetch(urlUsuarioPorCedula("addFrecuentBuy", usuario.cedula, usuario.telefono), {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ service: producto, telephone: usuario.telefono })
    });
    return response.json();
  } catch (error) {
    console.error('Error agregando compra frecuente al usuario:', error);
    return null;
  }
}

async function obtenerUsuariosRecomendadosUsuario(usuarioId) {
  const usuario = datosUsuarioDesdeClave(usuarioId);
  if (!usuario) return [];

  try {
    const response = await fetch(urlUsuarioPorCedula("recommendedUsers", usuario.cedula, usuario.telefono));
    const data = await response.json();
    return data.recommendedUsers || [];
  } catch (error) {
    console.error('Error obteniendo recomendados del usuario:', error);
    return [];
  }
}

async function editarUsuarioRegistrado(usuarioId, payload) {
  const usuario = datosUsuarioDesdeClave(usuarioId);
  if (!usuario) return null;

  try {
    const response = await fetch(urlUsuarioPorCedula("editUser", usuario.cedula, usuario.telefono), {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...(payload || {}), telephone: payload?.telephone ?? usuario.telefono })
    });
    return response.json();
  } catch (error) {
    console.error('Error editando usuario registrado:', error);
    return null;
  }
}

async function eliminarUsuarioRegistrado(usuarioId) {
  const usuario = datosUsuarioDesdeClave(usuarioId);
  if (!usuario) return null;

  try {
    const response = await fetch(urlUsuarioPorCedula("deleteUser", usuario.cedula, usuario.telefono), {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ telephone: usuario.telefono })
    });
    return response.json();
  } catch (error) {
    console.error('Error eliminando usuario registrado:', error);
    return null;
  }
}

async function marcarUsuarioComoRecomendado(usuarioId) {
  const usuario = datosUsuarioDesdeClave(usuarioId);
  if (!usuario) return null;

  try {
    const response = await fetch(urlUsuarioPorCedula("setRecommended", usuario.cedula, usuario.telefono), {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ telephone: usuario.telefono })
    });
    return response.json();
  } catch (error) {
    console.error('Error marcando usuario como recomendado:', error);
    return null;
  }
}
async function agregarUsuarioRecomendadoAlUsuario(usuarioId, usuarioRecomendadoId) {
  const usuario = datosUsuarioDesdeClave(usuarioId);
  const recomendado = datosUsuarioDesdeClave(usuarioRecomendadoId);
  if (!usuario || !recomendado) return null;

  try {
    const response = await fetch(urlUsuarioPorCedula("addRecommendedUser", usuario.cedula, usuario.telefono), {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recommendedUserId: recomendado.cedula,
        recommendedTelephone: recomendado.telefono,
        telephone: usuario.telefono
      })
    });
    return response.json();
  } catch (error) {
    console.error('Error agregando usuario recomendado:', error);
    return null;
  }
}


async function agregarUsuarioQueMeRecomendo(usuarioId, usuarioRecomendadoId) {
  const usuario = datosUsuarioDesdeClave(usuarioId);
  const recomendado = datosUsuarioDesdeClave(usuarioRecomendadoId);
  if (!usuario || !recomendado) return null;

  try {
    const response = await fetch(urlUsuarioPorCedula("addRecommendedMe", recomendado.cedula, recomendado.telefono), {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recommendedMe: usuario.cedula,
        recommendedMeTelephone: usuario.telefono
      })
    })
    return response.json();

  } catch (error) {
    console.error('Error agregando usuario recomendado:', error);
    return null;
  }
}