// ═══════════ TRABAJADORES ═══════════

// ═══════════ TRABAJADORES ═══════════

async function guardarLogin(e) {
  e.preventDefault();
  const username = document.getElementById('loginNuevoUser').value.trim();
  const password = document.getElementById('loginNuevoPass').value;
  const errorEl = document.getElementById('loginAddError');
  const okEl = document.getElementById('loginAddOk');
  errorEl.textContent = '';
  okEl.textContent = '';

  if (!username || !password) {
    errorEl.textContent = 'Completa usuario y contraseña.';
    return;
  }

  try {
    const res = await fetch(API_BACKEND_URL + 'login/addLogin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    if (data.status === true) {
      okEl.textContent = '✅ Acceso creado correctamente.';
      document.getElementById('formAddLogin').reset();
    } else {
      errorEl.textContent = data.message || 'Error al crear el acceso.';
    }
  } catch (e) {
    errorEl.textContent = 'Error de conexión.';
    console.error(e);
  }
}
