
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
    const valido = USUARIOS.some(u => u.usuario === usuario && u.clave === clave);
    if (valido) {
      sessionStorage.setItem('ag_sesion', 'ok');
      document.getElementById('loginScreen').classList.add('saliendo');
      setTimeout(() => mostrarApp(), 400);
    } else {
      error.classList.add('visible');
      btn.disabled = false; txtBtn.style.display = 'inline'; loader.style.display = 'none';
      document.getElementById('loginPass').value = '';
      document.getElementById('loginPass').focus();
    }
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
  actualizarBadgeAgenda();
  actualizarBadgeCitasProgramadas();

  sincronizarConSheets();
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
