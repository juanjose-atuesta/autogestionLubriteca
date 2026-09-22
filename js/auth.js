
// ═══════════ LOGIN ═══════════
function verificarSesion() {
  if (sessionStorage.getItem('ag_sesion') === 'ok') mostrarApp();
}
function intentarLogin(e) {
  e.preventDefault();
  const usuario = document.getElementById('loginUser').value.trim();
  const clave = document.getElementById('loginPass').value;
  const error = document.getElementById('loginError');
  const btn = document.getElementById('loginBtn');
  const txtBtn = document.getElementById('loginBtnText');
  const loader = document.getElementById('loginBtnLoader');

  btn.disabled = true; txtBtn.style.display = 'none'; loader.style.display = 'inline-block';
  error.classList.remove('visible');
  setTimeout(() => {
    try {
      fetch(API_BACKEND_URL + 'login/validateLogin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: usuario, password: clave })
      })
        .then(res => res.json())
        .then(data => {
          console.log(data);
          if (data.status === true) {
            sessionStorage.setItem('ag_sesion', 'ok');
            sessionStorage.setItem('ag_role', data.role); // ← guardas el rol
            sessionStorage.setItem('ag_sesion', 'ok');
            document.getElementById('loginScreen').classList.add('saliendo');
            setTimeout(() => mostrarApp(), 400);
            console.log('Login exitoso');
          } else {

            error.classList.add('visible');
            btn.disabled = false; txtBtn.style.display = 'inline'; loader.style.display = 'none';
            document.getElementById('loginPass').value = '';
            document.getElementById('loginPass').focus();
          }

        })
    } catch (error) { console.error('Error al validar login:', error); }
  }, 600);
}

function mostrarApp() {
  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('appWrapper').style.display = 'block';
  if (Notification.permission !== "granted") Notification.requestPermission();

  //migrarClientesAHistorial();
  actualizarStats();
  mostrarAlertas();
  revisarCitasDeHoy();
  actualizarBadgeContactados();
  actualizarBadgeUsuarios();
  actualizarBadgeAgenda();
  actualizarBadgeCitasProgramadas();

  sincronizarConSheets();
  const role = sessionStorage.getItem('ag_role');
  if (role !== 'admin') {
    document.getElementById('nav-trabajadores')?.style.setProperty('display', 'none');
    document.getElementById('nav-estadisticas')?.style.setProperty('display', 'none');

    document.querySelectorAll('.btn-editar-usuario, .btn-eliminar-usuario').forEach(btn => {
      btn.style.display = 'none';
    });
    // cualquier otro elemento que quieras ocultar
  }
}

function cerrarSesion() {
  sessionStorage.removeItem('ag_sesion');
  document.getElementById('appWrapper').style.display = 'none';
  const ls = document.getElementById('loginScreen');
  ls.style.display = 'flex'; ls.classList.remove('saliendo');
  document.getElementById('loginUser').value = '';
  document.getElementById('loginPass').value = '';
  document.getElementById('loginError').classList.remove('visible');
}
function togglePassword() {
  const i = document.getElementById('loginPass');
  i.type = i.type === 'password' ? 'text' : 'password';
}
