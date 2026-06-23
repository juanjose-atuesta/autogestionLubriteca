// ═══════════ PEDIDOS REGISTRADOS — LISTADO Y ACCIONES ═══════════
let cachePedidosRegistrados = [];
let pedidoIdPendienteEliminar = null;
let pedidoIdEnEdicionRegistrado = null;

const PEDIDO_GRUPOS_DETALLE = [
  { key: 'oil', label: 'F. Aceite' },
  { key: 'FAire', label: 'F. Aire' },
  { key: 'FComb', label: 'F. Combustible' },
  { key: 'FAA', label: 'F.A.A' }
];

function obtenerClaveFechaBogota(valorFecha) {
  const fecha = new Date(valorFecha);
  if (Number.isNaN(fecha.getTime())) return '';
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Bogota',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(fecha);
  const año = partes.find(p => p.type === 'year')?.value || '';
  const mes = partes.find(p => p.type === 'month')?.value || '';
  const dia = partes.find(p => p.type === 'day')?.value || '';
  return `${año}-${mes}-${dia}`;
}

function escaparHtmlPedido(valor) {
  return String(valor ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function valorMostrablePedido(valor) {
  return valor === null || valor === undefined || valor === '' ? '-' : valor;
}

function formatearFechaPedido(valorFecha) {
  const fecha = new Date(valorFecha);
  if (Number.isNaN(fecha.getTime())) return '-';
  return fecha.toLocaleString('es-CO', {
    timeZone: 'America/Bogota',
    dateStyle: 'medium',
    timeStyle: 'short'
  });
}

function esPedidoDeHoy(pedido) {
  const fechaPedido = obtenerClaveFechaBogota(pedido?.updatedAt || pedido?.updateAt);
  if (!fechaPedido) return false;
  return fechaPedido === obtenerClaveFechaBogota(new Date());
}

async function actualizarBadgePedidos(cantidad = 0) {
  const badge = document.getElementById('nav-badge-pedidos-registrados');
  if (!badge) return;
  badge.textContent = cantidad;
}

function actualizarTotalGeneralPedidoEdicion() {
  const totales = document.querySelectorAll('#formEditarPedido .td-total-fila-pedido');
  let total = 0;
  totales.forEach(td => {
    total += Number(td.dataset.valor || 0);
  });
  const elTotal = document.getElementById('pedidoTotalGeneralEditar');
  if (elTotal) elTotal.textContent = formatearMonedaPedido(total);
}

function engancharCalculoFilaPedidoEdicion(tr) {
  const inputCantidad = tr.querySelector('.input-cantidad-pedido');
  const inputPrecio = tr.querySelector('.input-precio-pedido');
  const tdTotal = tr.querySelector('.td-total-fila-pedido');
  if (!inputCantidad || !inputPrecio || !tdTotal) return;

  function recalcular() {
    const total = calcularTotalFilaPedido(inputCantidad.value, inputPrecio.value);
    tdTotal.textContent = formatearMonedaPedido(total);
    tdTotal.dataset.valor = total;
    actualizarTotalGeneralPedidoEdicion();
  }

  inputCantidad.addEventListener('input', recalcular);
  inputPrecio.addEventListener('input', recalcular);
  recalcular();
}

function crearFilaOtrosPedidoEdicion(valores = {}) {
  const tr = document.createElement('tr');
  tr.className = 'fila-item-pedido';
  tr.innerHTML = `
    <td><input type="number" min="0" step="1" class="input-cantidad-pedido" value="${valores.cantidad ?? ''}" placeholder="0"></td>
    <td><input type="text" class="input-referencia-pedido" value="${valores.referencia ?? ''}" placeholder="Referencia"></td>
    <td><input type="number" min="0" step="any" class="input-precio-pedido" value="${valores.precio ?? ''}" placeholder="0"></td>
    <td class="td-total-fila-pedido" data-valor="0">$0</td>
    <td><button type="button" class="btn-del-fila-pedido" title="Eliminar fila">✕</button></td>`;

  tr.querySelector('.btn-del-fila-pedido').addEventListener('click', () => {
    tr.remove();
    actualizarTotalGeneralPedidoEdicion();
  });

  engancharCalculoFilaPedidoEdicion(tr);
  return tr;
}

function agregarFilaOtrosPedidoEdicion() {
  const tbody = document.getElementById('tbodyOtrosPedidoEditar');
  if (!tbody) return;
  tbody.appendChild(crearFilaOtrosPedidoEdicion());
}

function leerGrupoFijoPedidoDesdeModalEditar(key) {
  const fila = document.querySelector(`#formEditarPedido tr[data-grupo="${key}"]`);
  if (!fila) return [0, '', 0];
  const cantidad = Number(fila.querySelector('.input-cantidad-pedido')?.value) || 0;
  const referencia = String(fila.querySelector('.input-referencia-pedido')?.value || '').trim();
  const precio = Number(fila.querySelector('.input-precio-pedido')?.value) || 0;
  return [cantidad, referencia, precio];
}

function rellenarGrupoFijoPedidoEnModalEditar(key, fila = []) {
  const tr = document.querySelector(`#formEditarPedido tr[data-grupo="${key}"]`);
  if (!tr) return;
  const [cantidad = '', referencia = '', precio = ''] = fila;
  tr.querySelector('.input-cantidad-pedido').value = cantidad || '';
  tr.querySelector('.input-referencia-pedido').value = referencia || '';
  tr.querySelector('.input-precio-pedido').value = precio || '';
  tr.querySelector('.input-cantidad-pedido').dispatchEvent(new Event('input'));
}

function leerOtrosPedidoDesdeModalEditar() {
  const filas = document.querySelectorAll('#tbodyOtrosPedidoEditar tr');
  const resultado = [];
  filas.forEach(fila => {
    const cantidad = Number(fila.querySelector('.input-cantidad-pedido')?.value) || 0;
    const referencia = String(fila.querySelector('.input-referencia-pedido')?.value || '').trim();
    const precio = Number(fila.querySelector('.input-precio-pedido')?.value) || 0;
    if (cantidad || referencia || precio) resultado.push([cantidad, referencia, precio]);
  });
  return resultado;
}

function construirPayloadPedidoDesdeModalEditar() {
  const payload = {
    vehicleMake: String(document.getElementById('editPedidoVehicleMake')?.value || '').trim(),
    name: String(document.getElementById('editPedidoCliente')?.value || '').trim(),
    id: String(document.getElementById('editPedidoCedula')?.value || '').trim(),
    telephone: String(document.getElementById('editPedidoTelefono')?.value || '').trim(),
    email: String(document.getElementById('editPedidoCorreo')?.value || '').trim(),
    orden: String(document.getElementById('editPedidoOrden')?.value || '').trim(),
    EL: String(document.getElementById('editPedidoEL')?.value || '').trim(),
    plate: String(document.getElementById('editPedidoPlaca')?.value || '').trim(),
    mileage: String(document.getElementById('editPedidoKilometraje')?.value || '').trim()
  };

  PEDIDO_GRUPOS_DETALLE.forEach(grupo => {
    payload[grupo.key] = [leerGrupoFijoPedidoDesdeModalEditar(grupo.key)];
  });

  payload.otros = leerOtrosPedidoDesdeModalEditar();
  return payload;
}

function limpiarFormularioEditarPedido() {
  const form = document.getElementById('formEditarPedido');
  if (form) form.reset();

  PEDIDO_GRUPOS_DETALLE.forEach(grupo => rellenarGrupoFijoPedidoEnModalEditar(grupo.key, ['', '', '']));

  const tbodyOtros = document.getElementById('tbodyOtrosPedidoEditar');
  if (tbodyOtros) tbodyOtros.innerHTML = '';

  pedidoIdEnEdicionRegistrado = null;
  const btnGuardar = document.getElementById('btnGuardarEditarPedido');
  if (btnGuardar) btnGuardar.textContent = '💾 Guardar cambios';

  actualizarTotalGeneralPedidoEdicion();
}

function cargarPedidoEnModalEditar(pedido) {
  if (!pedido) return;
  pedidoIdEnEdicionRegistrado = pedido._id;

  document.getElementById('editPedidoVehicleMake').value = pedido.vehicleMake || '';
  document.getElementById('editPedidoOrden').value = pedido.orden || '';
  document.getElementById('editPedidoCliente').value = pedido.name || '';
  document.getElementById('editPedidoEL').value = pedido.EL || '';
  document.getElementById('editPedidoCedula').value = pedido.id || '';
  document.getElementById('editPedidoPlaca').value = pedido.plate || '';
  document.getElementById('editPedidoTelefono').value = pedido.telephone || '';
  document.getElementById('editPedidoKilometraje').value = pedido.mileage || '';
  document.getElementById('editPedidoCorreo').value = pedido.email || '';

  PEDIDO_GRUPOS_DETALLE.forEach(grupo => {
    const valores = Array.isArray(pedido[grupo.key]) ? pedido[grupo.key] : [];
    rellenarGrupoFijoPedidoEnModalEditar(grupo.key, valores[0] || ['', '', '']);
  });

  const tbodyOtros = document.getElementById('tbodyOtrosPedidoEditar');
  if (tbodyOtros) tbodyOtros.innerHTML = '';
  const otros = Array.isArray(pedido.otros) ? pedido.otros : [];
  otros.forEach(fila => {
    tbodyOtros.appendChild(crearFilaOtrosPedidoEdicion({ cantidad: fila[0] ?? '', referencia: fila[1] ?? '', precio: fila[2] ?? '' }));
  });

  const btnGuardar = document.getElementById('btnGuardarEditarPedido');
  if (btnGuardar) btnGuardar.textContent = `💾 Guardar cambios — Orden ${pedido.orden || ''}`;

  actualizarTotalGeneralPedidoEdicion();
}

async function abrirModalEditarPedidoDesdeBoton(boton) {
  const pedidoId = obtenerIdPedidoDesdeClick(boton);
  if (!pedidoId) return;

  let pedido = cachePedidosRegistrados.find(p => String(p._id) === pedidoId);
  if (!pedido) pedido = await getPedidoPorId(pedidoId);
  if (!pedido) return;

  cargarPedidoEnModalEditar(pedido);
  const modal = document.getElementById('modalEditarPedido');
  if (modal) modal.classList.add('active');
}

async function guardarEdicionPedidoRegistradoDesdeModal(evento) {
  if (evento) evento.preventDefault();
  if (!pedidoIdEnEdicionRegistrado) return;

  const payload = construirPayloadPedidoDesdeModalEditar();
  if (!payload.name || !payload.id || !payload.telephone || !payload.orden) {
    alert('Completa al menos Cliente, Cédula, Teléfono y N° de Orden.');
    return;
  }

  await editarPedidoRegistrado(pedidoIdEnEdicionRegistrado, payload);
  cerrarModalEditarPedido();
  mostrarPedidos(document.getElementById('buscadorPedidos')?.value || '');
}

function cerrarModalEditarPedido() {
  const modal = document.getElementById('modalEditarPedido');
  if (modal) modal.classList.remove('active');
  limpiarFormularioEditarPedido();
}

// true = modo "pedidos de hoy", false = búsqueda general
let modoPedidosHoy = false;

function renderizarFilasPedidos(pedidos) {
  const tbody = document.getElementById('listaPedidos');
  const empty = document.getElementById('emptyPedidos');
  const tabla = document.getElementById('tablaPedidos');
  if (!tbody) return;

  tbody.innerHTML = '';

  if (!pedidos.length) {
    if (empty) empty.style.display = 'block';
    if (tabla) tabla.style.display = 'none';
    actualizarBadgePedidos(0);
    return;
  }

  if (empty) empty.style.display = 'none';
  if (tabla) tabla.style.display = '';

  pedidos.forEach(pedido => {
    const idSafe = String(pedido._id || '').replace(/'/g, "\'");
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${pedido.orden || '-'}</td>
      <td>${pedido.vehicleMake || '-'}</td>
      <td>${pedido.name || '-'}</td>
      <td>${pedido.plate || '-'}</td>
      <td>${pedido.telephone || '-'}</td>
      <td>${formatearMonedaPedido(pedido.precioTotal)}</td>
      <td>
        <button class="btn-view" data-pedido-id="${idSafe}" onclick="verDetallePedidoDesdeBoton(this)">👁 Ver detalles</button>
        <button class="btn-edit" data-pedido-id="${idSafe}" onclick="editarPedidoDesdeBoton(this)">✎ Editar</button>
        <button class="btn-del"  data-pedido-id="${idSafe}" onclick="eliminarPedidoDesdeBoton(this)">✕ Eliminar</button>
      </td>`;
    tbody.appendChild(tr);
  });

  actualizarBadgePedidos(pedidos.length);
}

async function mostrarPedidos(filtro) {
  const textoFiltro = String(filtro || '').trim().toUpperCase();

  // Sin filtro y sin modo hoy -> tabla vacía
  if (!textoFiltro && !modoPedidosHoy) {
    renderizarFilasPedidos([]);
    return;
  }

  if (modoPedidosHoy) {
    // Llama al endpoint dedicado de hoy en el backend
    const data = await getPedidosDeHoyRegistrados();
    const todos = Array.isArray(data) ? data : [];
    cachePedidosRegistrados = todos;
    const pedidos = textoFiltro
      ? todos.filter(p =>
        String(p.name || '').toUpperCase().includes(textoFiltro) ||
        String(p.id || '').toUpperCase().includes(textoFiltro) ||
        String(p.plate || '').toUpperCase().includes(textoFiltro) ||
        String(p.orden || '').toUpperCase().includes(textoFiltro) ||
        String(p.vehicleMake || '').toUpperCase().includes(textoFiltro))
      : todos;
    renderizarFilasPedidos([...pedidos].reverse());
    return;
  }

  // Modo búsqueda general: trae todos y filtra
  const data = await getPedidosRegistrados();
  const todos = Array.isArray(data) ? data : [];
  cachePedidosRegistrados = todos;
  const pedidos = todos.filter(p =>
    String(p.name || '').toUpperCase().includes(textoFiltro) ||
    String(p.id || '').toUpperCase().includes(textoFiltro) ||
    String(p.plate || '').toUpperCase().includes(textoFiltro) ||
    String(p.orden || '').toUpperCase().includes(textoFiltro) ||
    String(p.vehicleMake || '').toUpperCase().includes(textoFiltro));
  renderizarFilasPedidos([...pedidos].reverse());
}

async function togglePedidosHoy() {
  modoPedidosHoy = !modoPedidosHoy;
  const btn = document.getElementById('btnPedidosHoy');
  if (btn) btn.classList.toggle('activo', modoPedidosHoy);
  if (modoPedidosHoy) {
    const buscador = document.getElementById('buscadorPedidos');
    if (buscador) buscador.value = '';
  }
  mostrarPedidos(document.getElementById('buscadorPedidos')?.value || '');
}

function filtrarPedidos() {
  const texto = document.getElementById('buscadorPedidos')?.value || '';
  // Si escribe algo, desactivar modo hoy para buscar en todos
  if (texto.trim() && modoPedidosHoy) {
    modoPedidosHoy = false;
    const btn = document.getElementById('btnPedidosHoy');
    if (btn) btn.classList.remove('activo');
  }
  mostrarPedidos(texto);
}

function limpiarBuscadorPedidos() {
  const buscador = document.getElementById('buscadorPedidos');
  if (!buscador) return;
  buscador.value = '';
  mostrarPedidos('');
  buscador.focus();
}


function formatearItemPedidoDetalle(item = []) {
  const [cantidad = '', referencia = '', precio = ''] = item;
  return `
    <div class="detalle-item">
      <div class="detalle-label">Cantidad</div>
      <div class="detalle-valor">${escaparHtmlPedido(valorMostrablePedido(cantidad))}</div>
    </div>
    <div class="detalle-item">
      <div class="detalle-label">Referencia</div>
      <div class="detalle-valor">${escaparHtmlPedido(valorMostrablePedido(referencia))}</div>
    </div>
    <div class="detalle-item">
      <div class="detalle-label">Valor unitario</div>
      <div class="detalle-valor">${formatearMonedaPedido(precio)}</div>
    </div>
  `;
}

function construirDetallePedidoHTML(pedido) {
  const filasFixed = PEDIDO_GRUPOS_DETALLE.map(grupo => {
    const items = Array.isArray(pedido?.[grupo.key]) ? pedido[grupo.key] : [];
    const item = items[0] || [];
    const subtotal = (Number(item[0]) || 0) * (Number(item[2]) || 0);
    return `
      <div class="detalle-seccion">
        <div class="detalle-seccion-titulo">${escaparHtmlPedido(grupo.label)}</div>
        <div class="detalle-grid">
          ${formatearItemPedidoDetalle(item)}
          <div class="detalle-item detalle-item-full">
            <div class="detalle-label">Subtotal</div>
            <div class="detalle-valor">${formatearMonedaPedido(subtotal)}</div>
          </div>
        </div>
      </div>
    `;
  }).join('');

  const otros = Array.isArray(pedido?.otros) ? pedido.otros : [];
  const otrosHtml = otros.length
    ? otros.map((item, index) => `
        <div class="detalle-item detalle-item-full">
          <div class="detalle-label">Otro #${index + 1}</div>
          <div class="detalle-valor">
            Cantidad: ${escaparHtmlPedido(valorMostrablePedido(item?.[0]))} ·
            Referencia: ${escaparHtmlPedido(valorMostrablePedido(item?.[1]))} ·
            Valor unitario: ${formatearMonedaPedido(item?.[2])}
          </div>
        </div>
      `).join('')
    : '<div class="detalle-item detalle-item-full"><div class="detalle-valor">Sin ítems adicionales</div></div>';

  return `
    <div class="pedido-detalle-card">
      <div class="detalle-seccion">
        <div class="detalle-seccion-titulo">Resumen</div>
        <div class="detalle-grid">
          <div class="detalle-item">
            <div class="detalle-label">Orden</div>
            <div class="detalle-valor">${escaparHtmlPedido(valorMostrablePedido(pedido?.orden))}</div>
          </div>
          <div class="detalle-item">
            <div class="detalle-label">Marca</div>
            <div class="detalle-valor">${escaparHtmlPedido(valorMostrablePedido(pedido?.vehicleMake))}</div>
          </div>
          <div class="detalle-item">
            <div class="detalle-label">Cliente</div>
            <div class="detalle-valor">${escaparHtmlPedido(valorMostrablePedido(pedido?.name))}</div>
          </div>
          <div class="detalle-item">
            <div class="detalle-label">Placa</div>
            <div class="detalle-valor detalle-placa">${escaparHtmlPedido(valorMostrablePedido(pedido?.plate))}</div>
          </div>
          <div class="detalle-item">
            <div class="detalle-label">Teléfono</div>
            <div class="detalle-valor">${escaparHtmlPedido(valorMostrablePedido(pedido?.telephone))}</div>
          </div>
          <div class="detalle-item">
            <div class="detalle-label">Total</div>
            <div class="detalle-valor">${formatearMonedaPedido(pedido?.precioTotal)}</div>
          </div>
          <div class="detalle-item">
            <div class="detalle-label">Cédula</div>
            <div class="detalle-valor">${escaparHtmlPedido(valorMostrablePedido(pedido?.id))}</div>
          </div>
          <div class="detalle-item">
            <div class="detalle-label">Correo</div>
            <div class="detalle-valor">${escaparHtmlPedido(valorMostrablePedido(pedido?.email))}</div>
          </div>
          <div class="detalle-item">
            <div class="detalle-label">EL</div>
            <div class="detalle-valor">${escaparHtmlPedido(valorMostrablePedido(pedido?.EL))}</div>
          </div>
          <div class="detalle-item">
            <div class="detalle-label">Kilometraje</div>
            <div class="detalle-valor">${escaparHtmlPedido(valorMostrablePedido(pedido?.mileage))}</div>
          </div>
          <div class="detalle-item detalle-item-full">
            <div class="detalle-label">ID Mongo</div>
            <div class="detalle-valor">${escaparHtmlPedido(valorMostrablePedido(pedido?._id))}</div>
          </div>
          <div class="detalle-item">
            <div class="detalle-label">Creado</div>
            <div class="detalle-valor">${formatearFechaPedido(pedido?.createdAt)}</div>
          </div>
          <div class="detalle-item">
            <div class="detalle-label">Actualizado</div>
            <div class="detalle-valor">${formatearFechaPedido(pedido?.updatedAt || pedido?.updateAt)}</div>
          </div>
        </div>
      </div>

      <div class="detalle-seccion">
        <div class="detalle-seccion-titulo">Grupos fijos</div>
        ${filasFixed}
      </div>

      <div class="detalle-seccion">
        <div class="detalle-seccion-titulo">Otros</div>
        <div class="detalle-grid">
          ${otrosHtml}
        </div>
      </div>
    </div>
  `;
}

async function verDetallePedidoDesdeBoton(boton) {
  const pedidoId = obtenerIdPedidoDesdeClick(boton);
  if (!pedidoId) return;

  let pedido = cachePedidosRegistrados.find(p => String(p._id) === pedidoId);
  if (!pedido) pedido = await getPedidoPorId(pedidoId);
  if (!pedido) return;

  const contenido = document.getElementById('detallePedidoContenido');
  const modal = document.getElementById('modalDetallePedido');
  if (!contenido || !modal) return;

  contenido.innerHTML = construirDetallePedidoHTML(pedido);
  modal.classList.add('active');
}

function cerrarDetallePedido() {
  const modal = document.getElementById('modalDetallePedido');
  if (modal) modal.classList.remove('active');
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
  await abrirModalEditarPedidoDesdeBoton(boton);
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
  mostrarPedidos(document.getElementById('buscadorPedidos')?.value || '');
}

document.addEventListener('DOMContentLoaded', () => {
  const botonConfirmar = document.getElementById('btnConfirmarEliminarPedido');
  if (botonConfirmar) botonConfirmar.onclick = confirmarEliminarPedido;

  const formEditar = document.getElementById('formEditarPedido');
  if (formEditar) formEditar.addEventListener('submit', guardarEdicionPedidoRegistradoDesdeModal);

  const btnAgregarFilaEditar = document.getElementById('btnAgregarFilaOtrosPedidoEditar');
  if (btnAgregarFilaEditar) btnAgregarFilaEditar.addEventListener('click', agregarFilaOtrosPedidoEdicion);

  // No cargar automáticamente — la tabla arranca vacía
  // Los datos se cargan al buscar o al presionar "Pedidos de hoy"
  const btnHoy = document.getElementById('btnPedidosHoy');
  if (btnHoy) btnHoy.addEventListener('click', togglePedidosHoy);
});
