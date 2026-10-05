const LIMITE_USUARIOS = 50;
let limiteUsuariosActual = LIMITE_USUARIOS;
let filtroUsuariosAplicado = '';
let temporizadorFiltroUsuarios = null;

let usuarioIdPendienteEliminar = null;
let compraUsuarioIdPendiente = null;
let compraTipoPendiente = null;

function waMsgAutorizacionUsuario(nombre) {
  return encodeURIComponent(`Estimado/a ${nombre}.

¿Autoriza a Lubri Repuestos Yumbo JRC para tratar sus datos personales y contactarlo por WhatsApp con el fin de activar el servicio de recordatorios de mantenimiento, informarle sobre la llegada de repuestos solicitados y brindarle información relacionada con nuestros servicios?

Responda únicamente: Sí o No.

Si desea conocer cómo tratamos y protegemos sus datos personales, puede consultar nuestra Política de Tratamiento de Datos aquí:
${documento_autorizacion_datos_url}`);
}

function enviarAutorizacionUsuarioDesdeFormulario() {
  const nombre = String(document.getElementById('usuarioNombre')?.value || '').trim();
  const telefono = String(document.getElementById('usuarioTelefono')?.value || '').trim();
  if (!nombre || !telefono) {
    alert('Ingresa el nombre y teléfono del usuario primero.');
    return;
  }

  const telefonoLimpio = limpiarTelefono(telefono);
  if (!telefonoLimpio) {
    alert('El teléfono no es válido.');
    return;
  }
  const numeroWhatsapp = telefonoLimpio.startsWith('57') ? telefonoLimpio : `57${telefonoLimpio}`;
  window.open(`https://wa.me/${numeroWhatsapp}?text=${waMsgAutorizacionUsuario(nombre)}`, '_blank');
}

function formatearRegistrationDayComoTexto(valorFecha) {
  const valor = String(valorFecha || '').trim();
  if (!valor) return '';

  const matchIso = valor.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (matchIso) {
    const [, anio, mes, dia] = matchIso;
    return `${dia}/${mes}/${anio}`;
  }

  const matchDmy = valor.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (matchDmy) {
    const [, dia, mes, anio] = matchDmy;
    return `${dia.padStart(2, '0')}/${mes.padStart(2, '0')}/${anio}`;
  }

  return valor;
}

function formatearRegistrationDayParaInputDate(valorFecha) {
  const valor = String(valorFecha || '').trim();
  if (!valor) return '';

  const matchIso = valor.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (matchIso) return valor;

  const matchDmy = valor.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (matchDmy) {
    const [, dia, mes, anio] = matchDmy;
    return `${anio}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`;
  }

  return '';
}

// ═══════════ USUARIOS DUPLICADOS ═══════════
// El backend responde 409 con motivo "usuarios-duplicados" y la lista completa
// de registros que chocan, para que se decida de forma consciente.
function abrirModalUsuariosDuplicados(mensaje = '', duplicados = [], titulo = 'Usuarios duplicados') {
  const modal = document.getElementById('modalUsuariosDuplicados');
  const textoTitulo = document.getElementById('modalUsuariosDuplicadosTitulo');
  const textoMensaje = document.getElementById('modalUsuariosDuplicadosMensaje');
  const lista = document.getElementById('listaUsuariosDuplicados');
  if (!modal) return;

  if (textoTitulo) textoTitulo.textContent = titulo;
  if (textoMensaje) textoMensaje.textContent = mensaje || 'No se puede continuar con esta operación.';

  if (lista) {
    lista.innerHTML = '';
    const registros = Array.isArray(duplicados) ? duplicados : [];
    if (!registros.length) {
      const vacio = document.createElement('div');
      vacio.textContent = 'El backend no devolvió el detalle de los registros duplicados.';
      lista.appendChild(vacio);
    }
    registros.forEach(duplicado => {
      const usuario = duplicado && typeof duplicado === 'object' ? duplicado : {};
      const fila = document.createElement('div');
      const campos = Array.isArray(usuario.coincideEn) && usuario.coincideEn.length
        ? ` [coincide por ${usuario.coincideEn.join(', ')}]`
        : '';
      fila.textContent = `${usuario.name || '-'} · C.C ${usuario.id || '-'} · ${usuario.telephone || '-'}${campos}`;
      lista.appendChild(fila);
    });
  }

  modal.classList.add('active');
}

function cerrarModalUsuariosDuplicados() {
  document.getElementById('modalUsuariosDuplicados')?.classList.remove('active');
}

// Muestra los duplicados si el backend los devuelve; devuelve true si los mostró
function avisarErrorUsuario(resultado) {
  if (!resultado || resultado.status !== 'error') return false;
  if (resultado.motivo === 'usuarios-duplicados') {
    abrirModalUsuariosDuplicados(
      resultado.message,
      resultado.duplicados,
      resultado.cedulaRegistrada === false ? 'Cédula no dada' : 'Usuarios duplicados'
    );
    return true;
  }
  alert(resultado.message || 'Ocurrió un error');
  return true;
}

async function registrarUsuarioDesdeFormulario(evento) {
  if (evento) evento.preventDefault();
  const autorizado = await confirmarAutorizacionDatos();
  if (!autorizado) return;

  const nombreInput = document.getElementById('usuarioNombre');
  const cedulaInput = document.getElementById('usuarioCedula');
  const telefonoInput = document.getElementById('usuarioTelefono');
  const correoInput = document.getElementById('usuarioCorreo');
  const fechaIngresoInput = document.getElementById('usuarioFechaIngreso');
  if (!nombreInput || !cedulaInput || !telefonoInput || !correoInput || !fechaIngresoInput) return;

  const name = String(nombreInput.value || '').trim();
  const id = String(cedulaInput.value).trim();
  const telephone = limpiarTelefono(telefonoInput.value);
  const email = String(correoInput.value || '').trim();
  const registrationDay = formatearRegistrationDayComoTexto(fechaIngresoInput.value);
  if (!name || !id || !telephone || !registrationDay) return;

  const resultado = await crearUsuarioRegistrado({
    name: name.toUpperCase(),
    id,
    telephone,
    registrationDay,
    email
  });

  if (avisarErrorUsuario(resultado)) return;

  const form = document.getElementById('usuarioForm');
  if (form) form.reset();
  setFechaHoyEnInput('usuarioFechaIngreso');
  mostrarUsuarios(document.getElementById('buscadorUsuarios')?.value || '');
}

function normalizarUsuarioRegistrado(usuario = {}) {
  const id = String(usuario.id || '').trim();
  const name = String(usuario.name || '').trim();
  const telephone = String(usuario.telephone || '').trim();
  const email = String(usuario.email || usuario.email || '').trim();
  const registrationDay = formatearRegistrationDayComoTexto(usuario.registrationDay);
  const recommendedUsers = Array.isArray(usuario.recommendedUsers)
    ? usuario.recommendedUsers
    : [];

  return {
    id,
    name,
    telephone,
    email,
    registrationDay,
    recommendedUsers
  };
}

function normalizarUsuarioRelacionado(usuario = {}) {
  return {
    name: String(usuario.name || '').trim(),
    id: String(usuario.id || '').trim(),
    registrationDay: formatearRegistrationDayComoTexto(usuario.registrationDay)
  };
}

function obtenerIdDesdeReferenciaRecomendado(referencia) {
  if (referencia && typeof referencia === 'object') {
    return String(referencia.id || referencia.userId || referencia.recommendedUserId || '').trim();
  }
  return String(referencia || '').trim();
}

function esUsuarioRecomendadoDetallado(referencia) {
  return Boolean(
    referencia &&
    typeof referencia === 'object' &&
    (referencia.name || referencia.registrationDay)
  );
}

async function resolverUsuariosRecomendadosDetallados(recomendados = []) {
  if (!Array.isArray(recomendados) || !recomendados.length) return [];

  const usuariosDetallados = [];
  const idsPendientes = [];

  recomendados.forEach(referencia => {
    if (esUsuarioRecomendadoDetallado(referencia)) {
      usuariosDetallados.push(normalizarUsuarioRelacionado(referencia));
      return;
    }
    const idRef = obtenerIdDesdeReferenciaRecomendado(referencia);
    if (idRef) idsPendientes.push(idRef);
  });

  if (!idsPendientes.length) return usuariosDetallados;

  // recommendedUsers guarda cédulas, así que se indexa por cédula
  const todos = await getUsuariosRegistrados();
  const porCedula = new Map();
  todos.forEach(usuario => {
    const cedula = String(usuario.id || '').trim();
    if (cedula && !porCedula.has(cedula)) porCedula.set(cedula, normalizarUsuarioRegistrado(usuario));
  });

  idsPendientes.forEach(idRef => {
    // Con cédula "." puede haber más de un usuario: se muestra el primero
    const usuario = porCedula.get(String(idRef).trim());
    if (usuario) {
      usuariosDetallados.push(normalizarUsuarioRelacionado(usuario));
      return;
    }
    usuariosDetallados.push({ name: '-', id: idRef, registrationDay: '-' });
  });

  return usuariosDetallados;
}

async function actualizarBadgeUsuarios() {
  const badge = document.getElementById('nav-badge-usuarios');
  if (!badge) return;
  await cargarUsuarios();
  const usuarios = await getUsuariosRegistrados();
  badge.textContent = Array.isArray(usuarios) ? usuarios.length : 0;
}

async function mostrarUsuarios(filtro = '') {
  const tbody = document.getElementById('listaUsuarios');
  if (!tbody) return;

  const empty = document.getElementById('emptyUsuarios');
  const tabla = document.getElementById('tablaUsuarios');

  await cargarUsuarios();
  const data = await getUsuariosRegistrados();
  const todos = (Array.isArray(data) ? data : []).map(normalizarUsuarioRegistrado);

  const textoFiltro = String(filtro || '').trim().toUpperCase();
  let usuarios = todos;
  if (textoFiltro) {
    usuarios = todos.filter(u =>
      String(u.name || '').toUpperCase().includes(textoFiltro) ||
      String(u.id || '').toUpperCase().includes(textoFiltro) ||
      String(u.telephone || '').toUpperCase().includes(textoFiltro) ||
      String(u.registrationDay || '').toUpperCase().includes(textoFiltro)
    );
  }

  usuarios = [...usuarios].reverse();
  const visibles = usuarios.slice(0, limiteUsuariosActual);

  tbody.innerHTML = '';
  if (!usuarios.length) {
    empty.style.display = 'block';
    tabla.style.display = 'none';
    actualizarBotonMostrarMasUsuarios(0);
    return;
  }

  empty.style.display = 'none';
  tabla.style.display = '';

  visibles.forEach(usuario => {
    // Clave interna: la cedula, o el _id cuando la cedula se guardo como "."
    const idSafe = claveUsuario(usuario).replace(/'/g, "\\'");
    const esAdmin = sessionStorage.getItem('ag_role') === 'admin';
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${usuario.name || '-'}</td>
      <td>${usuario.id || '-'}</td>
      <td>${usuario.telephone || '-'}</td>
      <td>${usuario.registrationDay || '-'}</td>
      <td><button class="btn-compra btn-compra-alta" onclick="abrirModalCompraUsuario('${idSafe}', 'alta')" ${idSafe ? '' : 'disabled'}>Agregar compra alta</button></td>
      <td><button class="btn-compra btn-compra-frecuente" onclick="abrirModalCompraUsuario('${idSafe}', 'frecuente')" ${idSafe ? '' : 'disabled'}>Agregar compra frecuente</button></td>
      <td>
        <div class="usuarios-acciones">
          ${esAdmin ? `
          <div class="usuarios-acciones-edicion">
            <button class="btn-edit" onclick="editarUsuarioRegistradoDesdeBoton('${idSafe}')" ${idSafe ? '' : 'disabled'}>✎ Editar</button>
            <button class="btn-del" onclick="eliminarUsuarioRegistradoDesdeBoton('${idSafe}')" ${idSafe ? '' : 'disabled'}>✕ Eliminar</button>
          </div>` : ''}
          <div class="usuarios-acciones-principales">
            <button class="btn-add-usuario" onclick="abrirModalSeleccionarUsuarioContactar('${idSafe}')" ${idSafe ? '' : 'disabled'}>
              + Agregar
            </button>
            <button class="btn-ver-recomendados" onclick="verUsuariosRecomendadosDesdeBoton('${idSafe}')" ${idSafe ? '' : 'disabled'}>
              👁 Ver (${(usuario.recommendedUsers || []).length})
            </button>
          </div>
        </div>
      </td>`;
    tbody.appendChild(tr);
  });

  actualizarBotonMostrarMasUsuarios(usuarios.length - visibles.length);
  actualizarBadgeUsuarios();
}

function actualizarBotonMostrarMasUsuarios(quedan = 0) {
  const boton = document.getElementById('btnMostrarMasUsuarios');
  if (!boton) return;
  const restantes = Number(quedan) || 0;
  if (restantes > 0) {
    boton.textContent = `Mostrar más (${restantes})`;
    boton.style.display = 'inline-flex';
    return;
  }
  boton.style.display = 'none';
}

function mostrarMasUsuarios() {
  limiteUsuariosActual += LIMITE_USUARIOS;
  mostrarUsuarios(document.getElementById('buscadorUsuarios')?.value || '');
}

function filtrarUsuarios() {
  const texto = document.getElementById('buscadorUsuarios')?.value || '';
  if (texto !== filtroUsuariosAplicado) limiteUsuariosActual = LIMITE_USUARIOS;
  clearTimeout(temporizadorFiltroUsuarios);
  temporizadorFiltroUsuarios = setTimeout(() => {
    filtroUsuariosAplicado = texto;
    mostrarUsuarios(texto);
  }, 200);
}

function limpiarBuscadorUsuarios() {
  const buscador = document.getElementById('buscadorUsuarios');
  buscador.value = '';
  limiteUsuariosActual = LIMITE_USUARIOS;
  filtroUsuariosAplicado = '';
  clearTimeout(temporizadorFiltroUsuarios);
  mostrarUsuarios();
  buscador.focus();
}

function cerrarModalCompraUsuario() {
  const modal = document.getElementById('modalCompraUsuario');
  const input = document.getElementById('modalCompraUsuarioInput');
  if (modal) modal.classList.remove('active');
  if (input) input.value = '';
  compraUsuarioIdPendiente = null;
  compraTipoPendiente = null;
}

function abrirModalCompraUsuario(usuarioId, tipo) {
  const id = String(usuarioId || '').trim();
  if (!id) return;

  const modal = document.getElementById('modalCompraUsuario');
  const titulo = document.getElementById('modalCompraUsuarioTitulo');
  const mensaje = document.getElementById('modalCompraUsuarioMensaje');
  const input = document.getElementById('modalCompraUsuarioInput');
  if (!modal || !titulo || !mensaje || !input) return;

  const tipoNormalizado = String(tipo || '').trim();
  compraUsuarioIdPendiente = id;
  compraTipoPendiente = tipoNormalizado;

  if (tipoNormalizado === 'alta') {
    titulo.textContent = 'Agregar compra alta';
    mensaje.textContent = 'agregue el identificador de la factura de la compra alta asociada';
    input.placeholder = 'Ej: FAC-12345';
    input.type = 'text';
  } else {
    titulo.textContent = 'Agregar compra frecuente';
    mensaje.textContent = 'dijite el producto que el cliente ha comprado de forma frecuente.';
    input.placeholder = 'Ej: Filtro de aceite';
    input.type = 'text';
  }

  input.value = '';
  modal.classList.add('active');
  setTimeout(() => input.focus(), 0);
}

async function guardarCompraUsuarioRegistrado() {
  const usuarioId = String(compraUsuarioIdPendiente || '').trim();
  const tipo = String(compraTipoPendiente || '').trim();
  const input = document.getElementById('modalCompraUsuarioInput');
  const valor = String(input?.value || '').trim();
  if (!usuarioId || !tipo || !valor) return;

  if (tipo === 'alta') {
    await agregarCompraAltaUsuario(usuarioId, valor);
  } else if (tipo === 'frecuente') {
    await agregarCompraFrecuenteUsuario(usuarioId, valor);
  }

  cerrarModalCompraUsuario();
}

async function verUsuariosRecomendadosDesdeBoton(usuarioId) {
  const id = String(usuarioId || '').trim();
  if (!id) return;

  const usuarioBase = normalizarUsuarioRegistrado(store.usuarios.get(id) || {});
  const nombreUsuario = usuarioBase.name || 'Usuario';
  let recomendados = await obtenerUsuariosRecomendadosUsuario(id);
  if (!Array.isArray(recomendados) || !recomendados.length) {
    recomendados = Array.isArray(usuarioBase?.recommendedUsers) ? usuarioBase.recommendedUsers : [];
  }
  const recomendadosDetallados = await resolverUsuariosRecomendadosDetallados(recomendados);
  renderModalUsuariosRecomendados(nombreUsuario, recomendadosDetallados);
}

function renderModalUsuariosRecomendados(nombreUsuario, recomendados = []) {
  const modal = document.getElementById('modalUsuariosRecomendados');
  const titulo = document.getElementById('usuariosRecomendadosTitulo');
  const tbody = document.getElementById('listaUsuariosRecomendadosModal');
  const tabla = document.getElementById('tablaUsuariosRecomendadosModal');
  const empty = document.getElementById('emptyUsuariosRecomendadosModal');
  if (!modal || !titulo || !tbody || !tabla || !empty) return;

  titulo.textContent = `Usuarios recomendados de ${nombreUsuario}`;
  tbody.innerHTML = '';
  if (!recomendados.length) {
    empty.style.display = 'block';
    tabla.style.display = 'none';
    modal.classList.add('active');
    return;
  }

  empty.style.display = 'none';
  tabla.style.display = '';
  recomendados.forEach(usuario => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${usuario.name || '-'}</td>
      <td>${usuario.id || '-'}</td>
      <td>${usuario.registrationDay || '-'}</td>`;
    tbody.appendChild(tr);
  });
  modal.classList.add('active');
}

function cerrarModalUsuariosRecomendados() {
  const modal = document.getElementById('modalUsuariosRecomendados');
  if (modal) modal.classList.remove('active');
}


function cerrarModalEditarUsuario() {
  const modal = document.getElementById('modalEditarUsuario');
  if (modal) modal.classList.remove('active');
}

function abrirModalEditarUsuario(usuario) {
  const modal = document.getElementById('modalEditarUsuario');
  const inputOriginalId = document.getElementById('editUsuarioOriginalId');
  const inputNombre = document.getElementById('editUsuarioNombre');
  const inputCedula = document.getElementById('editUsuarioCedula');
  const inputTelefono = document.getElementById('editUsuarioTelefono');
  const inputCorreo = document.getElementById('editUsuarioCorreo');
  const inputFecha = document.getElementById('editUsuarioFechaRegistro');
  if (!modal || !inputOriginalId || !inputNombre || !inputCedula || !inputTelefono || !inputCorreo || !inputFecha) return;

  inputOriginalId.value = String(usuario?.id || '').trim();
  inputNombre.value = String(usuario?.name || '').trim();
  inputCedula.value = String(usuario?.id || '').trim();
  inputTelefono.value = String(usuario?.telephone || '').trim();
  inputCorreo.value = String(usuario.email || '').trim();
  inputFecha.value = formatearRegistrationDayParaInputDate(usuario?.registrationDay);
  modal.classList.add('active');
}

async function guardarEdicionUsuarioRegistrado() {
  const usuarioIdOriginal = String(document.getElementById('editUsuarioOriginalId')?.value || '').trim();
  if (!usuarioIdOriginal) return;

  const name = String(document.getElementById('editUsuarioNombre')?.value || '').trim();
  const idNew = String(document.getElementById('editUsuarioCedula')?.value || '').trim();
  const telephone = limpiarTelefono(document.getElementById('editUsuarioTelefono')?.value || '');
  const email = String(document.getElementById('editUsuarioCorreo')?.value || '').trim();
  const registrationInput = String(document.getElementById('editUsuarioFechaRegistro')?.value || '').trim();
  if (!name || !idNew || !telephone || !registrationInput) return;

  const resultadoEdicion = await editarUsuarioRegistrado(usuarioIdOriginal, {
    name: name.toUpperCase(),
    idNew,
    registrationDay: formatearRegistrationDayComoTexto(registrationInput),
    telephone,
    email

  });

  if (avisarErrorUsuario(resultadoEdicion)) return;

  cerrarModalEditarUsuario();
  mostrarUsuarios(document.getElementById('buscadorUsuarios').value);
}

async function editarUsuarioRegistradoDesdeBoton(usuarioId) {
  const id = String(usuarioId || '').trim();
  if (!id) return;

  const usuarioActual = store.usuarios.get(id);
  if (!usuarioActual) return;
  abrirModalEditarUsuario(normalizarUsuarioRegistrado(usuarioActual));
}

async function eliminarUsuarioRegistradoDesdeBoton(usuarioId) {
  const id = String(usuarioId || '').trim();
  if (!id) return;

  const usuarioActual = store.usuarios.get(id);
  const nombreUsuario = String(usuarioActual?.name || 'este usuario').trim();
  usuarioIdPendienteEliminar = id;

  const texto = document.getElementById('modalEliminarUsuarioTexto');
  const botonConfirmar = document.getElementById('btnConfirmarEliminarUsuario');
  const modal = document.getElementById('modalEliminarUsuario');
  if (!texto || !botonConfirmar || !modal) return;

  texto.textContent = `¿Eliminar a "${nombreUsuario}" (C.C ${id})? Esta acción no se puede deshacer.`;
  botonConfirmar.onclick = confirmarEliminarUsuarioRegistrado;
  modal.classList.add('active');
}

function cerrarModalEliminarUsuario() {
  const modal = document.getElementById('modalEliminarUsuario');
  if (modal) modal.classList.remove('active');
  usuarioIdPendienteEliminar = null;
}

async function confirmarEliminarUsuarioRegistrado() {
  if (!usuarioIdPendienteEliminar) return;
  const usuarioId = usuarioIdPendienteEliminar;
  cerrarModalEliminarUsuario();

  const resultado = await eliminarUsuarioRegistrado(usuarioId);
  if (resultado?.status === 'error') {
    avisarErrorUsuario(resultado);
    return;
  }
  mostrarUsuarios(document.getElementById('buscadorUsuarios').value);
}

// Variables para el contexto del modal de seleccionar usuario a recomendar
let usuarioIdDelContextoARecomendar = null;
let usuariosDisponiblesCache = [];

async function abrirModalSeleccionarUsuarioContactar(usuarioId) {
  const id = String(usuarioId || '').trim();
  if (!id) return;
  usuarioIdDelContextoARecomendar = id;
  await refrescarModalRecomendados();
  // renderModalSeleccionarUsuarioContactar ya abre el modal internamente
}

function renderModalSeleccionarUsuarioContactar(usuarios = []) {
  const modal = document.getElementById('modalSeleccionarUsuarioContactar');
  const tbody = document.getElementById('listaUsuariosDisponiblesModal');
  const tabla = document.getElementById('tablaUsuariosDisponiblesModal');
  const empty = document.getElementById('emptyUsuariosDisponiblesModal');
  const filtroInput = document.getElementById('filtroUsuariosDisponibles');

  if (!modal || !tbody || !tabla || !empty || !filtroInput) return;

  tbody.innerHTML = '';
  filtroInput.value = '';

  if (!usuarios.length) {
    empty.style.display = 'block';
    tabla.style.display = 'none';
    modal.classList.add('active');
    return;
  }

  empty.style.display = 'none';
  tabla.style.display = '';

  usuarios.forEach(usuario => {
    // Clave interna del store (la cédula, o el _id si la cédula es ".")
    const usuarioId = claveUsuario(usuario);
    const usuarioCedula = String(usuario.id || '').trim();
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${usuario.name || '-'}</td>
      <td>${usuarioCedula || '-'}</td>
      <td>${usuario.telephone || '-'}</td>
      <td>
        <button class="btn-add-action" onclick="confirmarContactarUsuario('${usuarioId.replace(/'/g, "\\'")}')">
          Agregar
        </button>
      </td>`;
    tbody.appendChild(tr);
  });

  modal.classList.add('active');
}

function filtrarUsuariosDisponibles() {
  const filtro = String(document.getElementById('filtroUsuariosDisponibles')?.value || '').trim().toUpperCase();

  let usuariosFiltrados = usuariosDisponiblesCache;
  if (filtro) {
    usuariosFiltrados = usuariosDisponiblesCache.filter(u =>
      String(u.name || '').toUpperCase().includes(filtro) ||
      String(u.id || '').toUpperCase().includes(filtro) ||
      String(u.telephone || '').toUpperCase().includes(filtro)
    );
  }

  const tbody = document.getElementById('listaUsuariosDisponiblesModal');
  const tabla = document.getElementById('tablaUsuariosDisponiblesModal');
  const empty = document.getElementById('emptyUsuariosDisponiblesModal');

  if (!tbody || !tabla || !empty) return;

  tbody.innerHTML = '';
  if (!usuariosFiltrados.length) {
    empty.style.display = 'block';
    tabla.style.display = 'none';
    return;
  }

  empty.style.display = 'none';
  tabla.style.display = '';

  usuariosFiltrados.forEach(usuario => {
    // Clave interna del store (la cédula, o el _id si la cédula es ".")
    const usuarioId = claveUsuario(usuario);
    const usuarioCedula = String(usuario.id || '').trim();
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${usuario.name || '-'}</td>
      <td>${usuarioCedula || '-'}</td>
      <td>${usuario.telephone || '-'}</td>
      <td>
        <button class="btn-add-action" onclick="confirmarContactarUsuario('${usuarioId.replace(/'/g, "\\'")}')">
          Agregar
        </button>
      </td>`;
    tbody.appendChild(tr);
  });
}

async function confirmarContactarUsuario(usuarioIdRecomendar) {
  if (!usuarioIdDelContextoARecomendar) return;

  const usuarioIdOrigen = usuarioIdDelContextoARecomendar;
  cerrarModalSeleccionarUsuarioContactar();

  // Marcar al usuario recomendado como "recommended: true"
  const resultadoMarcar = await marcarUsuarioComoRecomendado(usuarioIdRecomendar);
  if (avisarErrorUsuario(resultadoMarcar)) {
    mostrarUsuarios(document.getElementById('buscadorUsuarios').value);
    return;
  }

  // Agregar el id del usuario recomendado al usuario que lo recomendó
  const resultado = await agregarUsuarioRecomendadoAlUsuario(usuarioIdOrigen, usuarioIdRecomendar);
  if (avisarErrorUsuario(resultado)) {
    mostrarUsuarios(document.getElementById('buscadorUsuarios').value);
    return;
  }

  // Registrar el vínculo recíproco
  const resultadoReciproco = await agregarUsuarioQueMeRecomendo(usuarioIdOrigen, usuarioIdRecomendar);
  if (avisarErrorUsuario(resultadoReciproco)) {
    mostrarUsuarios(document.getElementById('buscadorUsuarios').value);
    return;
  }

  mostrarUsuarios(document.getElementById('buscadorUsuarios').value);

  usuarioIdDelContextoARecomendar = null;
}

function cerrarModalSeleccionarUsuarioContactar() {
  const modal = document.getElementById('modalSeleccionarUsuarioContactar');
  if (modal) modal.classList.remove('active');
}
