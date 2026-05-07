let cacheUsuariosRegistrados = [];
let usuarioIdPendienteEliminar = null;

function waMsgAutorizacionUsuario(nombre) {
  return encodeURIComponent(`Estimado/a ${nombre},

De acuerdo con la normativa vigente sobre protección de datos personales, le informamos que la información suministrada será utilizada únicamente para fines comerciales, de contacto, atención al cliente, envío de información, promociones y seguimiento de nuestros servicios.
Sus datos serán tratados de manera confidencial y no serán compartidos con terceros sin su autorización.

Para autorizar el uso de datos personales, entre al siguiente formulario de google (${FORMULARIO_AUTORIZACION_DATOS_URL})`);
}

function enviarAutorizacionUsuarioDesdeFormulario() {
  const nombre = String(document.getElementById('usuarioNombre')?.value || '').trim();
  const telefono = String(document.getElementById('usuarioTelefono')?.value || '').trim();
  if (!nombre || !telefono) {
    alert('Ingresa el nombre y teléfono del usuario primero.');
    return;
  }

  const telefonoLimpio = telefono.replace(/\D/g, '');
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

async function registrarUsuarioDesdeFormulario(evento) {
  if (evento) evento.preventDefault();
  const autorizado = await confirmarAutorizacionDatos();
  if (!autorizado) return;

  const nombreInput = document.getElementById('usuarioNombre');
  const cedulaInput = document.getElementById('usuarioCedula');
  const telefonoInput = document.getElementById('usuarioTelefono');
  const fechaIngresoInput = document.getElementById('usuarioFechaIngreso');
  if (!nombreInput || !cedulaInput || !telefonoInput || !fechaIngresoInput) return;

  const name = String(nombreInput.value || '').trim();
  const id = String(cedulaInput.value).trim();
  const telephone = String(telefonoInput.value).trim();
  const registrationDay = formatearRegistrationDayComoTexto(fechaIngresoInput.value);
  if (!name || !id || !telephone || !registrationDay) return;

  await crearUsuarioRegistrado({
    name: name.toUpperCase(),
    id,
    telephone,
    registrationDay
  });

  const form = document.getElementById('usuarioForm');
  if (form) form.reset();
  mostrarUsuarios(document.getElementById('buscadorUsuarios')?.value || '');
}

function normalizarUsuarioRegistrado(usuario = {}) {
  const id = String(usuario.id || '').trim();
  const name = String(usuario.name || '').trim();
  const telephone = String(usuario.telephone || '').trim();
  const registrationDay = formatearRegistrationDayComoTexto(usuario.registrationDay);
  const acommulatedPoints = Number(usuario.acommulatedPoints ?? 0);
  const recommendedUsers = Array.isArray(usuario.recommendedUsers)
    ? usuario.recommendedUsers
    : [];

  return {
    id,
    name,
    telephone,
    registrationDay,
    acommulatedPoints: Number.isFinite(acommulatedPoints) ? acommulatedPoints : 0,
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

  let mapaUsuarios = new Map(
    (Array.isArray(cacheUsuariosRegistrados) ? cacheUsuariosRegistrados : [])
      .map(usuario => [String(usuario.id || '').trim(), usuario])
  );

  const faltantes = idsPendientes.filter(idRef => !mapaUsuarios.has(idRef));
  if (faltantes.length) {
    const data = await getUsuariosRegistrados();
    const todos = (Array.isArray(data) ? data : []).map(normalizarUsuarioRegistrado);
    cacheUsuariosRegistrados = todos;
    mapaUsuarios = new Map(todos.map(usuario => [String(usuario.id || '').trim(), usuario]));
  }

  idsPendientes.forEach(idRef => {
    const usuario = mapaUsuarios.get(idRef);
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
  const usuarios = await getUsuariosRegistrados();
  badge.textContent = Array.isArray(usuarios) ? usuarios.length : 0;
}

async function mostrarUsuarios(filtro = '') {
  const tbody = document.getElementById('listaUsuarios');
  if (!tbody) return;

  const empty = document.getElementById('emptyUsuarios');
  const tabla = document.getElementById('tablaUsuarios');

  const data = await getUsuariosRegistrados();
  const todos = (Array.isArray(data) ? data : []).map(normalizarUsuarioRegistrado);
  cacheUsuariosRegistrados = todos;

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

  tbody.innerHTML = '';
  if (!usuarios.length) {
    empty.style.display = 'block';
    tabla.style.display = 'none';
    return;
  }

  empty.style.display = 'none';
  tabla.style.display = '';

  usuarios.forEach(usuario => {
    const idSafe = String(usuario.id || '').replace(/'/g, "\\'");
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${usuario.name || '-'}</td>
      <td>${usuario.id || '-'}</td>
      <td>${usuario.telephone || '-'}</td>
      <td>${usuario.registrationDay || '-'}</td>
      <td>
        <div class="usuarios-puntos-wrap">
          <span class="usuarios-puntos-valor">${usuario.acommulatedPoints}</span>
          <div class="usuarios-puntos-acciones">
            <button class="btn-puntos btn-puntos-mas" data-usuario-id="${idSafe}" onclick="sumarPuntosUsuarioDesdeBoton(this)" ${idSafe ? '' : 'disabled'}>+</button>
            <button class="btn-puntos btn-puntos-menos" data-usuario-id="${idSafe}" onclick="restarPuntosUsuarioDesdeBoton(this)" ${idSafe ? '' : 'disabled'}>-</button>
          </div>
        </div>
      </td>
      <td>
        <button class="btn-ver-recomendados" data-usuario-id="${idSafe}" onclick="verUsuariosRecomendadosDesdeBoton(this)" ${idSafe ? '' : 'disabled'}>
          VER (${(usuario.recommendedUsers || []).length})
        </button>
      </td>
      <td>
        <button class="btn-add-recomendado" data-usuario-id="${idSafe}" onclick="agregarUsuarioRecomendadoDesdeBoton(this)" ${idSafe ? '' : 'disabled'}>
          + Agregar
        </button>
      </td>
      <td>
        <div class="citas-programadas-acciones">
          <button class="btn-edit" data-usuario-id="${idSafe}" onclick="editarUsuarioRegistradoDesdeBoton(this)" ${idSafe ? '' : 'disabled'}>✎ Editar</button>
          <button class="btn-del" data-usuario-id="${idSafe}" onclick="eliminarUsuarioRegistradoDesdeBoton(this)" ${idSafe ? '' : 'disabled'}>✕ Eliminar</button>
        </div>
      </td>`;
    tbody.appendChild(tr);
  });

  actualizarBadgeUsuarios();
}

function filtrarUsuarios() {
  mostrarUsuarios(document.getElementById('buscadorUsuarios').value);
}

function limpiarBuscadorUsuarios() {
  const buscador = document.getElementById('buscadorUsuarios');
  buscador.value = '';
  mostrarUsuarios();
  buscador.focus();
}

async function sumarPuntosUsuarioDesdeBoton(boton) {
  const usuarioId = obtenerIdUsuarioDesdeClick(boton);
  if (!usuarioId) return;
  await actualizarPuntosUsuario(usuarioId, 1);
  mostrarUsuarios(document.getElementById('buscadorUsuarios').value);
}

async function restarPuntosUsuarioDesdeBoton(boton) {
  const usuarioId = obtenerIdUsuarioDesdeClick(boton);
  if (!usuarioId) return;
  await actualizarPuntosUsuario(usuarioId, -1);
  mostrarUsuarios(document.getElementById('buscadorUsuarios').value);
}

async function verUsuariosRecomendadosDesdeBoton(boton) {
  const usuarioId = obtenerIdUsuarioDesdeClick(boton);
  if (!usuarioId) return;

  const usuarioBase = cacheUsuariosRegistrados.find(u => String(u.id) === usuarioId);
  const nombreUsuario = usuarioBase?.name || 'Usuario';
  let recomendados = await obtenerUsuariosRecomendadosUsuario(usuarioId);
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

async function agregarUsuarioRecomendadoDesdeBoton(boton) {
  const usuarioId = obtenerIdUsuarioDesdeClick(boton);
  if (!usuarioId) return;

  const recommendedUserId = prompt('Ingresa la C.C (id) del usuario recomendado:');
  if (recommendedUserId === null) return;
  if (!String(recommendedUserId).trim()) return;

  await agregarUsuarioRecomendadoUsuario(usuarioId, recommendedUserId);
  mostrarUsuarios(document.getElementById('buscadorUsuarios').value);
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
  const inputFecha = document.getElementById('editUsuarioFechaRegistro');
  if (!modal || !inputOriginalId || !inputNombre || !inputCedula || !inputTelefono || !inputFecha) return;

  inputOriginalId.value = String(usuario?.id || '').trim();
  inputNombre.value = String(usuario?.name || '').trim();
  inputCedula.value = String(usuario?.id || '').trim();
  inputTelefono.value = String(usuario?.telephone || '').trim();
  inputFecha.value = formatearRegistrationDayParaInputDate(usuario?.registrationDay);
  modal.classList.add('active');
}

async function guardarEdicionUsuarioRegistrado() {
  const usuarioIdOriginal = String(document.getElementById('editUsuarioOriginalId')?.value || '').trim();
  if (!usuarioIdOriginal) return;

  const name = String(document.getElementById('editUsuarioNombre')?.value || '').trim();
  const idNew = String(document.getElementById('editUsuarioCedula')?.value || '').trim();
  const telephone = String(document.getElementById('editUsuarioTelefono')?.value || '').trim();
  const registrationInput = String(document.getElementById('editUsuarioFechaRegistro')?.value || '').trim();
  if (!name || !idNew || !telephone || !registrationInput) return;

  await editarUsuarioRegistrado(usuarioIdOriginal, {
    name: name.toUpperCase(),
    idNew,
    registrationDay: formatearRegistrationDayComoTexto(registrationInput),
    telephone

  });

  cerrarModalEditarUsuario();
  mostrarUsuarios(document.getElementById('buscadorUsuarios').value);
}

async function editarUsuarioRegistradoDesdeBoton(boton) {
  const usuarioId = obtenerIdUsuarioDesdeClick(boton);
  if (!usuarioId) return;

  const usuarioActual = cacheUsuariosRegistrados.find(u => String(u.id) === usuarioId);
  if (!usuarioActual) return;
  abrirModalEditarUsuario(usuarioActual);
}

async function eliminarUsuarioRegistradoDesdeBoton(boton) {
  const usuarioId = obtenerIdUsuarioDesdeClick(boton);
  if (!usuarioId) return;

  const usuarioActual = cacheUsuariosRegistrados.find(u => String(u.id) === usuarioId);
  const nombreUsuario = String(usuarioActual?.name || 'este usuario').trim();
  usuarioIdPendienteEliminar = usuarioId;

  const texto = document.getElementById('modalEliminarUsuarioTexto');
  const botonConfirmar = document.getElementById('btnConfirmarEliminarUsuario');
  const modal = document.getElementById('modalEliminarUsuario');
  if (!texto || !botonConfirmar || !modal) return;

  texto.textContent = `¿Eliminar a "${nombreUsuario}" (C.C ${usuarioId})? Esta acción no se puede deshacer.`;
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

  await eliminarUsuarioRegistrado(usuarioId);
  mostrarUsuarios(document.getElementById('buscadorUsuarios').value);
}
