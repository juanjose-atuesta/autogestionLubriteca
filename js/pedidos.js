// ═══════════ PEDIDOS — ESTADO ═══════════
let cachePedidosRegistrados = [];
let pedidoIdEnEdicion = null; // _id de Mongo del pedido que se está editando, null si es nuevo
let pedidoIdPendienteEliminar = null;
let contadorFilaOtrosPedido = 0;

// Grupos fijos del formulario (coinciden con el formato del recibo físico)
const GRUPOS_FIJOS_PEDIDO = [
  { key: 'oil', label: 'F. Aceite' },
  { key: 'FAire', label: 'F. Aire' },
  { key: 'FComb', label: 'F. Combustible' },
  { key: 'FAA', label: 'F.A.A' }
];

// ═══════════ HELPERS DE FORMATO ═══════════

function formatearMonedaPedido(valor) {
  const numero = Number(valor) || 0;
  return numero.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
}

function calcularTotalFilaPedido(cantidad, precioUnitario) {
  return (Number(cantidad) || 0) * (Number(precioUnitario) || 0);
}

// ═══════════ FILAS DE ITEMS (cantidad / referencia / precio / total) ═══════════

function actualizarTotalGeneralPedido() {
  const totales = document.querySelectorAll('#formPedido .td-total-fila-pedido');
  let total = 0;
  totales.forEach(td => {
    total += Number(td.dataset.valor || 0);
  });
  const elTotal = document.getElementById('pedidoTotalGeneral');
  if (elTotal) elTotal.textContent = formatearMonedaPedido(total);
}

function engancharCalculoFilaPedido(tr) {
  const inputCantidad = tr.querySelector('.input-cantidad-pedido');
  const inputPrecio = tr.querySelector('.input-precio-pedido');
  const tdTotal = tr.querySelector('.td-total-fila-pedido');
  if (!inputCantidad || !inputPrecio || !tdTotal) return;

  function recalcular() {
    const total = calcularTotalFilaPedido(inputCantidad.value, inputPrecio.value);
    tdTotal.textContent = formatearMonedaPedido(total);
    tdTotal.dataset.valor = total;
    actualizarTotalGeneralPedido();
  }

  inputCantidad.addEventListener('input', recalcular);
  inputPrecio.addEventListener('input', recalcular);
  recalcular();
}

function crearFilaOtrosPedido(valores = {}) {
  contadorFilaOtrosPedido++;
  const tr = document.createElement('tr');
  tr.className = 'fila-item-pedido';
  tr.dataset.idOtros = contadorFilaOtrosPedido;
  tr.innerHTML = `
    <td><input type="number" min="0" step="1" class="input-cantidad-pedido" value="${valores.cantidad ?? ''}" placeholder="0"></td>
    <td><input type="text" class="input-referencia-pedido" value="${valores.referencia ?? ''}" placeholder="Referencia"></td>
    <td><input type="number" min="0" step="any" class="input-precio-pedido" value="${valores.precio ?? ''}" placeholder="0"></td>
    <td class="td-total-fila-pedido" data-valor="0">$0</td>
    <td><button type="button" class="btn-del-fila-pedido" title="Eliminar fila">✕</button></td>`;

  tr.querySelector('.btn-del-fila-pedido').addEventListener('click', () => {
    tr.remove();
    actualizarTotalGeneralPedido();
  });

  engancharCalculoFilaPedido(tr);
  return tr;
}

function agregarFilaOtrosPedido() {
  const tbody = document.getElementById('tbodyOtrosPedido');
  if (!tbody) return;
  tbody.appendChild(crearFilaOtrosPedido());
}

// ═══════════ LEER / RELLENAR FORMULARIO ═══════════

function leerGrupoFijoPedidoDesdeForm(key) {
  const fila = document.querySelector(`#formPedido tr[data-grupo="${key}"]`);
  if (!fila) return [0, '', 0];
  const cantidad = Number(fila.querySelector('.input-cantidad-pedido')?.value) || 0;
  const referencia = String(fila.querySelector('.input-referencia-pedido')?.value || '').trim();
  const precio = Number(fila.querySelector('.input-precio-pedido')?.value) || 0;
  return [cantidad, referencia, precio];
}

function rellenarGrupoFijoPedidoEnForm(key, fila = []) {
  const tr = document.querySelector(`#formPedido tr[data-grupo="${key}"]`);
  if (!tr) return;
  const [cantidad = '', referencia = '', precio = ''] = fila;
  tr.querySelector('.input-cantidad-pedido').value = cantidad || '';
  tr.querySelector('.input-referencia-pedido').value = referencia || '';
  tr.querySelector('.input-precio-pedido').value = precio || '';
  tr.querySelector('.input-cantidad-pedido').dispatchEvent(new Event('input'));
}

function leerOtrosPedidoDesdeForm() {
  const filas = document.querySelectorAll('#tbodyOtrosPedido tr');
  const resultado = [];
  filas.forEach(fila => {
    const cantidad = Number(fila.querySelector('.input-cantidad-pedido')?.value) || 0;
    const referencia = String(fila.querySelector('.input-referencia-pedido')?.value || '').trim();
    const precio = Number(fila.querySelector('.input-precio-pedido')?.value) || 0;
    if (cantidad || referencia || precio) resultado.push([cantidad, referencia, precio]);
  });
  return resultado;
}

function construirPayloadPedidoDesdeForm() {
  const payload = {
    vehicleMake: String(document.getElementById('pedidoVehicleMake')?.value || '').trim(),
    name: String(document.getElementById('pedidoCliente')?.value || '').trim(),
    id: String(document.getElementById('pedidoCedula')?.value || '').trim(),
    telephone: String(document.getElementById('pedidoTelefono')?.value || '').trim(),
    email: String(document.getElementById('pedidoCorreo')?.value || '').trim(),
    orden: String(document.getElementById('pedidoOrden')?.value || '').trim(),
    EL: String(document.getElementById('pedidoEL')?.value || '').trim(),
    plate: String(document.getElementById('pedidoPlaca')?.value || '').trim(),
    mileage: String(document.getElementById('pedidoKilometraje')?.value || '').trim()
  };

  GRUPOS_FIJOS_PEDIDO.forEach(grupo => {
    payload[grupo.key] = [leerGrupoFijoPedidoDesdeForm(grupo.key)];
  });

  payload.otros = leerOtrosPedidoDesdeForm();
  return payload;
}

function limpiarFormularioPedido() {
  const form = document.getElementById('formPedido');
  if (form) form.reset();

  GRUPOS_FIJOS_PEDIDO.forEach(grupo => rellenarGrupoFijoPedidoEnForm(grupo.key, ['', '', '']));

  const tbodyOtros = document.getElementById('tbodyOtrosPedido');
  if (tbodyOtros) tbodyOtros.innerHTML = '';

  pedidoIdEnEdicion = null;
  const btnGuardar = document.getElementById('btnGuardarPedido');
  if (btnGuardar) btnGuardar.textContent = '💾 Guardar Pedido';

  actualizarTotalGeneralPedido();
}

function cargarPedidoEnFormulario(pedido) {
  if (!pedido) return;
  pedidoIdEnEdicion = pedido._id;

  document.getElementById('pedidoVehicleMake').value = pedido.vehicleMake || '';
  document.getElementById('pedidoCliente').value = pedido.name || '';
  document.getElementById('pedidoCedula').value = pedido.id || '';
  document.getElementById('pedidoTelefono').value = pedido.telephone || '';
  document.getElementById('pedidoCorreo').value = pedido.email || '';
  document.getElementById('pedidoOrden').value = pedido.orden || '';
  document.getElementById('pedidoEL').value = pedido.EL || '';
  document.getElementById('pedidoPlaca').value = pedido.plate || '';
  document.getElementById('pedidoKilometraje').value = pedido.mileage || '';

  GRUPOS_FIJOS_PEDIDO.forEach(grupo => {
    const valores = Array.isArray(pedido[grupo.key]) ? pedido[grupo.key] : [];
    rellenarGrupoFijoPedidoEnForm(grupo.key, valores[0] || ['', '', '']);
  });

  const tbodyOtros = document.getElementById('tbodyOtrosPedido');
  if (tbodyOtros) tbodyOtros.innerHTML = '';
  const otros = Array.isArray(pedido.otros) ? pedido.otros : [];
  otros.forEach(fila => {
    tbodyOtros.appendChild(crearFilaOtrosPedido({ cantidad: fila[0] ?? '', referencia: fila[1] ?? '', precio: fila[2] ?? '' }));
  });

  const btnGuardar = document.getElementById('btnGuardarPedido');
  if (btnGuardar) btnGuardar.textContent = `💾 Guardar cambios — Orden ${pedido.orden || ''}`;

  actualizarTotalGeneralPedido();
  document.getElementById('pedidoVehicleMake')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ═══════════ GUARDAR (crear o editar) ═══════════

async function guardarPedidoDesdeFormulario(evento) {
  if (evento) evento.preventDefault();

  const payload = construirPayloadPedidoDesdeForm();
  if (!payload.name || !payload.id || !payload.telephone || !payload.orden) {
    alert('Completa al menos Cliente, Cédula, Teléfono y N° de Orden.');
    return;
  }

  if (pedidoIdEnEdicion) {
    await editarPedidoRegistrado(pedidoIdEnEdicion, payload);
  } else {
    await crearPedidoRegistrado(payload);
  }

  limpiarFormularioPedido();
  mostrarPedidos(document.getElementById('buscadorPedidos')?.value || '');
}

function cancelarEdicionPedido() {
  limpiarFormularioPedido();
}

// ═══════════ LISTADO + BUSCADOR ═══════════

async function actualizarBadgePedidos() {
  const badge = document.getElementById('nav-badge-pedidos');
  if (!badge) return;
  badge.textContent = Array.isArray(cachePedidosRegistrados) ? cachePedidosRegistrados.length : 0;
}

async function mostrarPedidos(filtro = '') {
  const tbody = document.getElementById('listaPedidos');
  if (!tbody) return;

  const empty = document.getElementById('emptyPedidos');
  const tabla = document.getElementById('tablaPedidos');

  const data = await getPedidosRegistrados();
  const todos = Array.isArray(data) ? data : [];
  cachePedidosRegistrados = todos;

  const textoFiltro = String(filtro || '').trim().toUpperCase();
  let pedidos = todos;
  if (textoFiltro) {
    pedidos = todos.filter(p =>
      String(p.name || '').toUpperCase().includes(textoFiltro) ||
      String(p.id || '').toUpperCase().includes(textoFiltro) ||
      String(p.plate || '').toUpperCase().includes(textoFiltro) ||
      String(p.orden || '').toUpperCase().includes(textoFiltro) ||
      String(p.vehicleMake || '').toUpperCase().includes(textoFiltro)
    );
  }

  pedidos = [...pedidos].reverse();

  tbody.innerHTML = '';
  if (!pedidos.length) {
    empty.style.display = 'block';
    tabla.style.display = 'none';
    actualizarBadgePedidos();
    return;
  }

  empty.style.display = 'none';
  tabla.style.display = '';

  pedidos.forEach(pedido => {
    const idSafe = String(pedido._id || '').replace(/'/g, "\\'");
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${pedido.orden || '-'}</td>
      <td>${pedido.vehicleMake || '-'}</td>
      <td>${pedido.name || '-'}</td>
      <td>${pedido.plate || '-'}</td>
      <td>${pedido.telephone || '-'}</td>
      <td>${formatearMonedaPedido(pedido.precioTotal)}</td>
      <td>
        <button class="btn-edit" data-pedido-id="${idSafe}" onclick="editarPedidoDesdeBoton(this)" ${idSafe ? '' : 'disabled'}>✎ Editar</button>
        <button class="btn-del" data-pedido-id="${idSafe}" onclick="eliminarPedidoDesdeBoton(this)" ${idSafe ? '' : 'disabled'}>✕ Eliminar</button>
      </td>`;
    tbody.appendChild(tr);
  });

  actualizarBadgePedidos();
}

function filtrarPedidos() {
  mostrarPedidos(document.getElementById('buscadorPedidos').value);
}

function limpiarBuscadorPedidos() {
  const buscador = document.getElementById('buscadorPedidos');
  buscador.value = '';
  mostrarPedidos();
  buscador.focus();
}

function obtenerIdPedidoDesdeClick(elemento) {
  const id = String(
    elemento?.dataset?.pedidoId ||
    elemento?.closest?.('[data-pedido-id]')?.dataset?.pedidoId ||
    ''
  ).trim();
  if (!id) console.error('No se pudo obtener el id del pedido desde el botón clickeado.');
  return id;
}

async function editarPedidoDesdeBoton(boton) {
  const pedidoId = obtenerIdPedidoDesdeClick(boton);
  if (!pedidoId) return;

  let pedido = cachePedidosRegistrados.find(p => String(p._id) === pedidoId);
  if (!pedido) pedido = await getPedidoPorId(pedidoId);
  if (!pedido) return;

  cargarPedidoEnFormulario(pedido);
}

async function eliminarPedidoDesdeBoton(boton) {
  const pedidoId = obtenerIdPedidoDesdeClick(boton);
  if (!pedidoId) return;

  const pedido = cachePedidosRegistrados.find(p => String(p._id) === pedidoId);
  const referencia = pedido ? `Orden ${pedido.orden} — ${pedido.name}` : 'este pedido';
  pedidoIdPendienteEliminar = pedidoId;

  const texto = document.getElementById('modalEliminarPedidoTexto');
  const botonConfirmar = document.getElementById('btnConfirmarEliminarPedido');
  const modal = document.getElementById('modalEliminarPedido');
  if (!texto || !botonConfirmar || !modal) return;

  texto.textContent = `¿Eliminar ${referencia}? Esta acción no se puede deshacer.`;
  botonConfirmar.onclick = confirmarEliminarPedido;
  modal.classList.add('active');
}

function cerrarModalEliminarPedido() {
  const modal = document.getElementById('modalEliminarPedido');
  if (modal) modal.classList.remove('active');
  pedidoIdPendienteEliminar = null;
}

async function confirmarEliminarPedido() {
  if (!pedidoIdPendienteEliminar) return;
  const pedidoId = pedidoIdPendienteEliminar;
  cerrarModalEliminarPedido();

  await eliminarPedidoRegistrado(pedidoId);
  mostrarPedidos(document.getElementById('buscadorPedidos').value);
}

// ═══════════ INIT ═══════════

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('formPedido');
  if (form) form.addEventListener('submit', guardarPedidoDesdeFormulario);

  const btnAgregarOtros = document.getElementById('btnAgregarFilaOtrosPedido');
  if (btnAgregarOtros) btnAgregarOtros.addEventListener('click', agregarFilaOtrosPedido);

  GRUPOS_FIJOS_PEDIDO.forEach(grupo => {
    const fila = document.querySelector(`#formPedido tr[data-grupo="${grupo.key}"]`);
    if (fila) engancharCalculoFilaPedido(fila);
  });
});
