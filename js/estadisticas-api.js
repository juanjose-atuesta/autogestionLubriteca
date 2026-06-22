// ═══════════ ESTADÍSTICAS / PUNTOS — API ═══════════

async function getRankingUsuariosRegistrados() {
  try {
    const response = await fetch(API_BACKEND_URL + "users/rankingUsuarios");
    const data = await response.json();
    console.log(data);
    console.log("holaaa");
    return data.users || [];
  } catch (error) {
    console.error('Error obteniendo ranking:', error);
    return [];
  }
}

async function editarPuntosUsuario(usuarioId, payload) {
  const id = String(usuarioId || '').trim();
  if (!id) return null;
  try {
    const response = await fetch(API_BACKEND_URL + "users/editPoints/" + id, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload || {})
    });
    return response.json();
  } catch (error) {
    console.error('Error editando puntos:', error);
    return null;
  }
}
