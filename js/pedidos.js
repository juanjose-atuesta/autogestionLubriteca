// ═══════════ PEDIDOS — ESTADO ═══════════
let pedidoIdEnEdicion = null; // _id de Mongo del pedido que se está editando, null si es nuevo
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

function rellenarFormularioPedidoDesdeUsuario(usuario = {}) {
  const nombre = String(usuario.name || '').trim();
  const cedula = String(usuario.id || '').trim();
  const telefono = String(usuario.telephone || '').trim();
  const correo = String(usuario.email || usuario.emial || '').trim();

  const inputCliente = document.getElementById('pedidoCliente');
  const inputCedula = document.getElementById('pedidoCedula');
  const inputTelefono = document.getElementById('pedidoTelefono');
  const inputCorreo = document.getElementById('pedidoCorreo');

  if (inputCliente) inputCliente.value = nombre;
  if (inputCedula) inputCedula.value = cedula;
  if (inputTelefono) inputTelefono.value = telefono;
  if (inputCorreo) inputCorreo.value = correo;

  inputCliente?.focus();
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


// ═══════════ MODAL SELECCIONAR USUARIO PARA PEDIDO ═══════════
let usuariosPedidoCache = [];

async function abrirModalSeleccionarUsuarioPedido() {
  const data = await getUsuariosRegistrados();
  usuariosPedidoCache = Array.isArray(data) ? data : [];
  renderModalUsuariosPedido(usuariosPedidoCache);
}

function renderModalUsuariosPedido(usuarios) {
  const modal = document.getElementById('modalSeleccionarUsuarioPedido');
  const tbody = document.getElementById('listaUsuariosModalPedido');
  const tabla = document.getElementById('tablaUsuariosModalPedido');
  const empty = document.getElementById('emptyUsuariosModalPedido');
  const filtro = document.getElementById('filtroUsuariosModalPedido');
  if (!modal || !tbody || !tabla || !empty || !filtro) return;

  tbody.innerHTML = '';
  filtro.value = '';

  if (!usuarios.length) {
    empty.style.display = 'block';
    tabla.style.display = 'none';
    modal.classList.add('active');
    return;
  }

  empty.style.display = 'none';
  tabla.style.display = '';

  usuarios.forEach(u => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${u.name || '-'}</td>
      <td>${u.id || '-'}</td>
      <td>${u.telephone || '-'}</td>
      <td>${u.email || u.emial || '-'}</td>
      <td>
        <button class="btn-add-action"
          onclick="seleccionarUsuarioParaPedido('${String(u.id).replace(/'/g, "\\'")}')">
          Usar
        </button>
      </td>`;
    tbody.appendChild(tr);
  });

  modal.classList.add('active');
}

function filtrarUsuariosModalPedido() {
  const texto = String(document.getElementById('filtroUsuariosModalPedido')?.value || '')
    .trim().toUpperCase();

  const filtrados = texto
    ? usuariosPedidoCache.filter(u =>
      String(u.name || '').toUpperCase().includes(texto) ||
      String(u.id || '').toUpperCase().includes(texto) ||
      String(u.telephone || '').toUpperCase().includes(texto) ||
      String(u.email || u.emial || '').toUpperCase().includes(texto))
    : usuariosPedidoCache;

  const tbody = document.getElementById('listaUsuariosModalPedido');
  const tabla = document.getElementById('tablaUsuariosModalPedido');
  const empty = document.getElementById('emptyUsuariosModalPedido');
  if (!tbody || !tabla || !empty) return;

  tbody.innerHTML = '';
  if (!filtrados.length) {
    empty.style.display = 'block';
    tabla.style.display = 'none';
    return;
  }

  empty.style.display = 'none';
  tabla.style.display = '';
  filtrados.forEach(u => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${u.name || '-'}</td>
      <td>${u.id || '-'}</td>
      <td>${u.telephone || '-'}</td>
      <td>${u.email || u.emial || '-'}</td>
      <td>
        <button class="btn-add-action"
          onclick="seleccionarUsuarioParaPedido('${String(u.id).replace(/'/g, "\\'")}')">
          Usar
        </button>
      </td>`;
    tbody.appendChild(tr);
  });
}

function seleccionarUsuarioParaPedido(usuarioId) {
  const usuario = usuariosPedidoCache.find(u => String(u.id) === String(usuarioId));
  if (!usuario) return;
  cerrarModalSeleccionarUsuarioPedido();
  rellenarFormularioPedidoDesdeUsuario(usuario); // ya existe en pedidos.js
}

function cerrarModalSeleccionarUsuarioPedido() {
  document.getElementById('modalSeleccionarUsuarioPedido')?.classList.remove('active');
}

// ═══════════ GENERAR .TXT DEL PEDIDO ═══════════

function formatearLineaItemTxt(label, fila) {
  if (!Array.isArray(fila)) return '';
  const [cantidad, referencia, precio] = fila;
  if (!cantidad && !referencia && !precio) return '';
  return `${label}: ${cantidad || 0} x ${referencia || '-'} = ${formatearMonedaPedido(calcularTotalFilaPedido(cantidad, precio))}`;
}

function generarTextoPedido(pedido) {
  const lineas = [];
  lineas.push('═══════════════════════════════');
  lineas.push('       PEDIDO — AUTOGESTIÓN');
  lineas.push('═══════════════════════════════');
  lineas.push('');
  lineas.push(`Orden: ${pedido.orden || '-'}`);
  lineas.push(`EL: ${pedido.EL || '-'}`);
  lineas.push(`Fecha: ${new Date().toLocaleDateString('es-CO')}`);
  lineas.push('');
  lineas.push('── DATOS DEL CLIENTE ──');
  lineas.push(`Nombre: ${pedido.name || '-'}`);
  lineas.push(`Cédula: ${pedido.id || '-'}`);
  lineas.push(`Teléfono: ${pedido.telephone || '-'}`);
  lineas.push(`Correo: ${pedido.email || '-'}`);
  lineas.push('');
  lineas.push('── DATOS DEL VEHÍCULO ──');
  lineas.push(`Marca: ${pedido.vehicleMake || '-'}`);
  lineas.push(`Placa: ${pedido.plate || '-'}`);
  lineas.push(`Kilometraje: ${pedido.mileage || '-'}`);
  lineas.push('');
  lineas.push('── ITEMS ──');

  const gruposLabel = { oil: 'F. Aceite', FAire: 'F. Aire', FComb: 'F. Combustible', FAA: 'F.A.A' };
  let hayItemsFijos = false;
  Object.keys(gruposLabel).forEach(key => {
    const grupo = Array.isArray(pedido[key]) ? pedido[key] : [];
    grupo.forEach(fila => {
      const linea = formatearLineaItemTxt(gruposLabel[key], fila);
      if (linea) { lineas.push(linea); hayItemsFijos = true; }
    });
  });
  if (!hayItemsFijos) lineas.push('(sin items fijos)');

  const otros = Array.isArray(pedido.otros) ? pedido.otros : [];
  if (otros.length) {
    lineas.push('');
    lineas.push('── OTROS ──');
    otros.forEach(fila => {
      const linea = formatearLineaItemTxt('Item', fila);
      if (linea) lineas.push(linea);
    });
  }

  lineas.push('');
  lineas.push('═══════════════════════════════');
  const total = pedido.precioTotal !== undefined
    ? Number(pedido.precioTotal) || 0
    : calcularPrecioTotalPedidoLocal(pedido);
  lineas.push(`TOTAL: ${formatearMonedaPedido(total)}`);
  lineas.push('═══════════════════════════════');

  return lineas.join('\n');
}

// Por si el pedido no trae precioTotal calculado desde el backend (caso del formulario antes de guardar)
function calcularPrecioTotalPedidoLocal(pedido) {
  const grupos = [pedido.oil, pedido.FAire, pedido.FComb, pedido.FAA, pedido.otros];
  let total = 0;
  grupos.forEach(grupo => {
    if (!Array.isArray(grupo)) return;
    grupo.forEach(fila => {
      if (!Array.isArray(fila)) return;
      total += calcularTotalFilaPedido(fila[0], fila[2]);
    });
  });
  return total;
}

function descargarTxt(contenido, nombreArchivo) {
  const blob = new Blob([contenido], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombreArchivo;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ── Botón en el formulario de pedidos (usa lo que hay escrito, sin guardar) ──
function descargarTxtPedidoFormulario() {
  const payload = construirPayloadPedidoDesdeForm();
  if (!payload.name || !payload.orden) {
    alert('Completa al menos Cliente y N° de Orden antes de descargar.');
    return;
  }
  const texto = generarTextoPedido(payload);
  descargarTxt(texto, `Pedido_${payload.orden || 'sin-orden'}.txt`);
}

// ── Botón en pedidos registrados (usa el pedido ya guardado) ──
function descargarTxtPedidoRegistrado(pedido) {
  if (!pedido) return;
  const texto = generarTextoPedido(pedido);
  descargarTxt(texto, `Pedido_${pedido.orden || pedido._id || 'sin-orden'}.txt`);
}
