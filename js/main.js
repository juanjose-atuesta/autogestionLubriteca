// ═══════════════════════════════════════════════
// AUTOGESTIÓN v3.4 — JS (CORREGIDO
// ═══════════════════════════════════════════════

// ⚠️ GOOGLE SHEETS — NO MODIFICAR
let filtroAgendaActual = 'todos';
let dragCitaId = null;

// ═══════════ INIT ═══════════
document.addEventListener('DOMContentLoaded', () => { verificarSesion(); });





// ═══════════ AUTORIZACIÓN ═══════════
function waMsgAutorizacion(nombre) {
  return encodeURIComponent(`Estimado/a ${nombre},\n\nDe acuerdo con la normativa vigente sobre protección de datos personales, le informamos que la información suministrada será utilizada únicamente para fines comerciales, de contacto, atención al cliente, envío de información, promociones y seguimiento de nuestros servicios.\nSus datos serán tratados de manera confidencial y no serán compartidos con terceros sin su autorización.\n\nSi usted autoriza el uso de sus datos personales y el contacto futuro, por favor responda con: "SÍ" o "1".\nSi usted NO autoriza, responda con: "NO" o "0".`);
}
function enviarAutorizacion() {
  const nombre = document.getElementById('nombre').value.trim();
  const telefono = document.getElementById('telefono').value.trim();
  if (!nombre || !telefono) { alert('Ingresa el nombre y teléfono del cliente primero.'); return; }
  window.open(`https://wa.me/57${telefono}?text=${waMsgAutorizacion(nombre)}`, '_blank');
}

function mostrarToast() { const t = document.getElementById('toastGuardado'); t.style.display = 'block'; setTimeout(() => t.style.display = 'none', 3000); }



// ═══════════════════════════════════════════
// MODAL RESERVAR CITA — FLUJO POR PASOS
// ═══════════════════════════════════════════
let reservarEspacioActual = null;
let reservarHoraActual = null;


// ═══════════ MODAL ELIMINAR ═══════════
let idPendienteEliminar = null;
function abrirModalEliminar(id) {
  id = String(id);
  getClientes()
    .then(clientes => {
      const c = clientes.find(x => x.id === id);
      if (!c) return;
      idPendienteEliminar = id;
      document.getElementById('modalEliminarTexto').textContent = `¿Eliminar a "${c.name}" (${c.plate})? Se moverá a la papelera en Google Sheets.`;
      document.getElementById('modalEliminar').classList.add('active');
    })
    .then(
      () => {
        document.getElementById('btnConfirmarEliminar').onclick = confirmarEliminar.bind(null, idPendienteEliminar);
      }
    )
    .catch(console.error);
}
function cerrarModalEliminar() { document.getElementById('modalEliminar').classList.remove('active'); idPendienteEliminar = null; }
function confirmarEliminar() { if (idPendienteEliminar) { eliminarCliente(idPendienteEliminar); cerrarModalEliminar(); } }

function cerrarModalEditar() { document.getElementById('modalEditar').classList.remove('active'); }
