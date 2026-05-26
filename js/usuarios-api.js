function obtenerIdUsuarioDesdeClick(elemento) {
  const id = String(
    elemento?.dataset?.usuarioId ||
    elemento?.closest?.('[data-usuario-id]')?.dataset?.usuarioId ||
    ''
  ).trim();
  if (!id) console.error('No se pudo obtener el id del usuario desde el botón clickeado.');
  return id;
}

async function getUsuariosRegistrados() {
  try {
    const response = await fetch(API_BACKEND_URL + "users/usersList");
    const data = await response.json();
    return data.users || data.userList || [];
  } catch (error) {
    console.error('Error fetching usuarios registrados:', error);
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

async function actualizarPuntosUsuario(usuarioId, delta) {
  const id = String(usuarioId || '').trim();
  if (!id) return null;

  try {
    const response = await fetch(API_BACKEND_URL + "users/updatePoints/" + id, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ delta })
    });
    return response.json();
  } catch (error) {
    console.error('Error actualizando puntos de usuario:', error);
    return null;
  }
}

async function obtenerUsuariosRecomendadosUsuario(usuarioId) {
  const id = String(usuarioId || '').trim();
  if (!id) return [];

  try {
    const response = await fetch(API_BACKEND_URL + "users/recommendedUsers/" + id);
    const data = await response.json();
    console.log(data.recommendedUsers);
    return data.recommendedUsers;
  } catch (error) {
    console.error('Error obteniendo recomendados del usuario:', error);
    return [];
  }
}


async function editarUsuarioRegistrado(usuarioId, payload) {
  console.log((payload));
  const id = String(usuarioId || '').trim();
  if (!id) return null;

  try {
    const response = await fetch(API_BACKEND_URL + "users/editUser/" + id, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return response.json();
  } catch (error) {
    console.error('Error editando usuario registrado:', error);
    return null;
  }
}

async function eliminarUsuarioRegistrado(usuarioId) {
  const id = String(usuarioId || '').trim();
  if (!id) return null;

  try {
    const response = await fetch(API_BACKEND_URL + "users/deleteUser/" + id, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' }
    });
    return response.json();
  } catch (error) {
    console.error('Error eliminando usuario registrado:', error);
    return null;
  }
}

async function obtenerUsuariosNoRecomendados() {
  try {
    const response = await fetch(API_BACKEND_URL + "users/usersNotContacted/");
    const data = await response.json();
    return data.users || data.userList || [];
  } catch (error) {
    console.error('Error obteniendo usuarios no recomendados:', error);
    return [];
  }
}

async function marcarUsuarioComoRecomendado(usuarioId) {
  const id = String(usuarioId || '').trim();
  if (!id) return null;

  try {
    const response = await fetch(API_BACKEND_URL + "users/setRecommended/" + id, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' }
    });
    return response.json();
  } catch (error) {
    console.error('Error marcando usuario como recomendado:', error);
    return null;
  }
}
async function agregarUsuarioRecomendadoAlUsuario(usuarioId, usuarioRecomendadoId) {
  const id = String(usuarioId || '').trim();
  const recommendedId = String(usuarioRecomendadoId || '').trim();
  if (!id || !recommendedId) return null;

  try {
    const response = await fetch(API_BACKEND_URL + "users/addRecommendedUser/" + id, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recommendedUserId: recommendedId })
    });
    return response.json();
  } catch (error) {
    console.error('Error agregando usuario recomendado:', error);
    return null;
  }
}
