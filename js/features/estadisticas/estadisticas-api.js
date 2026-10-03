// ═══════════ ESTADÍSTICAS / PUNTOS — API ═══════════
async function getRankingUsuariosRegistrados() {
  try {
    const response = await fetch(API_BACKEND_URL + "users/rankingUsuarios");
    const data = await response.json();
    return data.users || [];
  } catch (error) {
    return [];
  }
}

async function editarPuntosUsuario(usuarioId, payload) {
  const usuario = datosUsuarioDesdeClave(usuarioId);
  if (!usuario) return null;
  try {
    const response = await fetch(urlUsuarioPorCedula("editPoints", usuario.cedula, usuario.telefono), {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...(payload || {}), telephone: usuario.telefono })
    });
    return response.json();
  } catch (error) {
    console.error('Error editando puntos:', error);
    return null;
  }
}
