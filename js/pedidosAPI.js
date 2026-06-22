// ═══════════ PEDIDOS API ═══════════

async function getPedidosRegistrados() {
  try {
    const response = await fetch(API_BACKEND_URL + "pedidos/getPedidos");
    const data = await response.json();
    return data.pedidos || [];
  } catch (error) {
    console.error('Error obteniendo pedidos:', error);
    return [];
  }
}

async function getPedidoPorId(pedidoMongoId) {
  const id = String(pedidoMongoId || '').trim();
  if (!id) return null;
  try {
    const response = await fetch(API_BACKEND_URL + "pedidos/getPedido/" + id);
    const data = await response.json();
    return data.pedido || null;
  } catch (error) {
    console.error('Error obteniendo pedido:', error);
    return null;
  }
}

async function crearPedidoRegistrado(payload) {
  try {
    const response = await fetch(API_BACKEND_URL + "pedidos/addPedido", {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload || {})
    });
    return response.json();
  } catch (error) {
    console.error('Error creando pedido:', error);
    return null;
  }
}

async function editarPedidoRegistrado(pedidoMongoId, payload) {
  const id = String(pedidoMongoId || '').trim();
  if (!id) return null;
  try {
    const response = await fetch(API_BACKEND_URL + "pedidos/editPedido/" + id, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload || {})
    });
    return response.json();
  } catch (error) {
    console.error('Error editando pedido:', error);
    return null;
  }
}

async function eliminarPedidoRegistrado(pedidoMongoId) {
  const id = String(pedidoMongoId || '').trim();
  if (!id) return null;
  try {
    const response = await fetch(API_BACKEND_URL + "pedidos/deletePedido/" + id, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' }
    });
    return response.json();
  } catch (error) {
    console.error('Error eliminando pedido:', error);
    return null;
  }
}
